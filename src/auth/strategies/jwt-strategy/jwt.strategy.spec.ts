import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt-strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {
                return 'test-secret';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user payload', async () => {
      // Payload JWT yang akan di-decode
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'INSTRUCTOR',
      };

      // Panggil metode validate
      const result = await strategy.validate(payload);

      // Verifikasi: Hasilnya sesuai dengan format yang diharapkan
      expect(result).toEqual({
        userId: 'user-id-123',
        email: 'test@example.com',
        role: 'INSTRUCTOR',
      });
    });
  });
});
