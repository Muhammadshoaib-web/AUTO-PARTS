import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementType } from '@autoparts/shared-types';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async getStockForPart(partId: string): Promise<Stock[]> {
    return this.stockRepo.find({ where: { partId }, relations: ['location'] });
  }

  async getTotalStock(partId: string): Promise<number> {
    const result = await this.stockRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.quantity), 0)', 'total')
      .where('s.partId = :partId', { partId })
      .getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }

  /** Add stock to a location. Creates a stock row if none exists. */
  async addStock(
    partId: string,
    locationId: string,
    quantity: number,
    referenceId?: string,
    createdById?: string,
    notes?: string,
  ): Promise<Stock> {
    return this.dataSource.transaction(async (manager) => {
      let stock = await manager.findOne(Stock, { where: { partId, locationId } });
      if (!stock) {
        stock = manager.create(Stock, { partId, locationId, quantity: 0 });
      }
      stock.quantity += quantity;
      await manager.save(stock);

      await manager.save(
        manager.create(StockMovement, {
          partId, toLocationId: locationId, quantity,
          type: StockMovementType.IN, referenceId, createdById, notes,
        }),
      );
      return stock;
    });
  }

  /** Deduct stock from a location. Throws if insufficient. */
  async deductStock(
    partId: string,
    locationId: string,
    quantity: number,
    referenceId?: string,
    createdById?: string,
    notes?: string,
  ): Promise<Stock> {
    return this.dataSource.transaction(async (manager) => {
      const stock = await manager.findOne(Stock, { where: { partId, locationId } });
      if (!stock || stock.quantity < quantity) {
        throw new UnprocessableEntityException('Insufficient stock.');
      }
      stock.quantity -= quantity;
      await manager.save(stock);

      await manager.save(
        manager.create(StockMovement, {
          partId, fromLocationId: locationId, quantity,
          type: StockMovementType.OUT, referenceId, createdById, notes,
        }),
      );
      return stock;
    });
  }

  async getMovements(partId?: string): Promise<StockMovement[]> {
    const where = partId ? { partId } : {};
    return this.movementRepo.find({
      where,
      relations: ['part', 'fromLocation', 'toLocation', 'createdBy'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
