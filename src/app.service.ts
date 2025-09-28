import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    // Contoh: Ambil PORT dari environment
    const port = this.configService.get<number>('PORT');
    return `Backend Protextify! (Running on port ${port})`;
  }
}
