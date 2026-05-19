import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(@InjectRepository(Shop) private readonly repo: Repository<Shop>) {}

  async create(dto: CreateShopDto): Promise<Shop> {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.repo.findOne({ where: { slug } });
    if (existing) throw new ConflictException(`A shop with that name already exists.`);
    return this.repo.save(this.repo.create({ ...dto, slug }));
  }

  findAll(): Promise<Shop[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Shop> {
    const shop = await this.repo.findOne({ where: { id } });
    if (!shop) throw new NotFoundException(`Shop ${id} not found.`);
    return shop;
  }

  async update(id: string, dto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findOne(id);
    Object.assign(shop, dto);
    return this.repo.save(shop);
  }

  async remove(id: string): Promise<{ message: string }> {
    const shop = await this.findOne(id);
    shop.isActive = false;
    await this.repo.save(shop);
    return { message: `Shop "${shop.name}" deactivated.` };
  }
}
