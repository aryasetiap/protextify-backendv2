import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateContentDto {
  @ApiProperty()
  @IsString()
  content: string;
}
