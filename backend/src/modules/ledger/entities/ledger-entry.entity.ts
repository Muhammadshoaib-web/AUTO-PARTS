import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerEntryType, LedgerEntityType } from '@autoparts/shared-types';

@Entity('ledger_entries')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LedgerEntityType })
  entityType: LedgerEntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: LedgerEntryType })
  type: LedgerEntryType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** 'sale' | 'purchase' | 'payment' | 'return' | 'adjustment' */
  @Column({ type: 'varchar', length: 50 })
  referenceType: string;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  /** Running balance after this entry */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
