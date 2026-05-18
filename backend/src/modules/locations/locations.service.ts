import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(@InjectRepository(Location) private readonly repo: Repository<Location>) {}

  create(dto: CreateLocationDto): Promise<Location> { return this.repo.save(this.repo.create(dto)); }

  findAll(): Promise<Location[]> { return this.repo.find({ where: { isActive: true }, relations: ['children'] }); }

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

  async remove(id: string): Promise<void> {
    const loc = await this.findOne(id);
    loc.isActive = false;
    await this.repo.save(loc);
  }
}
