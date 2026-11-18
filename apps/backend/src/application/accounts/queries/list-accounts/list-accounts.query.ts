import { AccountStatus, Currency } from '../../../../domain/enums';

export class ListAccountsQuery {
  readonly customerId?: string;
  readonly status?: AccountStatus;
  readonly currency?: Currency;
  readonly page: number;
  readonly limit: number;

  constructor(init: { customerId?: string; status?: AccountStatus; currency?: Currency; page: number; limit: number }) {
    Object.assign(this, init);
  }
}
