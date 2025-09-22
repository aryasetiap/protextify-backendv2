import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const clientID = config.get('GOOGLE_CLIENT_ID');
    const clientSecret = config.get('GOOGLE_CLIENT_SECRET');
    const callbackURL = config.get('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Google OAuth credentials are not properly configured');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName } = profile;
    const email = emails[0].value;

    let user = await this.prisma.user.findUnique({ where: { googleId: id } });
    if (!user) {
      // If user with googleId not found, check by email
      user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            fullName: displayName,
            googleId: id,
            role: 'STUDENT', // Default role, adjust as needed
            emailVerified: true,
          },
        });
      } else {
        // Link googleId to existing user
        await this.prisma.user.update({
          where: { email },
          data: { googleId: id, emailVerified: true },
        });
      }
    }
    done(null, user);
  }
}
