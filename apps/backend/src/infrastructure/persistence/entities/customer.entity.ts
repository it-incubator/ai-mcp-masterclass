import {
  Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn,
} from 'typeorm';
import { KycStatus, RiskLevel } from '../../../domain/enums';
import { Account } from './account.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', length: 20, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ type: 'varchar', length: 20, default: RiskLevel.LOW })
  riskLevel: RiskLevel;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Account, (account) => account.customer)
  accounts: Relation<Account[]>;

  /** Filled by loadRelationCountAndMap in the list endpoint only */
  accountsCount?: number;
}
