export class RejectTransactionCommand {
  constructor(
    public readonly id: string,
    public readonly reason: string,
  ) {}
}
