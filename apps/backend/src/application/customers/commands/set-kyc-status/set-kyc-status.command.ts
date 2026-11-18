import { KycStatus } from '../../../../domain/enums';

export class SetKycStatusCommand {
  constructor(
    public readonly id: string,
    public readonly status: KycStatus.VERIFIED | KycStatus.REJECTED,
  ) {}
}
