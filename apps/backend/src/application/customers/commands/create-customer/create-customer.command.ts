import { RiskLevel } from '../../../../domain/enums';

export class CreateCustomerCommand {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly country: string,
    public readonly phone?: string,
    public readonly riskLevel?: RiskLevel,
  ) {}
}
