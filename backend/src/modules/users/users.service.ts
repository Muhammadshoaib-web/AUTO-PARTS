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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use.');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.repo.save(this.repo.create({ ...dto, password: hashed }));
    return this.sanitize(user);
  }

  async findAll(q?: string, page = 1, limit = 50) {
    const qb = this.repo
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.role', 'u.isActive', 'u.createdAt', 'u.updatedAt'])
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) qb.where('(u.name ILIKE :q OR u.email ILIKE :q)', { q: `%${q}%` });

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

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.repo.findOne({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use.');
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async resetPassword(id: string, newPassword: string): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new UnprocessableEntityException('Password must be at least 8 characters.');
    }
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 12);
    await this.repo.save(user);
    return { message: 'Password reset successfully.' };
  }

  async toggleStatus(id: string, requesterId?: string): Promise<User> {
    const user = await this.findOne(id);
    if (requesterId && user.id === requesterId) {
      throw new UnprocessableEntityException('You cannot deactivate your own account.');
    }
    user.isActive = !user.isActive;
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async remove(id: string, requesterId?: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    if (requesterId && user.id === requesterId) {
      throw new UnprocessableEntityException('You cannot delete your own account.');
    }
    user.isActive = false;
    await this.repo.save(user);
    return { message: 'User deactivated.' };
  }

  async saveRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.repo.update(userId, { refreshTokenHash: hash });
  }

  /** Strip sensitive fields before returning */
  private sanitize(user: User): User {
    const { password, refreshTokenHash, ...safe } = user as any;
    return safe as User;
  }
}
