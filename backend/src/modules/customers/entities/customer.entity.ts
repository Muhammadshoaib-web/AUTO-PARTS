import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
@Index(['isActive'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  /** National Tax Number (for FBR B2B invoicing) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  ntn: string | null;

  /** National ID Card Number */
  @Column({ type: 'varchar', length: 20, nullable: true })
  cnic: string | null;

  /** Fixed discount % applied at POS automatically */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountSlab: number;

  /** Max credit allowed before blocking credit sales */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  /** Outstanding receivable balance (positive = customer owes us) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
