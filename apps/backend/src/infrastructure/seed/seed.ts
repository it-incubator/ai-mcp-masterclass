// Seed = infrastructure (not business logic). Used on bootstrap when the DB is empty
// and by POST /api/dev/reset. All timestamps are relative: now - offset.
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { Currency, AccountStatus, KycStatus, RiskLevel, TransactionStatus, TransactionType } from '../../domain/enums';
import { fromCents } from '../../domain/money';
import { Account, Customer, Transaction } from '../persistence/entities';

const SEED = 20240611;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Liam', 'Emma', 'Noah', 'Olivia', 'Lucas', 'Sofia', 'Mateo', 'Isabella', 'Ethan', 'Mia', 'Oliver', 'Chloe',
  'Henry', 'Nora', 'Leo', 'Ivy', 'Jack', 'Zoe', 'Felix', 'Clara', 'Hugo', 'Elena', 'Theo', 'Alice', 'Oscar', 'Lena',
];
const LAST_NAMES = [
  'Miller', 'Schmidt', 'Rossi', 'Dubois', 'Novak', 'Jensen', 'Kowalski', 'Silva', 'Brown', 'Wilson', 'Martin', 'Lopez',
  'Fischer', 'Weber', 'Costa', 'Moreau', 'Nowak', 'Larsen', 'Taylor', 'Clark', 'Walker', 'Young', 'King', 'Hill',
  'Green', 'Baker',
];
const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL', 'SE', 'CA'];
const CURRENCIES = [Currency.USD, Currency.EUR, Currency.GBP];
const ACCOUNT_NAMES = ['Main', 'Savings', 'Travel', 'Business', 'Reserve'];

/** Hand-crafted pending queue (see CONCEPT amendment 4). Index into generic customers 3..9 */
const PENDING_FOR_OTHERS: Array<{ amount: number; customer: number; currency: Currency }> = [
  { amount: 10000, customer: 3, currency: Currency.USD }, // LOW
  { amount: 11000, customer: 4, currency: Currency.EUR }, // LOW
  { amount: 14500, customer: 5, currency: Currency.GBP }, // LOW
  { amount: 18000, customer: 6, currency: Currency.USD }, // LOW
  { amount: 21000, customer: 7, currency: Currency.EUR }, // LOW (>= 20000)
  { amount: 25000, customer: 8, currency: Currency.USD }, // MEDIUM
  { amount: 33000, customer: 9, currency: Currency.GBP }, // MEDIUM
];

export async function truncateAll(manager: EntityManager): Promise<void> {
  await manager.query('TRUNCATE TABLE "transactions", "accounts", "customers" RESTART IDENTITY CASCADE');
}

