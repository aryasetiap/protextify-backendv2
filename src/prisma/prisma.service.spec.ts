import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    // Membuat modul testing NestJS yang hanya menyediakan PrismaService
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Kita perlu me-mock implementasi $connect untuk mencegah koneksi database nyata
    // jest.spyOn memungkinkan kita "mengintip" atau mengganti implementasi sebuah method
    jest.spyOn(service, '$connect').mockImplementation(async () => {
      // Tidak melakukan apa-apa, hanya resolve promise kosong
      return Promise.resolve();
    });
  });

  // Pastikan semua mock dikembalikan ke kondisi semula setelah setiap test
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 1: Memastikan service berhasil dibuat
  it('should be defined', () => {
    // Skenario: Kasus paling dasar, apakah service bisa di-instantiate.
    // Assert: Memastikan instance service tidak null atau undefined.
    expect(service).toBeDefined();
  });

  // Test 2: Memverifikasi lifecycle hook onModuleInit
  describe('onModuleInit', () => {
    it('should call $connect on module initialization', async () => {
      // Skenario: Memastikan bahwa saat NestJS menginisialisasi modul,
      // koneksi ke database (yang sudah di-mock) akan coba dibuat.

      // Act: Panggil method onModuleInit secara manual untuk mensimulasikan lifecycle hook
      await service.onModuleInit();

      // Assert: Verifikasi bahwa method $connect dipanggil tepat satu kali.
      expect(service.$connect).toHaveBeenCalledTimes(1);
    });
  });

  // Test 3: Verifikasi shutdown hooks (jika ada implementasi)
  describe('enableShutdownHooks', () => {
    it('should not throw an error when called', async () => {
      // Skenario: Method enableShutdownHooks saat ini kosong.
      // Test ini hanya memastikan bahwa memanggilnya tidak menyebabkan error.
      // Ini adalah contoh "smoke test".

      // Arrange: Buat mock object 'app' sederhana karena method ini membutuhkannya
      const mockApp = {
        close: jest.fn(),
      } as any;

      // Act & Assert: Harapkan pemanggilan fungsi tidak melempar error apapun.
      await expect(service.enableShutdownHooks(mockApp)).resolves.not.toThrow();
    });
  });
});
