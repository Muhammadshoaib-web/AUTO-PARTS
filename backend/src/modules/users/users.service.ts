import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, shopId?: string | null, requesterId?: string): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use.');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.repo.save(this.repo.create({ ...dto, password: hashed, shopId: shopId ?? null }));
    const result = this.sanitize(user);
    void this.auditService.log({
      userId: requesterId,
      shopId: shopId ?? null,
      action: 'CREATE',
      resourceType: 'user',
      resourceId: result.id,
      newData: { email: result.email, role: result.role, name: result.name },
    });
    return result;
  }

  async findAll(shopId?: string | null, q?: string, page = 1, limit = 50) {
    const qb = this.repo
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.role', 'u.shopId', 'u.branchId', 'u.isActive', 'u.createdAt', 'u.updatedAt'])
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (shopId) qb.andWhere('u.shopId = :shopId', { shopId });
    if (q) qb.andWhere('(u.name ILIKE :q OR u.email ILIKE :q)', { q: `%${q}%` });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto, requesterId?: string): Promise<User> {
    const user = await this.findOne(id);
    const oldData = { email: user.email, role: user.role, name: user.name };

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.repo.findOne({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use.');
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    const result = this.sanitize(saved);
    void this.auditService.log({
      userId: requesterId,
      shopId: user.shopId ?? null,
      action: 'UPDATE',
      resourceType: 'user',
      resourceId: id,
      oldData,
      newData: { email: result.email, role: result.role, name: result.name },
    });
    return result;
  }

  async resetPassword(id: string, newPassword: string, requesterId?: string): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new UnprocessableEntityException('Password must be at least 8 characters.');
    }
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 12);
    await this.repo.save(user);
    void this.auditService.log({
      userId: requesterId,
      shopId: user.shopId ?? null,
      action: 'RESET_PASSWORD',
      resourceType: 'user',
      resourceId: id,
    });
    return { message: 'Password reset successfully.' };
  }

  async toggleStatus(id: string, requesterId?: string): Promise<User> {
    const user = await this.findOne(id);
    if (requesterId && user.id === requesterId) {
      throw new UnprocessableEntityException('You cannot deactivate your own account.');
    }
    const oldStatus = user.isActive;
    user.isActive = !user.isActive;
    const saved = await this.repo.save(user);
    void this.auditService.log({
      userId: requesterId,
      shopId: user.shopId ?? null,
      action: user.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      resourceType: 'user',
      resourceId: id,
      oldData: { isActive: oldStatus },
      newData: { isActive: user.isActive },
    });
    return this.sanitize(saved);
  }

  async remove(id: string, requesterId?: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    if (requesterId && user.id === requesterId) {
      throw new UnprocessableEntityException('You cannot delete your own account.');
    }
    user.isActive = false;
    await this.repo.save(user);
    void this.auditService.log({
      userId: requesterId,
      shopId: user.shopId ?? null,
      action: 'DELETE',
      resourceType: 'user',
      resourceId: id,
      oldData: { email: user.email, role: user.role },
    });
    return { message: 'User deactivated.' };
  }

  async saveRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.repo.update(userId, { refreshTokenHash: hash });
  }

  private sanitize(user: User): User {
    const { password, refreshTokenHash, ...safe } = user as any;
    return safe as User;
  }
}
