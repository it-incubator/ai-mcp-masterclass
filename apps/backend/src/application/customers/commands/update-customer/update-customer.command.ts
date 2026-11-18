import { RiskLevel } from '../../../../domain/enums';

/** Partial update: undefined fields are left untouched. */
export class UpdateCustomerCommand {
  constructor(
    public readonly id: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly country?: string,
    public readonly riskLevel?: RiskLevel,
  ) {}
}
