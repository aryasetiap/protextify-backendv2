import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            generateJwtForUser: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            verifyEmailToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should call register', async () => {
    (authService.register as jest.Mock).mockResolvedValue({
      user: { email: 'test@mail.com' },
    });
    const result = await controller.register({
      email: 'test@mail.com',
      password: '123456',
      fullName: 'Test',
      role: 'STUDENT',
    } as any);
    expect(authService.register).toHaveBeenCalled();
    expect(result.user.email).toBe('test@mail.com');
  });

  it('should call login', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: 'jwt-token',
    });
    const result = await controller.login({
      email: 'test@mail.com',
      password: '123456',
    } as any);
    expect(authService.login).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt-token');
  });

  it('should call sendVerification', async () => {
    (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(
      undefined,
    );
    await controller.sendVerification({ email: 'test@mail.com' } as any);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      'test@mail.com',
    );
  });

  it('should call verifyEmail', async () => {
    (emailService.verifyEmailToken as jest.Mock).mockResolvedValue({
      verified: true,
    });
    const result = await controller.verifyEmail({ token: 'token' } as any);
    expect(emailService.verifyEmailToken).toHaveBeenCalledWith('token');
    expect(result.verified).toBe(true);
  });
});
