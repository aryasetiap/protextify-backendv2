import { RealtimeGateway } from './realtime.gateway';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: jest.Mocked<JwtService>;
  let prisma: jest.Mocked<PrismaService>;
  let mockServer: any;

  beforeEach(() => {
    jwtService = { verify: jest.fn() } as any;
    prisma = {
      submission: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway = new RealtimeGateway(jwtService, prisma);
    gateway.server = mockServer;
  });

  describe('handleConnection', () => {
    it('should disconnect if no token', async () => {
      const client = {
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as any;
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate and join user room', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uid', role: 'STUDENT' });
      const client = {
        handshake: { auth: { token: 'Bearer token' }, headers: {} },
        disconnect: jest.fn(),
        id: 'socket1',
        join: jest.fn(),
      } as any;
      await gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith('user_uid');
      expect(gateway['connectedUsers'].get('socket1')).toEqual({
        userId: 'uid',
        role: 'STUDENT',
      });
    });

    it('should disconnect on error', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('fail');
      });
      const client = {
        handshake: { auth: { token: 'Bearer token' }, headers: {} },
        disconnect: jest.fn(),
      } as any;
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user and submission room', () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      gateway['submissionRooms'].set('sub1', new Set(['socket1']));
      const client = { id: 'socket1' } as any;
      gateway.handleDisconnect(client);
      expect(gateway['connectedUsers'].has('socket1')).toBe(false);
      expect(gateway['submissionRooms'].has('sub1')).toBe(false);
    });
  });

  describe('handleJoinSubmission', () => {
    it('should join submission room if access allowed', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'uid',
        assignment: { class: { instructorId: 'iid' } },
      });
      const client = { id: 'socket1', join: jest.fn() } as any;
      await gateway.handleJoinSubmission(client, { submissionId: 'sub1' });
      expect(client.join).toHaveBeenCalledWith('submission_sub1');
      expect(gateway['submissionRooms'].get('sub1').has('socket1')).toBe(true);
    });

    it('should not join if no access', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'other',
        assignment: { class: { instructorId: 'iid' } },
      });
      const client = { id: 'socket1', join: jest.fn() } as any;
      await gateway.handleJoinSubmission(client, { submissionId: 'sub1' });
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateContent', () => {
    it('should update content and emit events', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      prisma.submission.findUnique.mockResolvedValue({
        studentId: 'uid',
        status: 'SUBMITTED',
      });
      prisma.submission.update.mockResolvedValue({ updatedAt: new Date() });
      const client = {
        id: 'socket1',
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
      } as any;
      await gateway.handleUpdateContent(client, {
        submissionId: 'sub1',
        content: 'abc',
        updatedAt: new Date().toISOString(),
      });
      expect(client.emit).toHaveBeenCalledWith(
        'updateContentResponse',
        expect.objectContaining({ status: 'success' }),
      );
    });

    it('should emit error if update fails', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      prisma.submission.findUnique.mockRejectedValue(new Error('fail'));
      const client = {
        id: 'socket1',
        emit: jest.fn(),
      } as any;
      await gateway.handleUpdateContent(client, {
        submissionId: 'sub1',
        content: 'abc',
        updatedAt: new Date().toISOString(),
      });
      expect(client.emit).toHaveBeenCalledWith(
        'updateContentResponse',
        expect.objectContaining({ status: 'error' }),
      );
    });
  });

  describe('broadcastSubmissionUpdate', () => {
    it('should emit submissionUpdated event', () => {
      gateway.broadcastSubmissionUpdate('sub1', {
        status: 'SUBMITTED',
        updatedAt: new Date().toISOString(),
      });
      expect(mockServer.to).toHaveBeenCalledWith('submission_sub1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'submissionUpdated',
        expect.objectContaining({ submissionId: 'sub1' }),
      );
    });
  });

  describe('sendNotification', () => {
    it('should emit notification event', () => {
      gateway.sendNotification('uid', {
        type: 'notification',
        message: 'msg',
        createdAt: new Date().toISOString(),
      });
      expect(mockServer.to).toHaveBeenCalledWith('user_uid');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({ type: 'notification' }),
      );
    });
  });

  describe('sendSubmissionNotification', () => {
    it('should emit notification to submission room', () => {
      gateway.sendSubmissionNotification('sub1', {
        type: 'notification',
        message: 'msg',
        createdAt: new Date().toISOString(),
      });
      expect(mockServer.to).toHaveBeenCalledWith('submission_sub1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({ type: 'notification' }),
      );
    });
  });

  describe('broadcastSubmissionListUpdated', () => {
    it('should emit submissionListUpdated event', () => {
      gateway.broadcastSubmissionListUpdated('aid', [
        {
          submissionId: 'sub1',
          studentId: 'uid',
          status: 'SUBMITTED',
          lastUpdated: new Date().toISOString(),
        },
      ]);
      expect(mockServer.to).toHaveBeenCalledWith('assignment_aid');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'submissionListUpdated',
        expect.objectContaining({ assignmentId: 'aid' }),
      );
    });
  });

  describe('handleJoinAssignmentMonitoring', () => {
    it('should join assignment monitoring room for instructor', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'iid',
        role: 'INSTRUCTOR',
      });
      const client = { id: 'socket1', join: jest.fn() } as any;
      await gateway.handleJoinAssignmentMonitoring(client, {
        assignmentId: 'aid',
      });
      expect(client.join).toHaveBeenCalledWith('assignment_aid');
    });

    it('should not join if not instructor', async () => {
      gateway['connectedUsers'].set('socket1', {
        userId: 'uid',
        role: 'STUDENT',
      });
      const client = { id: 'socket1', join: jest.fn() } as any;
      await gateway.handleJoinAssignmentMonitoring(client, {
        assignmentId: 'aid',
      });
      expect(client.join).not.toHaveBeenCalled();
    });
  });
});
