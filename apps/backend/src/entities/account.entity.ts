import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/money';
import { Customer } from './customer.entity';

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.accounts, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer: Relation<Customer>;

  @Column({ type: 'varchar', length: 3 })
  currency: Currency;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: numericTransformer })
  balance: number;

  @Column({ type: 'varchar', length: 20, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
