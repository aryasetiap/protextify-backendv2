import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService) {}

  async sendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not defined');
    const token = jwt.sign({ email }, jwtSecret, { expiresIn: '1d' });
    const templatePath = path.resolve(
      __dirname,
      'templates',
      'verification.html',
    );
    const html = fs
      .readFileSync(templatePath, 'utf8')
      .replace('{{TOKEN}}', token);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: '"Protextify" <no-reply@protextify.com>',
      to: email,
      subject: 'Verifikasi Email Protextify',
      html,
    });
    return { message: 'Verification email sent' };
  }

  async verifyEmailToken(token: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as unknown as {
        email: string;
      };
      await this.prisma.user.update({
        where: { email: payload.email },
        data: { emailVerified: true },
      });
      return { message: 'Email verified' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
