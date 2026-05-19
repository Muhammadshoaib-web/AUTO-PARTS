import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '@autoparts/utils';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto, shopId?: string | null): Promise<Category> {
    const slug = slugify(dto.nameEn);
    const existing = await this.repo.findOne({ where: { slug, ...(shopId ? { shopId } : {}) } });
    if (existing) throw new ConflictException(`Category with slug "${slug}" already exists.`);
    return this.repo.save(this.repo.create({ ...dto, slug, shopId: shopId ?? null }));
  }

  findAll(shopId?: string | null, search?: string): Promise<Category[]> {
    const qb = this.repo
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.parent', 'parent')
      .leftJoinAndSelect('cat.children', 'children')
      .where('cat.isActive = true')
      .orderBy('cat.nameEn', 'ASC');

    if (shopId) qb.andWhere('cat.shopId = :shopId', { shopId });
    if (search) {
      qb.andWhere('(cat."nameEn" ILIKE :q OR cat."nameUr" ILIKE :q)', { q: `%${search}%` });
    }

    return qb.getMany();
  }

  async findOne(id: string, shopId?: string | null): Promise<Category> {
    const cat = await this.repo.findOne({
      where: { id, ...(shopId ? { shopId } : {}) },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException(`Category ${id} not found.`);
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto, shopId?: string | null): Promise<Category> {
    const cat = await this.findOne(id, shopId);
    if (dto.nameEn && dto.nameEn !== cat.nameEn) {
      const newSlug = slugify(dto.nameEn);
      const conflict = await this.repo.findOne({ where: { slug: newSlug, ...(shopId ? { shopId } : {}) } });
      if (conflict && conflict.id !== id)
        throw new ConflictException(`Slug "${newSlug}" is already in use.`);
      cat.slug = newSlug;
    }
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string, shopId?: string | null): Promise<{ message: string }> {
    const cat = await this.findOne(id, shopId);
    cat.isActive = false;
    await this.repo.save(cat);
    return { message: `Category "${cat.nameEn}" deleted.` };
  }
}
