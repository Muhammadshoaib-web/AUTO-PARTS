import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Stock } from '../stock/entities/stock.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { Location } from '../locations/entities/location.entity';
import { StockMovementType } from '@autoparts/shared-types';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';

@Injectable()
export class StockTransfersService {
  constructor(
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
    private readonly dataSource: DataSource,
  ) {}

  async transfer(dto: CreateStockTransferDto, createdById?: string): Promise<StockMovement> {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new UnprocessableEntityException('Source and destination locations must be different.');
    }

    const [fromLoc, toLoc] = await Promise.all([
      this.locationRepo.findOne({ where: { id: dto.fromLocationId } }),
      this.locationRepo.findOne({ where: { id: dto.toLocationId } }),
    ]);
    if (!fromLoc) throw new NotFoundException(`Source location ${dto.fromLocationId} not found.`);
    if (!toLoc) throw new NotFoundException(`Destination location ${dto.toLocationId} not found.`);

    return this.dataSource.transaction(async (manager) => {
      const fromStock = await manager.findOne(Stock, {
        where: { partId: dto.partId, locationId: dto.fromLocationId },
      });
      if (!fromStock || fromStock.quantity < dto.quantity) {
        throw new UnprocessableEntityException(
          `Insufficient stock at source location. Available: ${fromStock?.quantity ?? 0}`,
        );
      }

      fromStock.quantity -= dto.quantity;
      await manager.save(fromStock);

      let toStock = await manager.findOne(Stock, {
        where: { partId: dto.partId, locationId: dto.toLocationId },
      });
      if (!toStock) {
        toStock = manager.create(Stock, { partId: dto.partId, locationId: dto.toLocationId, quantity: 0 });
      }
      toStock.quantity += dto.quantity;
      await manager.save(toStock);

      return manager.save(
        manager.create(StockMovement, {
          partId: dto.partId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          quantity: dto.quantity,
          type: StockMovementType.TRANSFER,
          notes: dto.notes ?? `Transfer: ${fromLoc.name} → ${toLoc.name}`,
          createdById: createdById ?? null,
        }),
      );
    });
  }

  async findAll(page = 1, limit = 20, branchId?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.part', 'part')
      .leftJoinAndSelect('m.fromLocation', 'fromLocation')
      .leftJoinAndSelect('m.toLocation', 'toLocation')
      .leftJoinAndSelect('m.createdBy', 'createdBy')
      .where('m.type = :type', { type: StockMovementType.TRANSFER })
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (branchId) {
      qb.andWhere(
        '(fromLocation.branchId = :branchId OR toLocation.branchId = :branchId)',
        { branchId },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
