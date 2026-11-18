export class TransferCommand {
  constructor(
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amount: number,
    public readonly description?: string,
  ) {}
}
