import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../numeric.transformer';
import { Currency, TransactionStatus, TransactionType } from '../../../domain/enums';
import { Account } from './account.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: TransactionType;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  status: TransactionStatus;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: Currency;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  fromAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromAccountId' })
  fromAccount: Relation<Account> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  toAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toAccountId' })
  toAccount: Relation<Account> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
