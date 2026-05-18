import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditDto {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  log(dto: CreateAuditDto): Promise<AuditLog> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(resourceType?: string): Promise<AuditLog[]> {
    const where = resourceType ? { resourceType } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500, relations: ['user'] });
  }
}
