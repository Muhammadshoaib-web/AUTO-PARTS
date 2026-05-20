import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Part } from './entities/part.entity';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Part]),
    MulterModule.register({ dest: './uploads/parts' }),
    AuditModule,
  ],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService],
})
export class PartsModule {}
