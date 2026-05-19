import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleCompatibility } from '@autoparts/shared-types';
import { Category } from '../../categories/entities/category.entity';
import { Stock } from '../../stock/entities/stock.entity';
import { Shop } from '../../shops/entities/shop.entity';

@Entity('parts')
@Index(['shopId', 'partNumber'], { unique: true })
@Index(['shopId', 'barcode'], { unique: true, where: '"barcode" IS NOT NULL AND "shopId" IS NOT NULL' })
@Index(['isActive'])
export class Part {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  shopId: string | null;

  @ManyToOne(() => Shop, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop | null;

  @Column({ type: 'varchar', length: 100 })
  partNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  oemNumber: string | null;

  @Column({ type: 'varchar', length: 200 })
  nameEn: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameUr: string | null;

  @Column({ nullable: true, type: 'uuid' })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 20, default: 'piece' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  buyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ default: 0 })
  minStock: number;

  @Column({ type: 'jsonb', nullable: true })
  compatibilityJson: VehicleCompatibility | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagePath: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Stock, (stock) => stock.part)
  stocks: Stock[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
