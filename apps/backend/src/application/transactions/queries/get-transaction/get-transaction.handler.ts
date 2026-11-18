import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { loadTransactionItem } from '../../shared/transaction-item';
import { GetTransactionQuery } from './get-transaction.query';

@QueryHandler(GetTransactionQuery)
export class GetTransactionHandler implements IQueryHandler<GetTransactionQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  execute({ id }: GetTransactionQuery) {
    return loadTransactionItem(this.dataSource, id);
  }
}
