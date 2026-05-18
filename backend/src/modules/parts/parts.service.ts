import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { FilterPartsDto } from './dto/filter-parts.dto';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly repo: Repository<Part>,
  ) {}

  async create(dto: CreatePartDto): Promise<Part> {
    const existing = await this.repo.findOne({ where: { partNumber: dto.partNumber } });
    if (existing) throw new ConflictException(`Part number "${dto.partNumber}" already exists.`);
    if (dto.barcode) {
      const barcodeExists = await this.repo.findOne({ where: { barcode: dto.barcode } });
      if (barcodeExists) throw new ConflictException(`Barcode "${dto.barcode}" is already in use.`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(filter: FilterPartsDto) {
    const { page = 1, limit = 20, q, categoryId, isActive } = filter;

    const qb = this.repo
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.category', 'category')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('part.createdAt', 'DESC');

    if (q) {
      qb.andWhere(
        '(part.nameEn ILIKE :q OR part.partNumber ILIKE :q OR part.oemNumber ILIKE :q OR part.barcode ILIKE :q)',
        { q: `%${q}%` },
      );
    }
    if (categoryId) qb.andWhere('part.categoryId = :categoryId', { categoryId });
    if (isActive !== undefined) {
      qb.andWhere('part.isActive = :isActive', { isActive });
    } else {
      qb.andWhere('part.isActive = true');
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Part> {
    const part = await this.repo.findOne({
      where: { id },
      relations: ['category', 'stocks', 'stocks.location'],
    });
    if (!part) throw new NotFoundException(`Part ${id} not found.`);
    return part;
  }

  async findByBarcode(barcode: string): Promise<Part | null> {
    return this.repo.findOne({ where: { barcode } });
  }

  async update(id: string, dto: UpdatePartDto): Promise<Part> {
    const part = await this.findOne(id);
    if (dto.partNumber && dto.partNumber !== part.partNumber) {
      const conflict = await this.repo.findOne({ where: { partNumber: dto.partNumber } });
      if (conflict) throw new ConflictException(`Part number "${dto.partNumber}" already exists.`);
    }
    if (dto.barcode && dto.barcode !== part.barcode) {
      const conflict = await this.repo.findOne({ where: { barcode: dto.barcode } });
      if (conflict) throw new ConflictException(`Barcode "${dto.barcode}" is already in use.`);
    }
    Object.assign(part, dto);
    return this.repo.save(part);
  }

  async updateImage(id: string, imagePath: string): Promise<Part> {
    const part = await this.findOne(id);
    part.imagePath = imagePath;
    return this.repo.save(part);
  }

  async remove(id: string): Promise<{ message: string }> {
    const part = await this.findOne(id);
    part.isActive = false;
    await this.repo.save(part);
    return { message: `Part "${part.nameEn}" deleted.` };
  }

  async findLowStock(): Promise<Part[]> {
    return this.repo
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.stocks', 'stock')
      .leftJoinAndSelect('part.category', 'category')
      .where('part.isActive = true AND part.minStock > 0')
      .groupBy('part.id, category.id, stock.id')
      .having('COALESCE(SUM(stock.quantity), 0) <= part."minStock"')
      .orderBy('part.nameEn', 'ASC')
      .getMany();
  }
}
