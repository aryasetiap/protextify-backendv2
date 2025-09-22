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
    origin: '*',
  },
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
        client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      const user = { userId: payload.sub, role: payload.role };

      this.connectedUsers.set(client.id, user);
      this.logger.log(`User ${user.userId} connected with socket ${client.id}`);

      // Join user to their personal room for notifications
      client.join(`user_${user.userId}`);
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
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
    if (!user) return;

    // Verify user can access this submission
    const submission = await this.prisma.submission.findUnique({
      where: { id: data.submissionId },
      include: { assignment: { include: { class: true } } },
    });

    if (!submission) return;

    const canAccess =
      (user.role === 'STUDENT' && submission.studentId === user.userId) ||
      (user.role === 'INSTRUCTOR' &&
        submission.assignment.class.instructorId === user.userId);

    if (!canAccess) return;

    // Join submission room
    client.join(`submission_${data.submissionId}`);

    if (!this.submissionRooms.has(data.submissionId)) {
      this.submissionRooms.set(data.submissionId, new Set());
    }
    this.submissionRooms.get(data.submissionId)!.add(client.id);

    this.logger.log(
      `User ${user.userId} joined submission ${data.submissionId}`,
    );
  }

  @SubscribeMessage('updateContent')
  async handleUpdateContent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateContentDto,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user || user.role !== 'STUDENT') return;

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
}
