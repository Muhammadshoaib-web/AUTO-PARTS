import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerEntryType, LedgerEntityType } from '@autoparts/shared-types';

@Injectable()
export class LedgerService {
  constructor(@InjectRepository(LedgerEntry) private readonly repo: Repository<LedgerEntry>) {}

  async getBalance(entityType: LedgerEntityType, entityId: string): Promise<number> {
    const last = await this.repo.findOne({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
    return last?.balanceAfter ?? 0;
  }

  async addEntry(
    entityType: LedgerEntityType,
    entityId: string,
    type: LedgerEntryType,
    amount: number,
    referenceType: string,
    referenceId?: string,
    notes?: string,
  ): Promise<LedgerEntry> {
    const currentBalance = await this.getBalance(entityType, entityId);
    const balanceAfter =
      type === LedgerEntryType.DEBIT ? currentBalance + amount : currentBalance - amount;

    return this.repo.save(
      this.repo.create({ entityType, entityId, type, amount, referenceType, referenceId, balanceAfter, notes }),
    );
  }

  getLedger(entityType: LedgerEntityType, entityId: string): Promise<LedgerEntry[]> {
    return this.repo.find({ where: { entityType, entityId }, order: { createdAt: 'ASC' } });
  }
}
