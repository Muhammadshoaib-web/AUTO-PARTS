import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(@InjectRepository(Location) private readonly repo: Repository<Location>) {}

  create(dto: CreateLocationDto, shopId?: string | null): Promise<Location> {
    return this.repo.save(this.repo.create({ ...dto, shopId: shopId ?? null }));
  }

  findAll(shopId?: string | null, branchId?: string): Promise<Location[]> {
    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.isActive = true')
      .leftJoinAndSelect('l.parent', 'parent')
      .leftJoinAndSelect('l.children', 'children')
      .orderBy('l.name', 'ASC');

    if (shopId) qb.andWhere('l.shopId = :shopId', { shopId });
    if (branchId) qb.andWhere('l.branchId = :branchId', { branchId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Location> {
    const loc = await this.repo.findOne({ where: { id }, relations: ['parent', 'children'] });
    if (!loc) throw new NotFoundException(`Location ${id} not found.`);
    return loc;
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const loc = await this.findOne(id);
    Object.assign(loc, dto);
    return this.repo.save(loc);
  }

  async remove(id: string): Promise<{ message: string }> {
    const loc = await this.findOne(id);
    loc.isActive = false;
    await this.repo.save(loc);
    return { message: `Location "${loc.name}" deleted.` };
  }
}
