import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockMovementType } from '@autoparts/shared-types';
import { Part } from '../../parts/entities/part.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stock_movements')
@Index(['partId'])
@Index(['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'partId' })
  part: Part;

  @Column({ type: 'uuid', nullable: true })
  fromLocationId: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromLocationId' })
  fromLocation: Location | null;

  @Column({ type: 'uuid', nullable: true })
  toLocationId: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toLocationId' })
  toLocation: Location | null;

  @Column()
  quantity: number;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  /** UUID of the linked sale, purchase, or adjustment */
  @Column({ nullable: true, type: 'uuid' })
  referenceId: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ nullable: true, type: 'uuid' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
