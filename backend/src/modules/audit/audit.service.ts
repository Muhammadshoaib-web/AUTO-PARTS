import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditDto {
  userId?: string;
  shopId?: string | null;
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

  async findAll(opts: {
    shopId?: string | null;
    q?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const { shopId, q, userId, action, resourceType, from, to, page = 1, limit = 50 } = opts;

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('a.shopId = :shopId', { shopId });
    if (userId)       qb.andWhere('a.userId = :userId',             { userId });
    if (action)       qb.andWhere('a.action = :action',             { action });
    if (resourceType) qb.andWhere('a.resourceType = :resourceType', { resourceType });
    if (from)         qb.andWhere('a.createdAt >= :from',           { from: new Date(from) });
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('a.createdAt <= :to', { to: toDate });
    }
    if (q) {
      qb.andWhere('(user.name ILIKE :q OR user.email ILIKE :q OR a.action ILIKE :q OR a.resourceType ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDistinctValues(shopId?: string | null) {
    const actionsQb = this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.action', 'action')
      .orderBy('a.action');
    if (shopId) actionsQb.andWhere('a.shopId = :shopId', { shopId });

    const resourceTypesQb = this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.resourceType', 'resourceType')
      .orderBy('a.resourceType');
    if (shopId) resourceTypesQb.andWhere('a.shopId = :shopId', { shopId });

    const [actions, resourceTypes] = await Promise.all([
      actionsQb.getRawMany<{ action: string }>(),
      resourceTypesQb.getRawMany<{ resourceType: string }>(),
    ]);
    return {
      actions: actions.map((r) => r.action),
      resourceTypes: resourceTypes.map((r) => r.resourceType),
    };
  }
}
