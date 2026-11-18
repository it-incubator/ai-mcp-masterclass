import { Currency } from '../../../../domain/enums';

export class OpenAccountCommand {
  constructor(
    public readonly customerId: string,
    public readonly currency: Currency,
    public readonly name: string,
  ) {}
}
