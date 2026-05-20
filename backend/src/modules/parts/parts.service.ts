import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { FilterPartsDto } from './dto/filter-parts.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly repo: Repository<Part>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreatePartDto, shopId?: string | null, requesterId?: string): Promise<Part> {
    const existing = await this.repo.findOne({ where: { partNumber: dto.partNumber, ...(shopId ? { shopId } : {}) } });
    if (existing) throw new ConflictException(`Part number "${dto.partNumber}" already exists.`);
    if (dto.barcode) {
      const barcodeExists = await this.repo.findOne({ where: { barcode: dto.barcode, ...(shopId ? { shopId } : {}) } });
      if (barcodeExists) throw new ConflictException(`Barcode "${dto.barcode}" is already in use.`);
    }
    const part = await this.repo.save(this.repo.create({ ...dto, shopId: shopId ?? null }));
    void this.auditService.log({
      userId: requesterId,
      shopId: shopId ?? null,
      action: 'CREATE',
      resourceType: 'part',
      resourceId: part.id,
      newData: { partNumber: part.partNumber, nameEn: part.nameEn },
    });
    return part;
  }

  async findAll(filter: FilterPartsDto, shopId?: string | null) {
    const { page = 1, limit = 20, q, categoryId, isActive } = filter;

    const qb = this.repo
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.category', 'category')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('part.createdAt', 'DESC');

    if (shopId) qb.andWhere('part.shopId = :shopId', { shopId });
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

  async findOne(id: string, shopId?: string | null): Promise<Part> {
    const part = await this.repo.findOne({
      where: { id, ...(shopId ? { shopId } : {}) },
      relations: ['category', 'stocks', 'stocks.location'],
    });
    if (!part) throw new NotFoundException(`Part ${id} not found.`);
    return part;
  }

  async findByBarcode(barcode: string, shopId?: string | null): Promise<Part | null> {
    return this.repo.findOne({ where: { barcode, ...(shopId ? { shopId } : {}) } });
  }

  async update(id: string, dto: UpdatePartDto, shopId?: string | null, requesterId?: string): Promise<Part> {
    const part = await this.findOne(id, shopId);
    const oldData = { partNumber: part.partNumber, nameEn: part.nameEn };
    if (dto.partNumber && dto.partNumber !== part.partNumber) {
      const conflict = await this.repo.findOne({ where: { partNumber: dto.partNumber, ...(shopId ? { shopId } : {}) } });
      if (conflict) throw new ConflictException(`Part number "${dto.partNumber}" already exists.`);
    }
    if (dto.barcode && dto.barcode !== part.barcode) {
      const conflict = await this.repo.findOne({ where: { barcode: dto.barcode, ...(shopId ? { shopId } : {}) } });
      if (conflict) throw new ConflictException(`Barcode "${dto.barcode}" is already in use.`);
    }
    Object.assign(part, dto);
    const saved = await this.repo.save(part);
    void this.auditService.log({
      userId: requesterId,
      shopId: shopId ?? null,
      action: 'UPDATE',
      resourceType: 'part',
      resourceId: id,
      oldData,
      newData: { partNumber: saved.partNumber, nameEn: saved.nameEn },
    });
    return saved;
  }

  async updateImage(id: string, imagePath: string, shopId?: string | null): Promise<Part> {
    const part = await this.findOne(id, shopId);
    part.imagePath = imagePath;
    return this.repo.save(part);
  }

  async remove(id: string, shopId?: string | null, requesterId?: string): Promise<{ message: string }> {
    const part = await this.findOne(id, shopId);
    const name = part.nameEn;
    part.isActive = false;
    await this.repo.save(part);
    void this.auditService.log({
      userId: requesterId,
      shopId: shopId ?? null,
      action: 'DELETE',
      resourceType: 'part',
      resourceId: id,
      oldData: { partNumber: part.partNumber, nameEn: name },
    });
    return { message: `Part "${name}" deleted.` };
  }

  async findLowStock(shopId?: string | null): Promise<Part[]> {
    const qb = this.repo
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.stocks', 'stock')
      .leftJoinAndSelect('part.category', 'category')
      .where('part.isActive = true AND part.minStock > 0')
      .groupBy('part.id, category.id, stock.id')
      .having('COALESCE(SUM(stock.quantity), 0) <= part."minStock"')
      .orderBy('part.nameEn', 'ASC');

    if (shopId) qb.andWhere('part.shopId = :shopId', { shopId });

    return qb.getMany();
  }
}
