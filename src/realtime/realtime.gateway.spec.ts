import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Server, Socket } from 'socket.io';
import { WEBSOCKET_EVENTS } from './events';

// Helper untuk membuat mock Socket dan Server dari socket.io
const createMockSocket = (
  token: string | null,
  id: string,
): Partial<Socket> => ({
  id,
  handshake: {
    auth: { token },
    headers: {
      authorization: token,
    },
  },
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(), // Penting: `to` mengembalikan `this` (socket) untuk chaining
  disconnect: jest.fn(),
});

const createMockServer = (): Partial<Server> => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let mockServer: Partial<Server>;

  // Mock data untuk digunakan di berbagai test
  const studentPayload = { sub: 'student-id-1', role: 'STUDENT' };
  const instructorPayload = { sub: 'instructor-id-1', role: 'INSTRUCTOR' };
  const mockSubmission = {
    id: 'submission-1',
    studentId: 'student-id-1',
    status: 'SUBMITTED',
    assignment: {
      class: {
        instructorId: 'instructor-id-1',
      },
    },
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Membuat modul testing dengan mock providers
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            submission: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    mockServer = createMockServer();

    // Inject mock server ke instance gateway
    gateway.server = mockServer as Server;

    // Menggunakan fake timers untuk menguji throttling
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  // Menguji proses koneksi WebSocket
  describe('handleConnection', () => {
    it('should connect and authenticate a user with a valid token', async () => {
      // Skenario: User terhubung dengan token yang valid
      const mockClient = createMockSocket('valid-token', 'socket-1');
      (jwtService.verify as jest.Mock).mockReturnValue(studentPayload);

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockClient.join).toHaveBeenCalledWith(
        `user_${studentPayload.sub}`,
      );
      expect(gateway['connectedUsers'].get('socket-1')).toEqual({
        userId: studentPayload.sub,
        role: studentPayload.role,
      });
    });

    it('should disconnect a user with an invalid token', async () => {
      // Skenario: Token tidak valid atau expired
      const mockClient = createMockSocket('invalid-token', 'socket-1');
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect a user with no token', async () => {
      // Skenario: User mencoba terhubung tanpa token
      const mockClient = createMockSocket(null, 'socket-1');
      await gateway.handleConnection(mockClient as Socket);
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  // Menguji proses diskoneksi
  describe('handleDisconnect', () => {
    it('should clean up user data on disconnect', () => {
      // Skenario: User yang sudah terhubung, kemudian disconnect
      const mockClient = createMockSocket('valid-token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: 'user-1',
        role: 'STUDENT',
      });
      gateway['submissionRooms'].set('submission-1', new Set(['socket-1']));

      gateway.handleDisconnect(mockClient as Socket);

      expect(gateway['connectedUsers'].has('socket-1')).toBe(false);
      // PERBAIKAN: Verifikasi bahwa room itu sendiri telah dihapus,
      // karena pengguna terakhir telah pergi.
      expect(gateway['submissionRooms'].has('submission-1')).toBe(false);
    });
  });

  // Menguji event 'joinSubmission'
  describe('handleJoinSubmission', () => {
    it('should allow a student to join their own submission room', async () => {
      // Skenario: Student bergabung ke room submission miliknya
      const mockClient = createMockSocket('token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: studentPayload.sub,
        role: 'STUDENT',
      });
      (prismaService.submission.findUnique as jest.Mock).mockResolvedValue(
        mockSubmission,
      );

      await gateway.handleJoinSubmission(mockClient as Socket, {
        submissionId: 'submission-1',
      });

      expect(mockClient.join).toHaveBeenCalledWith('submission_submission-1');
      expect(gateway['submissionRooms'].get('submission-1')).toContain(
        'socket-1',
      );
    });

    it('should prevent a user from joining a submission they cannot access', async () => {
      // Skenario: Student mencoba bergabung ke room submission orang lain
      const mockClient = createMockSocket('token', 'socket-2');
      gateway['connectedUsers'].set('socket-2', {
        userId: 'another-student',
        role: 'STUDENT',
      });
      (prismaService.submission.findUnique as jest.Mock).mockResolvedValue(
        mockSubmission,
      );

      await gateway.handleJoinSubmission(mockClient as Socket, {
        submissionId: 'submission-1',
      });

      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  // Menguji event 'updateContent'
  describe('handleUpdateContent', () => {
    const updateDto = {
      submissionId: 'submission-1',
      content: 'new content',
      updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      // Setup user terkoneksi dan prisma mock untuk setiap test di 'describe' ini
      const mockClient = createMockSocket('token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: studentPayload.sub,
        role: 'STUDENT',
      });
      (prismaService.submission.findUnique as jest.Mock).mockResolvedValue(
        mockSubmission,
      );
      (prismaService.submission.update as jest.Mock).mockResolvedValue({
        ...mockSubmission,
        content: 'new content',
      });
    });

    it('should update content and broadcast to the room', async () => {
      // Skenario: Student berhasil update konten
      const mockClient = createMockSocket('token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: studentPayload.sub,
        role: 'STUDENT',
      });

      await gateway.handleUpdateContent(mockClient as Socket, updateDto);

      expect(prismaService.submission.update).toHaveBeenCalledWith({
        where: { id: updateDto.submissionId },
        data: { content: updateDto.content },
      });
      expect(mockClient.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.UPDATE_CONTENT_RESPONSE,
        expect.any(Object),
      );
      expect(mockClient.to).toHaveBeenCalledWith('submission_submission-1');

      // PERBAIKAN: Karena mock `to` mengembalikan client itu sendiri (`mockReturnThis`),
      // maka broadcast `emit` juga dipanggil pada `mockClient`.
      expect(mockClient.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.SUBMISSION_UPDATED,
        expect.any(Object),
      );
    });

    it('should be throttled if updates are too frequent', async () => {
      // Skenario: Student mengirim update terlalu cepat
      const mockClient = createMockSocket('token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: studentPayload.sub,
        role: 'STUDENT',
      });

      // Panggilan pertama
      await gateway.handleUpdateContent(mockClient as Socket, updateDto);
      expect(prismaService.submission.update).toHaveBeenCalledTimes(1);

      // Panggilan kedua (kurang dari 2 detik kemudian)
      jest.advanceTimersByTime(1000);
      await gateway.handleUpdateContent(mockClient as Socket, updateDto);

      // Verifikasi update tidak dipanggil lagi
      expect(prismaService.submission.update).toHaveBeenCalledTimes(1);

      // Panggilan ketiga (setelah 2 detik)
      jest.advanceTimersByTime(2000);
      await gateway.handleUpdateContent(mockClient as Socket, updateDto);
      expect(prismaService.submission.update).toHaveBeenCalledTimes(2);
    });

    it('should emit an error response if database update fails', async () => {
      // Skenario: Terjadi error saat menyimpan ke database
      const mockClient = createMockSocket('token', 'socket-1');
      gateway['connectedUsers'].set('socket-1', {
        userId: studentPayload.sub,
        role: 'STUDENT',
      });
      (prismaService.submission.update as jest.Mock).mockRejectedValue(
        new Error('DB Error'),
      );

      await gateway.handleUpdateContent(mockClient as Socket, updateDto);

      expect(mockClient.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.UPDATE_CONTENT_RESPONSE,
        {
          status: 'error',
          message: 'Failed to update content',
        },
      );
    });
  });

  // Menguji method broadcast
  describe('Public Broadcaster Methods', () => {
    it('sendNotification should emit to a specific user room', () => {
      const notification = {
        type: 'info',
        message: 'test',
        createdAt: new Date().toISOString(),
      };
      gateway.sendNotification('user-1', notification);
      expect(mockServer.to).toHaveBeenCalledWith('user_user-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.NOTIFICATION,
        notification,
      );
    });

    it('broadcastSubmissionUpdate should emit to a specific submission room', () => {
      const updateData = {
        status: 'GRADED',
        updatedAt: new Date().toISOString(),
      };
      gateway.broadcastSubmissionUpdate('submission-1', updateData);
      expect(mockServer.to).toHaveBeenCalledWith('submission_submission-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.SUBMISSION_UPDATED,
        {
          submissionId: 'submission-1',
          ...updateData,
        },
      );
    });
  });
});
