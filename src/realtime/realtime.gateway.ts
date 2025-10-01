import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173', // Vite dev server (primary)
      'http://localhost:3000', // Backend same-origin
      'http://localhost:3001', // Alternative frontend port
      'http://localhost:4173', // Vite preview
      'http://localhost:5174', // Vite dev server backup
      'http://127.0.0.1:5173', // IP variant
      'http://127.0.0.1:3000', // IP variant
    ],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'], // Support both transports
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, { userId: string; role: string }>();
  private submissionRooms = new Map<string, Set<string>>(); // submissionId -> Set of socketIds
  private lastUpdateTime = new Map<string, number>(); // submissionId -> timestamp for throttling

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const cleanToken =
        typeof token === 'string' ? token.replace('Bearer ', '') : token;
      const payload = this.jwtService.verify(cleanToken);
      const user = { userId: payload.sub, role: payload.role };

      this.connectedUsers.set(client.id, user);
      this.logger.log(`User ${user.userId} connected with socket ${client.id}`);

      // Join user to their personal room for notifications
      client.join(`user_${user.userId}`);

      // Send connection confirmation
      client.emit('connected', {
        status: 'success',
        userId: user.userId,
        message: 'WebSocket connection established',
      });
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.logger.log(`User ${user.userId} disconnected`);
      this.connectedUsers.delete(client.id);

      // Remove from submission rooms
      this.submissionRooms.forEach((sockets, submissionId) => {
        if (sockets.has(client.id)) {
          sockets.delete(client.id);
          if (sockets.size === 0) {
            this.submissionRooms.delete(submissionId);
          }
        }
      });
    }
  }

  @SubscribeMessage('joinSubmission')
  async handleJoinSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { submissionId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Verify user can access this submission
      const submission = await this.prisma.submission.findUnique({
        where: { id: data.submissionId },
        include: { assignment: { include: { class: true } } },
      });

      if (!submission) {
        client.emit('error', { message: 'Submission not found' });
        return;
      }

      const canAccess =
        (user.role === 'STUDENT' && submission.studentId === user.userId) ||
        (user.role === 'INSTRUCTOR' &&
          submission.assignment.class.instructorId === user.userId);

      if (!canAccess) {
        client.emit('error', { message: 'Access denied to this submission' });
        return;
      }

      // Join submission room
      client.join(`submission_${data.submissionId}`);

      if (!this.submissionRooms.has(data.submissionId)) {
        this.submissionRooms.set(data.submissionId, new Set());
      }
      this.submissionRooms.get(data.submissionId)!.add(client.id);

      this.logger.log(
        `User ${user.userId} joined submission ${data.submissionId}`,
      );

      client.emit('joinedSubmission', {
        status: 'success',
        submissionId: data.submissionId,
        message: 'Joined submission room',
      });
    } catch (error) {
      this.logger.error('Error joining submission', error);
      client.emit('error', { message: 'Failed to join submission' });
    }
  }

  @SubscribeMessage('updateContent')
  async handleUpdateContent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateContentDto,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user || user.role !== 'STUDENT') {
      client.emit('error', { message: 'Only students can update content' });
      return;
    }

    try {
      // Throttling: Allow updates only every 2 seconds per submission
      const now = Date.now();
      const lastUpdate = this.lastUpdateTime.get(data.submissionId) || 0;
      if (now - lastUpdate < 2000) {
        return; // Skip this update
      }

      // Verify ownership
      const submission = await this.prisma.submission.findUnique({
        where: { id: data.submissionId },
      });

      if (!submission || submission.studentId !== user.userId) {
        client.emit('error', {
          message: 'Submission not found or access denied',
        });
        return;
      }

      // Update content in database
      const updatedSubmission = await this.prisma.submission.update({
        where: { id: data.submissionId },
        data: { content: data.content },
      });

      this.lastUpdateTime.set(data.submissionId, now);

      // Send response to the sender
      client.emit('updateContentResponse', {
        status: 'success',
        updatedAt: updatedSubmission.updatedAt.toISOString(),
      });

      // Broadcast to other users in the submission room (like instructors monitoring)
      client.to(`submission_${data.submissionId}`).emit('submissionUpdated', {
        submissionId: data.submissionId,
        status: submission.status,
        updatedAt: updatedSubmission.updatedAt.toISOString(),
      });

      this.logger.log(`Content updated for submission ${data.submissionId}`);
    } catch (error) {
      this.logger.error('Error updating content', error);
      client.emit('updateContentResponse', {
        status: 'error',
        message: 'Failed to update content',
      });
    }
  }

  // Method to broadcast submission updates (for external use)
  broadcastSubmissionUpdate(
    submissionId: string,
    data: {
      status?: string;
      grade?: number;
      plagiarismScore?: number;
      updatedAt: string;
    },
  ) {
    this.server.to(`submission_${submissionId}`).emit('submissionUpdated', {
      submissionId,
      ...data,
    });
  }

  // Method to send notifications to users (for external use)
  sendNotification(userId: string, notification: NotificationDto) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Method to send notifications to all users in a submission
  sendSubmissionNotification(
    submissionId: string,
    notification: NotificationDto,
  ) {
    this.server
      .to(`submission_${submissionId}`)
      .emit('notification', notification);
  }

  // Method to broadcast submission list updates (for monitoring instructor)
  broadcastSubmissionListUpdated(
    assignmentId: string,
    submissions: Array<{
      submissionId: string;
      studentId: string;
      status: string;
      plagiarismScore?: number;
      lastUpdated: string;
    }>,
  ) {
    this.server.to(`assignment_${assignmentId}`).emit('submissionListUpdated', {
      assignmentId,
      submissions,
    });
  }

  @SubscribeMessage('joinAssignmentMonitoring')
  async handleJoinAssignmentMonitoring(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { assignmentId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user || user.role !== 'INSTRUCTOR') {
      client.emit('error', {
        message: 'Only instructors can monitor assignments',
      });
      return;
    }

    client.join(`assignment_${data.assignmentId}`);
    this.logger.log(
      `Instructor ${user.userId} joined monitoring for assignment ${data.assignmentId}`,
    );

    client.emit('joinedAssignmentMonitoring', {
      status: 'success',
      assignmentId: data.assignmentId,
      message: 'Joined assignment monitoring',
    });
  }
}
