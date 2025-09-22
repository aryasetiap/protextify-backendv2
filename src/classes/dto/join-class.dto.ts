import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class JoinClassDto {
  @ApiProperty()
  @IsString()
  classToken: string;
}