export async function seedDatabase(manager: EntityManager): Promise<void> {
  const now = Date.now();
  const rnd = mulberry32(SEED);
  const rint = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const ago = (ms: number) => new Date(now - ms);
  const cents = (c: number) => fromCents(c);

  const customers: Customer[] = [];
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];

  const newCustomer = (p: Partial<Customer> & Pick<Customer, 'firstName' | 'lastName' | 'email'>): Customer => {
    const createdAt = ago(rint(100, 150) * DAY);
    const c = Object.assign(new Customer(), {
      id: randomUUID(),
      phone: `+1555${rint(1000000, 9999999)}`,
      country: pick(COUNTRIES),
      kycStatus: KycStatus.VERIFIED,
      riskLevel: RiskLevel.LOW,
      createdAt,
      updatedAt: createdAt,
      ...p,
    });
    customers.push(c);
    return c;
  };

  const newAccount = (
    customer: Customer, currency: Currency, name: string, balance: number, status = AccountStatus.ACTIVE,
  ): Account => {
    const createdAt = ago(rint(91, 120) * DAY);
    const a = Object.assign(new Account(), {
      id: randomUUID(), customerId: customer.id, currency, name, balance, status, createdAt, updatedAt: createdAt,
    });
    accounts.push(a);
    return a;
  };

  const newTx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'status' | 'amount' | 'currency'>, createdAt: Date) => {
    const t = Object.assign(new Transaction(), {
      id: randomUUID(),
      fromAccountId: null,
      toAccountId: null,
      description: null,
      rejectionReason: null,
      createdAt,
      updatedAt: createdAt,
      ...p,
    });
    transactions.push(t);
    return t;
  };

  // ---------- Fixtures ----------
  newCustomer({
    firstName: 'Anna', lastName: 'Smirnova', email: 'anna.smirnova@example.com', country: 'DE',
    kycStatus: KycStatus.PENDING, riskLevel: RiskLevel.LOW,
  });

  const viktor = newCustomer({
    firstName: 'Viktor', lastName: 'Petrov', email: 'viktor.petrov@example.com', country: 'GB',
    kycStatus: KycStatus.VERIFIED, riskLevel: RiskLevel.HIGH,
  });
  const vUsd = newAccount(viktor, Currency.USD, 'Viktor USD Main', 250000);
  const vEur = newAccount(viktor, Currency.EUR, 'Viktor EUR Main', 180000);
  const vGbp = newAccount(viktor, Currency.GBP, 'Viktor GBP Main', 120000);

  const maria = newCustomer({
    firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@example.com', country: 'ES',
    kycStatus: KycStatus.VERIFIED, riskLevel: RiskLevel.LOW,
  });
  const mariaMain = newAccount(maria, Currency.EUR, 'Main EUR', 2500);
  newAccount(maria, Currency.EUR, 'Savings EUR', 0);
  newTx({
    type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, amount: 2500, currency: Currency.EUR,
    toAccountId: mariaMain.id, description: 'Initial funding',
  }, ago(40 * DAY));

  const john = newCustomer({
    firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', country: 'US',
    kycStatus: KycStatus.VERIFIED, riskLevel: RiskLevel.MEDIUM,
  });
  newAccount(john, Currency.USD, 'John USD', 0);

  // ---------- Generic customers (26) ----------
  const generic: Customer[] = [];
  for (let i = 0; i < 26; i++) {
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];
    const forced = i < 10; // 0-2 counterparties, 3-9 pending-queue owners
    let kycStatus = KycStatus.VERIFIED;
    if (!forced) {
      const k = (i - 10) % 8;
      if (k === 6) kycStatus = KycStatus.PENDING;
      if (k === 7) kycStatus = KycStatus.REJECTED;
    }
    let riskLevel = pick([RiskLevel.LOW, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]);
    if (i < 8) riskLevel = RiskLevel.LOW; // counterparties + LOW pending owners (3..7)
    if (i === 8 || i === 9) riskLevel = RiskLevel.MEDIUM;
    generic.push(newCustomer({
      firstName: first, lastName: last, email: `${first}.${last}@example.com`.toLowerCase(), kycStatus, riskLevel,
    }));
  }

  // Counterparties: ACTIVE, rich accounts, LOW risk (never HIGH so scenario D hits Viktor only)
  const counterparty: Record<Currency, Account> = {
    [Currency.USD]: newAccount(generic[0], Currency.USD, 'Main USD', 500000),
    [Currency.EUR]: newAccount(generic[1], Currency.EUR, 'Main EUR', 500000),
    [Currency.GBP]: newAccount(generic[2], Currency.GBP, 'Main GBP', 500000),
  };

  // Owners of the pending queue (source accounts have enough funds)
  const pendingSources = PENDING_FOR_OTHERS.map((p) =>
    newAccount(generic[p.customer], p.currency, `Main ${p.currency}`, 100000),
  );

  // Remaining generic customers: accounts only if KYC verified
  for (let i = 10; i < generic.length; i++) {
    if (generic[i].kycStatus !== KycStatus.VERIFIED) continue;
    const n = rint(2, 4);
    for (let j = 0; j < n; j++) {
      const currency = pick(CURRENCIES);
      const base = ACCOUNT_NAMES[j % ACCOUNT_NAMES.length];
      const roll = rnd();
      let status = AccountStatus.ACTIVE;
      let balance = cents(rint(0, 4_000_000)); // up to 40 000.00
      if (roll < 0.1) status = AccountStatus.FROZEN;
      else if (roll < 0.25) { status = AccountStatus.CLOSED; balance = 0; }
      else if (roll < 0.35) balance = 0;
      newAccount(generic[i], currency, `${base} ${currency}`, balance, status);
    }
  }

  // ---------- Pending queue (12 PENDING transfers) ----------
  const pendingTransfer = (from: Account, amount: number, offsetMs: number) => {
    const to = counterparty[from.currency];
    newTx({
      type: TransactionType.TRANSFER, status: TransactionStatus.PENDING, amount, currency: from.currency,
      fromAccountId: from.id, toAccountId: to.id, description: 'Large transfer awaiting approval',
    }, ago(offsetMs));
  };
  pendingTransfer(vUsd, 12000, 9 * DAY + 3 * HOUR);
  pendingTransfer(vEur, 15500, 7 * DAY + 5 * HOUR);
  pendingTransfer(vGbp, 22000, 5 * DAY + 1 * HOUR);
  pendingTransfer(vUsd, 30000, 4 * DAY + 7 * HOUR);
  pendingTransfer(vEur, 45000, 2 * DAY + 2 * HOUR);
  PENDING_FOR_OTHERS.forEach((p, i) => pendingTransfer(pendingSources[i], p.amount, (12 - i) * DAY - i * HOUR));

  // ---------- Viktor: burst of 8 withdrawals within the last 3 days ----------
  const vAccounts = [vUsd, vEur, vGbp];
  for (let i = 0; i < 8; i++) {
    const acc = vAccounts[i % 3];
    newTx({
      type: TransactionType.WITHDRAWAL, status: TransactionStatus.COMPLETED, amount: cents(rint(50_000, 450_000)),
      currency: acc.currency, fromAccountId: acc.id, description: 'ATM / card withdrawal',
    }, ago(rint(1, 71) * HOUR + rint(0, 59) * 60 * 1000));
  }
  // some older history for Viktor
  for (let i = 0; i < 6; i++) {
    const acc = vAccounts[i % 3];
    newTx({
      type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED, amount: cents(rint(500_000, 2_000_000)),
      currency: acc.currency, toAccountId: acc.id, description: 'Incoming wire',
    }, ago(rint(10, 80) * DAY));
  }

  // ---------- Random history (200 tx) over generic ACTIVE accounts ----------
  const pool = accounts.filter(
    (a) => a.status === AccountStatus.ACTIVE && generic.some((g) => g.id === a.customerId) && !pendingSources.includes(a),
  );
  const byCurrency = (c: Currency, except?: Account) => pool.filter((a) => a.currency === c && a !== except);
  for (let i = 0; i < 200; i++) {
    const offset = i < 60 ? rnd() * 30 * DAY : rnd() * 90 * DAY;
    const createdAt = ago(Math.max(offset, 5 * 60 * 1000));
    const r = rnd();
    const acc = pick(pool);
    let status = TransactionStatus.COMPLETED;
    const s = rnd();
    if (s > 0.92) status = TransactionStatus.REVERSED;
    if (r < 0.35) {
      newTx({
        type: TransactionType.DEPOSIT, status, amount: cents(rint(1_000, 900_000)), currency: acc.currency,
        toAccountId: acc.id, description: pick(['Salary', 'Top up', 'Refund', 'Cash deposit']),
      }, createdAt);
    } else if (r < 0.6) {
      newTx({
        type: TransactionType.WITHDRAWAL, status, amount: cents(rint(1_000, 400_000)), currency: acc.currency,
        fromAccountId: acc.id, description: pick(['Rent', 'Groceries', 'ATM', 'Subscription']),
      }, createdAt);
    } else {
      const others = byCurrency(acc.currency, acc).filter((o) => o.customerId !== acc.customerId);
      if (others.length === 0) continue;
      const to = pick(others);
      if (s > 0.85 && s <= 0.92) {
        newTx({
          type: TransactionType.TRANSFER, status: TransactionStatus.REJECTED, amount: cents(rint(1_000_000, 3_000_000)),
          currency: acc.currency, fromAccountId: acc.id, toAccountId: to.id, description: 'Large transfer',
          rejectionReason: pick(['Suspicious counterparty', 'Insufficient documentation', 'Exceeds customer limit']),
        }, createdAt);
      } else {
        newTx({
          type: TransactionType.TRANSFER, status, amount: cents(rint(1_000, 900_000)), currency: acc.currency,
          fromAccountId: acc.id, toAccountId: to.id, description: pick(['Invoice payment', 'Gift', 'Split bill']),
        }, createdAt);
      }
    }
  }

  await manager.insert(Customer, customers);
  await manager.insert(Account, accounts);
  // insert in chunks (postgres parameter limit)
  for (let i = 0; i < transactions.length; i += 100) {
    await manager.insert(Transaction, transactions.slice(i, i + 100));
  }
}
