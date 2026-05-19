import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';
import { Part } from '../../parts/entities/part.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity('stock')
@Index(['partId', 'locationId'], { unique: true })
@Index(['partId'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  shopId: string | null;

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop | null;

  @Column({ type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part, (part) => part.stocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partId' })
  part: Part;

  @Column({ type: 'uuid' })
  locationId: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reservedQty: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastUpdated: Date;
}
