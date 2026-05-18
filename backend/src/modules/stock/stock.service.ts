import {
  Injectable, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementType } from '@autoparts/shared-types';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async getAllStockLevels(q?: string): Promise<Stock[]> {
    const qb = this.stockRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.part', 'part')
      .leftJoinAndSelect('part.category', 'category')
      .leftJoinAndSelect('s.location', 'location')
      .orderBy('part.nameEn', 'ASC')
      .addOrderBy('location.name', 'ASC');

    if (q) {
      qb.andWhere(
        '(part.nameEn ILIKE :q OR part.partNumber ILIKE :q OR location.name ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    return qb.getMany();
  }

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

  async receiveStock(dto: ReceiveStockDto, createdById?: string): Promise<Stock> {
    return this.addStock(dto.partId, dto.locationId, dto.quantity, undefined, createdById, dto.notes);
  }

  async adjustStock(dto: AdjustStockDto, createdById?: string): Promise<Stock> {
    return this.dataSource.transaction(async (manager) => {
      let stock = await manager.findOne(Stock, { where: { partId: dto.partId, locationId: dto.locationId } });
      if (!stock) {
        stock = manager.create(Stock, { partId: dto.partId, locationId: dto.locationId, quantity: 0 });
      }

      const newQty = stock.quantity + dto.quantity;
      if (newQty < 0) {
        throw new UnprocessableEntityException(
          `Adjustment would result in negative stock (current: ${stock.quantity}, adjustment: ${dto.quantity}).`,
        );
      }

      stock.quantity = newQty;
      await manager.save(stock);

      await manager.save(
        manager.create(StockMovement, {
          partId: dto.partId,
          toLocationId: dto.quantity > 0 ? dto.locationId : null,
          fromLocationId: dto.quantity < 0 ? dto.locationId : null,
          quantity: Math.abs(dto.quantity),
          type: StockMovementType.ADJUSTMENT,
          createdById,
          notes: dto.notes,
        }),
      );

      return stock;
    });
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

  async getMovements(partId?: string, page = 1, limit = 50) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.part', 'part')
      .leftJoinAndSelect('m.fromLocation', 'fromLocation')
      .leftJoinAndSelect('m.toLocation', 'toLocation')
      .leftJoinAndSelect('m.createdBy', 'createdBy')
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (partId) qb.where('m.partId = :partId', { partId });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
