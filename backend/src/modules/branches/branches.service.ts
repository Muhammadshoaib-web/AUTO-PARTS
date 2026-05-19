import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private readonly repo: Repository<Branch>) {}

  async create(dto: CreateBranchDto, shopId?: string | null): Promise<Branch> {
    const existing = await this.repo.findOne({ where: { name: dto.name, ...(shopId ? { shopId } : {}) } });
    if (existing) throw new ConflictException(`Branch "${dto.name}" already exists.`);
    return this.repo.save(this.repo.create({ ...dto, shopId: shopId ?? null }));
  }

  findAll(shopId?: string | null): Promise<Branch[]> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.isActive = true')
      .orderBy('b.name', 'ASC');
    if (shopId) qb.andWhere('b.shopId = :shopId', { shopId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Branch> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException(`Branch ${id} not found.`);
    return b;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const b = await this.findOne(id);
    Object.assign(b, dto);
    return this.repo.save(b);
  }

  async remove(id: string): Promise<{ message: string }> {
    const b = await this.findOne(id);
    b.isActive = false;
    await this.repo.save(b);
    return { message: `Branch "${b.name}" deactivated.` };
  }
}
