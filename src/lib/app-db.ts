import "server-only";

import crypto from "node:crypto";
import postgres from "postgres";
import type { User as AuthUser } from "@supabase/supabase-js";

export type CurrencyCode = "ARS" | "USD";
export type FamilyRole = "ADMIN" | "MEMBER";
export type ExpenseKind =
  | "ONE_TIME"
  | "RECURRING"
  | "CREDIT_CARD"
  | "MORTGAGE"
  | "LOAN"
  | "INSTALLMENT";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
export type EntryMode = "ACTUAL" | "PROJECTED";
export type RecurrenceFrequency =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY";
export type SavingsDirection = "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";
export type InvitationMethod = "EMAIL" | "PHONE";

type FamilyRow = {
  id: string;
  name: string;
  baseCurrency: CurrencyCode;
  defaultDisplayCurrency: CurrencyCode;
};

type MembershipRow = FamilyRow & {
  role: FamilyRole;
};

type AppContext = {
  family: FamilyRow;
  fullName: string;
  userId: string;
  email: string;
  role: FamilyRole;
};

export type IncomeRow = {
  id: string;
  title: string;
  category: string | null;
  amountOriginal: number;
  amountBaseSnapshot: number;
  currency: CurrencyCode;
  transactionDate: string;
  notes: string | null;
};

export type ExpenseRow = {
  id: string;
  title: string;
  category: string | null;
  amountOriginal: number;
  amountBaseSnapshot: number;
  currency: CurrencyCode;
  dueDate: string;
  paymentStatus: PaymentStatus;
  expenseKind: ExpenseKind;
  entryMode: EntryMode;
  installmentNumber: number | null;
  totalInstallments: number | null;
  notes: string | null;
};

export type SavingsGoalRow = {
  id: string;
  name: string;
  targetAmount: number | null;
  targetCurrency: CurrencyCode;
  totalSavedBase: number;
};

export type SavingsTransactionRow = {
  id: string;
  goalId: string;
  goalName: string;
  direction: SavingsDirection;
  amountOriginal: number;
  amountBaseSnapshot: number;
  currency: CurrencyCode;
  transactionDate: string;
  notes: string | null;
};

export type NoteRow = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
};

export type FamilyMemberRow = {
  id: string;
  fullName: string;
  email: string;
  role: FamilyRole;
  joinedAt: string | null;
};

export type InvitationRow = {
  id: string;
  token: string;
  role: FamilyRole;
  method: InvitationMethod;
  email: string | null;
  phone: string | null;
  message: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedInvitationResult = {
  invitation: InvitationRow;
  family: FamilyRow;
  invitedByName: string;
};

export type CalendarDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  incomes: IncomeRow[];
  expenses: ExpenseRow[];
  incomeTotal: number;
  expenseTotal: number;
};

export type DashboardData = {
  family: FamilyRow;
  fullName: string;
  role: FamilyRole;
  monthLabel: string;
  monthIncomeTotal: number;
  monthIncomeArsOriginal: number;
  monthIncomeUsdOriginal: number;
  monthIncomeCount: number;
  monthExpenseTotal: number;
  monthExpenseCount: number;
  monthSavingsNet: number;
  savingsReservedTotal: number;
  committedFuture: number;
  availableReal: number;
  recentIncomes: IncomeRow[];
  upcomingExpenses: ExpenseRow[];
  lastNote: NoteRow | null;
};

type NumericSummaryRow = {
  total: number;
};

type CurrencySummaryRow = {
  currency: CurrencyCode;
  total: number;
};

type MonthlySummaryRow = {
  total: number;
  count: number;
};

type IncomeInput = {
  title: string;
  amountOriginal: number;
  currency: CurrencyCode;
  transactionDate: string;
  category?: string;
  notes?: string;
  fxRateUsed?: number;
};

type ExpenseInput = {
  title: string;
  amountOriginal: number;
  currency: CurrencyCode;
  dueDate: string;
  category?: string;
  notes?: string;
  fxRateUsed?: number;
  expenseKind: ExpenseKind;
  paymentStatus: PaymentStatus;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceCount?: number;
  totalInstallments?: number;
  currentInstallmentNumber?: number;
};

type InvitationInput = {
  method: InvitationMethod;
  role: FamilyRole;
  email?: string;
  phone?: string;
  message?: string;
};

type InvitationPreview = {
  invitation: InvitationRow;
  family: FamilyRow;
  invitedByName: string;
  currentUserEmail: string | null;
  canAccept: boolean;
  reason: string | null;
};

type SavingsGoalInput = {
  name: string;
  targetAmount?: number;
  targetCurrency: CurrencyCode;
};

type SavingsTransactionInput = {
  goalId: string;
  direction: SavingsDirection;
  amountOriginal: number;
  currency: CurrencyCode;
  transactionDate: string;
  notes?: string;
  fxRateUsed?: number;
};

const bootstrapSql = `
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.families (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  base_currency text not null default 'ARS' check (base_currency in ('ARS', 'USD')),
  default_display_currency text not null default 'ARS' check (default_display_currency in ('ARS', 'USD')),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_members (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'ADMIN' check (role in ('ADMIN', 'MEMBER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'REMOVED')),
  display_currency_preference text not null default 'ARS' check (display_currency_preference in ('ARS', 'USD')),
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, user_id)
);

create table if not exists public.incomes (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  category text,
  amount_original numeric(18, 2) not null check (amount_original > 0),
  currency text not null check (currency in ('ARS', 'USD')),
  transaction_date date not null,
  notes text,
  fx_provider text,
  fx_rate_used numeric(18, 6),
  amount_base_snapshot numeric(18, 2) not null,
  base_currency text not null check (base_currency in ('ARS', 'USD')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.expenses (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  category text,
  expense_kind text not null check (expense_kind in ('ONE_TIME', 'RECURRING', 'CREDIT_CARD', 'MORTGAGE', 'LOAN', 'INSTALLMENT')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'OVERDUE', 'CANCELED')),
  entry_mode text not null default 'ACTUAL' check (entry_mode in ('ACTUAL', 'PROJECTED')),
  amount_original numeric(18, 2) not null check (amount_original > 0),
  currency text not null check (currency in ('ARS', 'USD')),
  due_date date not null,
  paid_at timestamptz,
  notes text,
  fx_provider text,
  fx_rate_used numeric(18, 6),
  amount_base_snapshot numeric(18, 2) not null,
  base_currency text not null check (base_currency in ('ARS', 'USD')),
  series_id uuid,
  recurrence_frequency text,
  installment_number int,
  total_installments int,
  is_generated boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.savings_goals (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  target_amount numeric(18, 2),
  target_currency text not null default 'ARS' check (target_currency in ('ARS', 'USD')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.savings_transactions (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  direction text not null check (direction in ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')),
  amount_original numeric(18, 2) not null check (amount_original > 0),
  currency text not null check (currency in ('ARS', 'USD')),
  transaction_date date not null,
  notes text,
  fx_provider text,
  fx_rate_used numeric(18, 6),
  amount_base_snapshot numeric(18, 2) not null,
  base_currency text not null check (base_currency in ('ARS', 'USD')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete restrict,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.invitations (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  invited_by_user_id uuid not null references public.users(id) on delete restrict,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  method text not null check (method in ('EMAIL', 'PHONE')),
  email text,
  phone text,
  message text,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references public.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists family_members_user_id_idx on public.family_members (user_id);
create index if not exists incomes_family_id_date_idx on public.incomes (family_id, transaction_date desc);
create index if not exists incomes_family_id_created_by_idx on public.incomes (family_id, created_by_user_id);
create index if not exists expenses_family_id_date_idx on public.expenses (family_id, due_date desc);
create index if not exists expenses_family_id_status_idx on public.expenses (family_id, payment_status);
create index if not exists savings_goals_family_id_idx on public.savings_goals (family_id);
create index if not exists savings_transactions_goal_id_idx on public.savings_transactions (goal_id, transaction_date desc);
create index if not exists notes_family_id_created_at_idx on public.notes (family_id, created_at desc);
create index if not exists invitations_family_id_created_at_idx on public.invitations (family_id, created_at desc);
create index if not exists invitations_token_idx on public.invitations (token);
`;

type GlobalDbState = typeof globalThis & {
  __appGastosSql?: postgres.Sql;
  __appGastosSchemaPromise?: Promise<void>;
};

const globalDbState = globalThis as GlobalDbState;

function getDatabaseUrl() {
  const value = process.env["DATABASE_URL"];

  if (!value) {
    throw new Error("Missing environment variable: DATABASE_URL");
  }

  return value;
}

function getAppUrl() {
  const value = process.env["NEXT_PUBLIC_APP_URL"];

  if (!value) {
    return "http://localhost:3000";
  }

  return value.replace(/\/+$/, "");
}

const sql =
  globalDbState.__appGastosSql ??
  postgres(getDatabaseUrl(), {
    prepare: false,
    ssl: "require",
    max: 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalDbState.__appGastosSql = sql;
}

async function ensureAppSchema() {
  if (!globalDbState.__appGastosSchemaPromise) {
    globalDbState.__appGastosSchemaPromise = sql
      .unsafe(bootstrapSql)
      .then(() => undefined)
      .catch((error) => {
        globalDbState.__appGastosSchemaPromise = undefined;
        throw error;
      });
  }

  return globalDbState.__appGastosSchemaPromise;
}

function toDisplayName(authUser: AuthUser) {
  const metadataName =
    typeof authUser.user_metadata?.full_name === "string"
      ? toTitleCase(authUser.user_metadata.full_name)
      : "";

  if (metadataName) {
    return metadataName;
  }

  const localPart = authUser.email?.split("@")[0] ?? "familia";
  return toTitleCase(localPart.replace(/[._-]+/g, " "));
}

function toFamilyName(fullName: string) {
  const firstName = toTitleCase(fullName.trim().split(/\s+/)[0] ?? "Familia");
  return `Familia de ${firstName}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const plusPrefix = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");

  if (!digits) {
    return "";
  }

  return `${plusPrefix}${digits}`;
}

function phoneDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseDateKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = parseDateKey(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateKey(value);
}

function addMonths(date: string, months: number) {
  const value = parseDateKey(date);
  value.setUTCMonth(value.getUTCMonth() + months);
  return formatDateKey(value);
}

function stepByFrequency(
  date: string,
  frequency: RecurrenceFrequency,
  step: number,
) {
  switch (frequency) {
    case "WEEKLY":
      return addDays(date, 7 * step);
    case "BIWEEKLY":
      return addDays(date, 14 * step);
    case "BIMONTHLY":
      return addMonths(date, 2 * step);
    case "QUARTERLY":
      return addMonths(date, 3 * step);
    case "MONTHLY":
    default:
      return addMonths(date, step);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function currentMonthRange() {
  const now = new Date();
  return monthRangeFor(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

function monthRangeFor(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
    startDate: start,
    endDate: end,
  };
}

function parseMonthParam(monthParam?: string) {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    return monthRangeFor(year, month);
  }

  return currentMonthRange();
}

function toBaseAmount(
  amountOriginal: number,
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  fxRateUsed?: number | null,
) {
  if (currency === baseCurrency) {
    return Number(amountOriginal.toFixed(2));
  }

  if (!fxRateUsed || fxRateUsed <= 0) {
    throw new Error(
      `Falta la cotizacion para convertir de ${currency} a ${baseCurrency}.`,
    );
  }

  if (currency === "USD" && baseCurrency === "ARS") {
    return Number((amountOriginal * fxRateUsed).toFixed(2));
  }

  if (currency === "ARS" && baseCurrency === "USD") {
    return Number((amountOriginal / fxRateUsed).toFixed(2));
  }

  return Number(amountOriginal.toFixed(2));
}

export async function getCurrentBlueRate() {
  const response = await fetch("https://dolarapi.com/v1/dolares/blue", {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No pudimos obtener la cotizacion del dolar blue.");
  }

  const data = (await response.json()) as {
    venta?: number | string;
    fechaActualizacion?: string;
  };
  const rate = Number(data.venta);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("La fuente de cotizacion devolvio un valor invalido.");
  }

  return {
    rate: Number(rate.toFixed(6)),
    updatedAt: data.fechaActualizacion ?? null,
    provider: "dolarapi-blue",
  };
}

async function resolveFxSnapshot(
  amountOriginal: number,
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  fxRateUsed?: number | null,
) {
  if (currency === baseCurrency) {
    return {
      amountBaseSnapshot: Number(amountOriginal.toFixed(2)),
      fxProvider: null,
      fxRateUsed: null,
    };
  }

  const resolvedFx =
    fxRateUsed && fxRateUsed > 0 ? Number(fxRateUsed.toFixed(6)) : null;
  const autoFx = resolvedFx ?? (await getCurrentBlueRate()).rate;

  return {
    amountBaseSnapshot: toBaseAmount(
      amountOriginal,
      currency,
      baseCurrency,
      autoFx,
    ),
    fxProvider: "dolarapi-blue",
    fxRateUsed: autoFx,
  };
}

function signedSavingsSqlAlias(alias: string) {
  return `
    coalesce(sum(
      case ${alias}.direction
        when 'DEPOSIT' then ${alias}.amount_base_snapshot
        when 'WITHDRAWAL' then -${alias}.amount_base_snapshot
        else ${alias}.amount_base_snapshot
      end
    ), 0)::float8
  `;
}

async function ensureUserAndFamily(authUser: AuthUser): Promise<AppContext> {
  await ensureAppSchema();

  const { email, fullName } = await ensureAppUser(authUser);

  const membership = await sql<MembershipRow[]>`
    select
      f.id,
      f.name,
      f.base_currency as "baseCurrency",
      f.default_display_currency as "defaultDisplayCurrency",
      fm.role as "role"
    from public.family_members fm
    join public.families f on f.id = fm.family_id
    where fm.user_id = ${authUser.id}::uuid
      and fm.status = 'ACTIVE'
    order by fm.created_at asc
    limit 1
  `;

  if (membership[0]) {
    return {
      family: membership[0],
      fullName,
      userId: authUser.id,
      email,
      role: membership[0].role,
    };
  }

  const familyId = crypto.randomUUID();
  const familyName = toFamilyName(fullName);
  const slug = `${slugify(familyName)}-${familyId.slice(0, 8)}`;

  await sql`
    insert into public.families (
      id,
      name,
      slug,
      base_currency,
      default_display_currency,
      timezone,
      created_by_user_id
    )
    values (
      ${familyId}::uuid,
      ${familyName},
      ${slug},
      'ARS',
      'ARS',
      'America/Argentina/Buenos_Aires',
      ${authUser.id}::uuid
    )
  `;

  await sql`
    insert into public.family_members (
      id,
      family_id,
      user_id,
      role,
      status,
      display_currency_preference,
      joined_at
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${familyId}::uuid,
      ${authUser.id}::uuid,
      'ADMIN',
      'ACTIVE',
      'ARS',
      timezone('utc', now())
    )
  `;

  return {
    family: {
      id: familyId,
      name: familyName,
      baseCurrency: "ARS",
      defaultDisplayCurrency: "ARS",
    },
    fullName,
    userId: authUser.id,
    email,
    role: "ADMIN",
  };
}

async function ensureAdminContext(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);

  if (context.role !== "ADMIN") {
    throw new Error("Solo un administrador puede invitar integrantes.");
  }

  return context;
}

async function ensureAppUser(authUser: AuthUser) {
  await ensureAppSchema();

  const email = authUser.email;

  if (!email) {
    throw new Error("El usuario autenticado no tiene email.");
  }

  const normalizedEmail = normalizeEmail(email);
  const fullName = toDisplayName(authUser);

  await sql`
    insert into public.users (id, email, full_name)
    values (${authUser.id}::uuid, ${normalizedEmail}, ${fullName})
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = excluded.full_name,
      updated_at = timezone('utc', now())
  `;

  return {
    email: normalizedEmail,
    fullName,
  };
}

async function listRecentIncomes(familyId: string, limit = 8) {
  return sql<IncomeRow[]>`
    select
      id,
      title,
      category,
      amount_original::float8 as "amountOriginal",
      amount_base_snapshot::float8 as "amountBaseSnapshot",
      currency,
      transaction_date::text as "transactionDate",
      notes
    from public.incomes
    where family_id = ${familyId}::uuid
      and deleted_at is null
    order by transaction_date desc, created_at desc
    limit ${limit}
  `;
}

async function listRecentExpenses(familyId: string, limit = 12) {
  return sql<ExpenseRow[]>`
    select
      id,
      title,
      category,
      amount_original::float8 as "amountOriginal",
      amount_base_snapshot::float8 as "amountBaseSnapshot",
      currency,
      due_date::text as "dueDate",
      payment_status as "paymentStatus",
      expense_kind as "expenseKind",
      entry_mode as "entryMode",
      installment_number as "installmentNumber",
      total_installments as "totalInstallments",
      notes
    from public.expenses
    where family_id = ${familyId}::uuid
      and deleted_at is null
    order by due_date desc, created_at desc
    limit ${limit}
  `;
}

async function listUpcomingExpenses(familyId: string, limit = 5) {
  return sql<ExpenseRow[]>`
    select
      id,
      title,
      category,
      amount_original::float8 as "amountOriginal",
      amount_base_snapshot::float8 as "amountBaseSnapshot",
      currency,
      due_date::text as "dueDate",
      payment_status as "paymentStatus",
      expense_kind as "expenseKind",
      entry_mode as "entryMode",
      installment_number as "installmentNumber",
      total_installments as "totalInstallments",
      notes
    from public.expenses
    where family_id = ${familyId}::uuid
      and deleted_at is null
      and due_date >= current_date
      and payment_status in ('PENDING', 'OVERDUE')
    order by due_date asc, created_at asc
    limit ${limit}
  `;
}

async function listNotes(familyId: string, limit = 20) {
  return sql<NoteRow[]>`
    select
      n.id,
      n.content,
      n.created_at::text as "createdAt",
      u.full_name as "authorName"
    from public.notes n
    join public.users u on u.id = n.author_user_id
    where n.family_id = ${familyId}::uuid
      and n.deleted_at is null
    order by n.created_at desc
    limit ${limit}
  `;
}

function normalizeNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} debe ser mayor a cero.`);
  }

  return Number(value.toFixed(2));
}

function normalizeInstallmentInput(
  totalInstallments?: number,
  currentInstallmentNumber?: number,
) {
  const total = Math.trunc(totalInstallments ?? 0);
  const current = Math.trunc(currentInstallmentNumber ?? 1);

  if (total < 1) {
    throw new Error("La cantidad total de cuotas debe ser al menos 1.");
  }

  if (current < 1 || current > total) {
    throw new Error("La cuota actual debe estar entre 1 y el total de cuotas.");
  }

  return { total, current };
}

function normalizeRecurrenceCount(recurrenceCount?: number) {
  return clamp(Math.trunc(recurrenceCount ?? 12), 1, 36);
}

function buildExpenseRows(
  context: AppContext,
  input: ExpenseInput,
  amountBaseSnapshot: number,
) {
  const rows: Array<{
    id: string;
    title: string;
    category: string | null;
    amountOriginal: number;
    currency: CurrencyCode;
    dueDate: string;
    paymentStatus: PaymentStatus;
    expenseKind: ExpenseKind;
    entryMode: EntryMode;
    notes: string | null;
    fxRateUsed: number | null;
    amountBaseSnapshot: number;
    baseCurrency: CurrencyCode;
    seriesId: string | null;
    recurrenceFrequency: RecurrenceFrequency | null;
    installmentNumber: number | null;
    totalInstallments: number | null;
    isGenerated: boolean;
  }> = [];

  const normalizedTitle = input.title.trim();
  const category = input.category?.trim() || null;
  const notes = input.notes?.trim() || null;
  const fxRateUsed = input.fxRateUsed ? Number(input.fxRateUsed.toFixed(6)) : null;

  if (input.expenseKind === "RECURRING") {
    const recurrenceFrequency = input.recurrenceFrequency ?? "MONTHLY";
    const recurrenceCount = normalizeRecurrenceCount(input.recurrenceCount);
    const seriesId = crypto.randomUUID();

    for (let step = 0; step < recurrenceCount; step += 1) {
      rows.push({
        id: crypto.randomUUID(),
        title: normalizedTitle,
        category,
        amountOriginal: input.amountOriginal,
        currency: input.currency,
        dueDate: stepByFrequency(input.dueDate, recurrenceFrequency, step),
        paymentStatus: step === 0 ? input.paymentStatus : "PENDING",
        expenseKind: input.expenseKind,
        entryMode: step === 0 ? "ACTUAL" : "PROJECTED",
        notes,
        fxRateUsed,
        amountBaseSnapshot,
        baseCurrency: context.family.baseCurrency,
        seriesId,
        recurrenceFrequency,
        installmentNumber: null,
        totalInstallments: null,
        isGenerated: step > 0,
      });
    }

    return rows;
  }

  if (
    input.expenseKind === "INSTALLMENT" ||
    input.expenseKind === "CREDIT_CARD" ||
    input.expenseKind === "MORTGAGE" ||
    input.expenseKind === "LOAN"
  ) {
    const { total, current } = normalizeInstallmentInput(
      input.totalInstallments,
      input.currentInstallmentNumber,
    );
    const seriesId = crypto.randomUUID();

    for (let installment = current; installment <= total; installment += 1) {
      const step = installment - current;
      rows.push({
        id: crypto.randomUUID(),
        title: normalizedTitle,
        category,
        amountOriginal: input.amountOriginal,
        currency: input.currency,
        dueDate: addMonths(input.dueDate, step),
        paymentStatus: step === 0 ? input.paymentStatus : "PENDING",
        expenseKind: input.expenseKind,
        entryMode: step === 0 ? "ACTUAL" : "PROJECTED",
        notes,
        fxRateUsed,
        amountBaseSnapshot,
        baseCurrency: context.family.baseCurrency,
        seriesId,
        recurrenceFrequency: null,
        installmentNumber: installment,
        totalInstallments: total,
        isGenerated: step > 0,
      });
    }

    return rows;
  }

  rows.push({
    id: crypto.randomUUID(),
    title: normalizedTitle,
    category,
    amountOriginal: input.amountOriginal,
    currency: input.currency,
    dueDate: input.dueDate,
    paymentStatus: input.paymentStatus,
    expenseKind: input.expenseKind,
    entryMode: "ACTUAL",
    notes,
    fxRateUsed,
    amountBaseSnapshot,
    baseCurrency: context.family.baseCurrency,
    seriesId: null,
    recurrenceFrequency: null,
    installmentNumber: null,
    totalInstallments: null,
    isGenerated: false,
  });

  return rows;
}

export async function createIncomeForUser(authUser: AuthUser, input: IncomeInput) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("El ingreso necesita un nombre.");
  }

  const amountOriginal = normalizeNumber(input.amountOriginal, "El monto");
  const fxSnapshot = await resolveFxSnapshot(
    amountOriginal,
    input.currency,
    context.family.baseCurrency,
    input.fxRateUsed ?? null,
  );

  await sql`
    insert into public.incomes (
      id,
      family_id,
      created_by_user_id,
      title,
      category,
      amount_original,
      currency,
      transaction_date,
      notes,
      fx_provider,
      fx_rate_used,
      amount_base_snapshot,
      base_currency
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${context.family.id}::uuid,
      ${context.userId}::uuid,
      ${normalizedTitle},
      ${input.category?.trim() || null},
      ${amountOriginal},
      ${input.currency},
      ${input.transactionDate},
      ${input.notes?.trim() || null},
      ${fxSnapshot.fxProvider},
      ${fxSnapshot.fxRateUsed},
      ${fxSnapshot.amountBaseSnapshot},
      ${context.family.baseCurrency}
    )
  `;
}

export async function deleteIncomeForUser(authUser: AuthUser, incomeId: string) {
  const context = await ensureUserAndFamily(authUser);

  await sql`
    update public.incomes
    set
      deleted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = ${incomeId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
  `;
}

export async function getIncomeByIdForUser(
  authUser: AuthUser,
  incomeId: string,
) {
  const context = await ensureUserAndFamily(authUser);
  const income = await sql<IncomeRow[]>`
    select
      id,
      title,
      category,
      amount_original::float8 as "amountOriginal",
      amount_base_snapshot::float8 as "amountBaseSnapshot",
      currency,
      transaction_date::text as "transactionDate",
      notes
    from public.incomes
    where id = ${incomeId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
    limit 1
  `;

  return {
    family: context.family,
    fullName: context.fullName,
    income: income[0] ?? null,
  };
}

export async function updateIncomeForUser(
  authUser: AuthUser,
  incomeId: string,
  input: IncomeInput,
) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("El ingreso necesita un nombre.");
  }

  const amountOriginal = normalizeNumber(input.amountOriginal, "El monto");
  const fxSnapshot = await resolveFxSnapshot(
    amountOriginal,
    input.currency,
    context.family.baseCurrency,
    input.fxRateUsed ?? null,
  );

  await sql`
    update public.incomes
    set
      title = ${normalizedTitle},
      category = ${input.category?.trim() || null},
      amount_original = ${amountOriginal},
      currency = ${input.currency},
      transaction_date = ${input.transactionDate},
      notes = ${input.notes?.trim() || null},
      fx_provider = ${fxSnapshot.fxProvider},
      fx_rate_used = ${fxSnapshot.fxRateUsed},
      amount_base_snapshot = ${fxSnapshot.amountBaseSnapshot},
      base_currency = ${context.family.baseCurrency},
      updated_at = timezone('utc', now())
    where id = ${incomeId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
  `;
}

export async function createExpenseForUser(authUser: AuthUser, input: ExpenseInput) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("El egreso necesita un nombre.");
  }

  const amountOriginal = normalizeNumber(input.amountOriginal, "El monto");
  const fxSnapshot = await resolveFxSnapshot(
    amountOriginal,
    input.currency,
    context.family.baseCurrency,
    input.fxRateUsed ?? null,
  );
  const rows = buildExpenseRows(context, {
    ...input,
    title: normalizedTitle,
    amountOriginal,
    fxRateUsed: fxSnapshot.fxRateUsed ?? undefined,
  }, fxSnapshot.amountBaseSnapshot);

  for (const row of rows) {
    await sql`
      insert into public.expenses (
        id,
        family_id,
        created_by_user_id,
        title,
        category,
        expense_kind,
        payment_status,
        entry_mode,
        amount_original,
        currency,
        due_date,
        paid_at,
        notes,
        fx_provider,
        fx_rate_used,
        amount_base_snapshot,
        base_currency,
        series_id,
        recurrence_frequency,
        installment_number,
        total_installments,
        is_generated
      )
      values (
        ${row.id}::uuid,
        ${context.family.id}::uuid,
        ${context.userId}::uuid,
        ${row.title},
        ${row.category},
        ${row.expenseKind},
        ${row.paymentStatus},
        ${row.entryMode},
        ${row.amountOriginal},
        ${row.currency},
        ${row.dueDate},
        ${row.paymentStatus === "PAID" ? new Date().toISOString() : null},
        ${row.notes},
        ${fxSnapshot.fxProvider},
        ${row.fxRateUsed},
        ${row.amountBaseSnapshot},
        ${row.baseCurrency},
        ${row.seriesId},
        ${row.recurrenceFrequency},
        ${row.installmentNumber},
        ${row.totalInstallments},
        ${row.isGenerated}
      )
    `;
  }
}

export async function updateExpenseStatusForUser(
  authUser: AuthUser,
  expenseId: string,
  status: PaymentStatus,
) {
  const context = await ensureUserAndFamily(authUser);

  await sql`
    update public.expenses
    set
      payment_status = ${status},
      paid_at = ${status === "PAID" ? new Date().toISOString() : null},
      updated_at = timezone('utc', now())
    where id = ${expenseId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
  `;
}

export async function deleteExpenseForUser(authUser: AuthUser, expenseId: string) {
  const context = await ensureUserAndFamily(authUser);

  await sql`
    update public.expenses
    set
      deleted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = ${expenseId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
  `;
}

export async function getExpenseByIdForUser(
  authUser: AuthUser,
  expenseId: string,
) {
  const context = await ensureUserAndFamily(authUser);
  const expense = await sql<ExpenseRow[]>`
    select
      id,
      title,
      category,
      amount_original::float8 as "amountOriginal",
      amount_base_snapshot::float8 as "amountBaseSnapshot",
      currency,
      due_date::text as "dueDate",
      payment_status as "paymentStatus",
      expense_kind as "expenseKind",
      entry_mode as "entryMode",
      installment_number as "installmentNumber",
      total_installments as "totalInstallments",
      notes
    from public.expenses
    where id = ${expenseId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
    limit 1
  `;

  return {
    family: context.family,
    fullName: context.fullName,
    expense: expense[0] ?? null,
  };
}

export async function updateExpenseForUser(
  authUser: AuthUser,
  expenseId: string,
  input: ExpenseInput,
) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("El egreso necesita un nombre.");
  }

  const amountOriginal = normalizeNumber(input.amountOriginal, "El monto");
  const fxSnapshot = await resolveFxSnapshot(
    amountOriginal,
    input.currency,
    context.family.baseCurrency,
    input.fxRateUsed ?? null,
  );

  const currentExpense = await sql<{ seriesId: string | null }[]>`
    select series_id as "seriesId"
    from public.expenses
    where id = ${expenseId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
    limit 1
  `;

  if (!currentExpense[0]) {
    throw new Error("No encontramos el egreso a editar.");
  }

  await sql`
    update public.expenses
    set
      title = ${normalizedTitle},
      category = ${input.category?.trim() || null},
      expense_kind = ${input.expenseKind},
      payment_status = ${input.paymentStatus},
      amount_original = ${amountOriginal},
      currency = ${input.currency},
      due_date = ${input.dueDate},
      notes = ${input.notes?.trim() || null},
      fx_provider = ${fxSnapshot.fxProvider},
      fx_rate_used = ${fxSnapshot.fxRateUsed},
      amount_base_snapshot = ${fxSnapshot.amountBaseSnapshot},
      base_currency = ${context.family.baseCurrency},
      paid_at = ${input.paymentStatus === "PAID" ? new Date().toISOString() : null},
      updated_at = timezone('utc', now())
    where id = ${expenseId}::uuid
      and family_id = ${context.family.id}::uuid
      and deleted_at is null
  `;
}

export async function createSavingsGoalForUser(
  authUser: AuthUser,
  input: SavingsGoalInput,
) {
  const context = await ensureUserAndFamily(authUser);
  const name = input.name.trim();

  if (!name) {
    throw new Error("El objetivo necesita un nombre.");
  }

  await sql`
    insert into public.savings_goals (
      id,
      family_id,
      created_by_user_id,
      name,
      target_amount,
      target_currency
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${context.family.id}::uuid,
      ${context.userId}::uuid,
      ${name},
      ${input.targetAmount ? Number(input.targetAmount.toFixed(2)) : null},
      ${input.targetCurrency}
    )
  `;
}

export async function createSavingsTransactionForUser(
  authUser: AuthUser,
  input: SavingsTransactionInput,
) {
  const context = await ensureUserAndFamily(authUser);
  const amountOriginal = normalizeNumber(input.amountOriginal, "El monto");
  const fxSnapshot = await resolveFxSnapshot(
    amountOriginal,
    input.currency,
    context.family.baseCurrency,
    input.fxRateUsed ?? null,
  );

  const goal = await sql<{ id: string }[]>`
    select id
    from public.savings_goals
    where id = ${input.goalId}::uuid
      and family_id = ${context.family.id}::uuid
      and active = true
    limit 1
  `;

  if (!goal[0]) {
    throw new Error("El objetivo de ahorro no existe para tu familia.");
  }

  await sql`
    insert into public.savings_transactions (
      id,
      family_id,
      goal_id,
      created_by_user_id,
      direction,
      amount_original,
      currency,
      transaction_date,
      notes,
      fx_provider,
      fx_rate_used,
      amount_base_snapshot,
      base_currency
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${context.family.id}::uuid,
      ${input.goalId}::uuid,
      ${context.userId}::uuid,
      ${input.direction},
      ${amountOriginal},
      ${input.currency},
      ${input.transactionDate},
      ${input.notes?.trim() || null},
      ${fxSnapshot.fxProvider},
      ${fxSnapshot.fxRateUsed},
      ${fxSnapshot.amountBaseSnapshot},
      ${context.family.baseCurrency}
    )
  `;
}

export async function createNoteForUser(authUser: AuthUser, content: string) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error("La nota no puede estar vacia.");
  }

  await sql`
    insert into public.notes (
      id,
      family_id,
      author_user_id,
      content
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${context.family.id}::uuid,
      ${context.userId}::uuid,
      ${normalizedContent}
    )
  `;
}

export function buildInvitationShareLinks(
  invitation: InvitationRow,
  familyName: string,
) {
  const acceptUrl = `${getAppUrl()}/invitacion/${invitation.token}`;
  const message = invitation.message?.trim()
    ? `${invitation.message.trim()}\n\n`
    : "";
  const body =
    `${message}Te invito a sumarte a la cuenta familiar "${familyName}" en AppGastos.\n` +
    `Acepta la invitacion desde este enlace: ${acceptUrl}`;
  const encodedBody = encodeURIComponent(body);
  const emailSubject = encodeURIComponent(
    `Invitacion a la familia ${familyName} en AppGastos`,
  );
  const normalizedPhone = invitation.phone ? phoneDigits(invitation.phone) : "";

  return {
    acceptUrl,
    mailtoHref: invitation.email
      ? `mailto:${invitation.email}?subject=${emailSubject}&body=${encodedBody}`
      : null,
    whatsappHref: normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodedBody}`
      : null,
    smsHref: normalizedPhone ? `sms:${normalizedPhone}?body=${encodedBody}` : null,
  };
}

export async function createInvitationForUser(
  authUser: AuthUser,
  input: InvitationInput,
): Promise<CreatedInvitationResult> {
  const context = await ensureAdminContext(authUser);
  const role = input.role === "ADMIN" ? "ADMIN" : "MEMBER";
  const method = input.method;
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const message = input.message?.trim() || null;

  if (method === "EMAIL") {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Necesitamos un email valido para enviar la invitacion.");
    }

    const existingMember = await sql<{ id: string }[]>`
      select u.id
      from public.family_members fm
      join public.users u on u.id = fm.user_id
      where fm.family_id = ${context.family.id}::uuid
        and fm.status = 'ACTIVE'
        and u.email = ${email}
      limit 1
    `;

    if (existingMember[0]) {
      throw new Error("Ese email ya pertenece a un integrante activo.");
    }
  }

  if (method === "PHONE" && (!phone || phoneDigits(phone).length < 8)) {
    throw new Error("Necesitamos un telefono valido para compartir la invitacion.");
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await sql<InvitationRow[]>`
    insert into public.invitations (
      id,
      family_id,
      invited_by_user_id,
      role,
      method,
      email,
      phone,
      message,
      token,
      expires_at
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${context.family.id}::uuid,
      ${context.userId}::uuid,
      ${role},
      ${method},
      ${email},
      ${phone},
      ${message},
      ${token},
      ${expiresAt.toISOString()}
    )
    returning
      id,
      token,
      role,
      method,
      email,
      phone,
      message,
      expires_at::text as "expiresAt",
      accepted_at::text as "acceptedAt",
      revoked_at::text as "revokedAt",
      created_at::text as "createdAt"
  `;

  return {
    invitation: invitation[0],
    family: context.family,
    invitedByName: context.fullName,
  };
}

export async function updateFamilyNameForUser(authUser: AuthUser, name: string) {
  const context = await ensureAdminContext(authUser);
  const normalizedName = toTitleCase(name);

  if (!normalizedName) {
    throw new Error("La familia necesita un nombre.");
  }

  await sql`
    update public.families
    set
      name = ${normalizedName},
      slug = ${`${slugify(normalizedName)}-${context.family.id.slice(0, 8)}`},
      updated_at = timezone('utc', now())
    where id = ${context.family.id}::uuid
  `;
}

export async function getFamilyPageData(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);

  const [members, invitations, activeInvitations] = await Promise.all([
    sql<FamilyMemberRow[]>`
      select
        u.id,
        u.full_name as "fullName",
        u.email,
        fm.role,
        fm.joined_at::text as "joinedAt"
      from public.family_members fm
      join public.users u on u.id = fm.user_id
      where fm.family_id = ${context.family.id}::uuid
        and fm.status = 'ACTIVE'
      order by fm.joined_at asc nulls last, u.full_name asc
    `,
    sql<InvitationRow[]>`
      select
        id,
        token,
        role,
        method,
        email,
        phone,
        message,
        expires_at::text as "expiresAt",
        accepted_at::text as "acceptedAt",
        revoked_at::text as "revokedAt",
        created_at::text as "createdAt"
      from public.invitations
      where family_id = ${context.family.id}::uuid
        and revoked_at is null
      order by created_at desc
      limit 40
    `,
    sql<{ count: number }[]>`
      select count(*)::int as count
      from public.invitations
      where family_id = ${context.family.id}::uuid
        and accepted_at is null
        and revoked_at is null
        and expires_at >= timezone('utc', now())
    `,
  ]);

  return {
    family: context.family,
    fullName: context.fullName,
    role: context.role,
    members,
    invitations,
    activeInvitationsCount: activeInvitations[0]?.count ?? 0,
    currentTimestampIso: new Date().toISOString(),
  };
}

export async function revokeInvitationForUser(
  authUser: AuthUser,
  invitationId: string,
) {
  const context = await ensureAdminContext(authUser);
  const normalizedInvitationId = invitationId.trim();

  if (!normalizedInvitationId) {
    throw new Error("Necesitamos identificar la invitacion a eliminar.");
  }

  const invitations = await sql<
    (InvitationRow & { familyId: string })[]
  >`
    select
      id,
      token,
      role,
      method,
      email,
      phone,
      message,
      expires_at::text as "expiresAt",
      accepted_at::text as "acceptedAt",
      revoked_at::text as "revokedAt",
      created_at::text as "createdAt",
      family_id as "familyId"
    from public.invitations
    where id = ${normalizedInvitationId}::uuid
    limit 1
  `;

  const row = invitations[0];

  if (!row || row.familyId !== context.family.id) {
    throw new Error("La invitacion no existe en esta familia.");
  }

  if (row.acceptedAt) {
    throw new Error("Esa invitacion ya fue aceptada y no puede eliminarse.");
  }

  if (row.revokedAt) {
    throw new Error("Esa invitacion ya estaba eliminada.");
  }

  await sql`
    update public.invitations
    set
      revoked_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = ${row.id}::uuid
  `;
}

export async function getInvitationPreview(
  token: string,
  authUser: AuthUser | null,
): Promise<InvitationPreview | null> {
  await ensureAppSchema();

  const invitation = await sql<
    (InvitationRow & {
      familyId: string;
      familyName: string;
      baseCurrency: CurrencyCode;
      defaultDisplayCurrency: CurrencyCode;
      invitedByName: string;
    })[]
  >`
    select
      i.id,
      i.token,
      i.role,
      i.method,
      i.email,
      i.phone,
      i.message,
      i.expires_at::text as "expiresAt",
      i.accepted_at::text as "acceptedAt",
      i.revoked_at::text as "revokedAt",
      i.created_at::text as "createdAt",
      i.family_id as "familyId",
      f.name as "familyName",
      f.base_currency as "baseCurrency",
      f.default_display_currency as "defaultDisplayCurrency",
      u.full_name as "invitedByName"
    from public.invitations i
    join public.families f on f.id = i.family_id
    join public.users u on u.id = i.invited_by_user_id
    where i.token = ${token}
    limit 1
  `;

  const row = invitation[0];

  if (!row) {
    return null;
  }

  let canAccept = true;
  let reason: string | null = null;
  let currentUserEmail: string | null = null;

  if (row.revokedAt) {
    canAccept = false;
    reason = "La invitacion fue revocada por el administrador.";
  } else if (row.acceptedAt) {
    canAccept = false;
    reason = "Esta invitacion ya fue utilizada.";
  } else if (new Date(row.expiresAt).getTime() < Date.now()) {
    canAccept = false;
    reason = "La invitacion ya vencio.";
  }

  if (authUser) {
    const ensuredUser = await ensureAppUser(authUser);
    currentUserEmail = ensuredUser.email;

    if (row.method === "EMAIL" && row.email && ensuredUser.email !== row.email) {
      canAccept = false;
      reason = `Esta invitacion fue enviada a ${row.email}. Inicia sesion con ese correo para aceptarla.`;
    }

    const memberships = await sql<{ familyId: string }[]>`
      select family_id as "familyId"
      from public.family_members
      where user_id = ${authUser.id}::uuid
        and status = 'ACTIVE'
    `;

    if (
      memberships[0] &&
      !memberships.some((membership) => membership.familyId === row.familyId)
    ) {
      canAccept = false;
      reason =
        "Tu usuario ya pertenece a otra familia. Por ahora cada cuenta usa una sola familia activa.";
    }
  }

  return {
    invitation: row,
    family: {
      id: row.familyId,
      name: row.familyName,
      baseCurrency: row.baseCurrency,
      defaultDisplayCurrency: row.defaultDisplayCurrency,
    },
    invitedByName: row.invitedByName,
    currentUserEmail,
    canAccept,
    reason,
  };
}

export async function acceptInvitationForUser(authUser: AuthUser, token: string) {
  await ensureAppSchema();
  const { email } = await ensureAppUser(authUser);

  const invitation = await sql<
    (InvitationRow & { familyId: string })[]
  >`
    select
      id,
      token,
      role,
      method,
      email,
      phone,
      message,
      expires_at::text as "expiresAt",
      accepted_at::text as "acceptedAt",
      revoked_at::text as "revokedAt",
      created_at::text as "createdAt",
      family_id as "familyId"
    from public.invitations
    where token = ${token}
    limit 1
  `;

  const row = invitation[0];

  if (!row) {
    throw new Error("La invitacion no existe.");
  }

  if (row.revokedAt) {
    throw new Error("La invitacion fue revocada.");
  }

  if (row.acceptedAt) {
    throw new Error("La invitacion ya fue aceptada.");
  }

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    throw new Error("La invitacion ya vencio.");
  }

  if (row.method === "EMAIL" && row.email && normalizeEmail(row.email) !== email) {
    throw new Error(
      `Esta invitacion fue enviada a ${row.email}. Inicia sesion con ese correo para aceptarla.`,
    );
  }

  const memberships = await sql<{ familyId: string }[]>`
    select family_id as "familyId"
    from public.family_members
    where user_id = ${authUser.id}::uuid
      and status = 'ACTIVE'
  `;

  if (
    memberships[0] &&
    !memberships.some((membership) => membership.familyId === row.familyId)
  ) {
    throw new Error(
      "Tu usuario ya pertenece a otra familia. Por ahora cada cuenta usa una sola familia activa.",
    );
  }

  await sql`
    insert into public.family_members (
      id,
      family_id,
      user_id,
      role,
      status,
      display_currency_preference,
      joined_at
    )
    values (
      ${crypto.randomUUID()}::uuid,
      ${row.familyId}::uuid,
      ${authUser.id}::uuid,
      ${row.role},
      'ACTIVE',
      'ARS',
      timezone('utc', now())
    )
    on conflict (family_id, user_id) do update
    set
      role = excluded.role,
      status = 'ACTIVE',
      joined_at = coalesce(public.family_members.joined_at, excluded.joined_at),
      updated_at = timezone('utc', now())
  `;

  await sql`
    update public.invitations
    set
      accepted_at = timezone('utc', now()),
      accepted_by_user_id = ${authUser.id}::uuid,
      updated_at = timezone('utc', now())
    where id = ${row.id}::uuid
  `;
}

export async function getDashboardData(authUser: AuthUser): Promise<DashboardData> {
  const context = await ensureUserAndFamily(authUser);
  const month = currentMonthRange();

  const [
    monthIncomeSummary,
    monthIncomeByCurrency,
    monthExpenseSummary,
    monthSavingsSummary,
    reservedSavings,
    committedFuture,
    totalIncome,
    actualExpense,
    recentIncomes,
    upcomingExpenses,
    notes,
  ] = await Promise.all([
    sql<MonthlySummaryRow[]>`
      select
        coalesce(sum(amount_base_snapshot), 0)::float8 as total,
        count(*)::int as count
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${month.start}
        and transaction_date < ${month.end}
    `,
    sql<CurrencySummaryRow[]>`
      select
        currency,
        coalesce(sum(amount_original), 0)::float8 as total
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${month.start}
        and transaction_date < ${month.end}
      group by currency
    `,
    sql<MonthlySummaryRow[]>`
      select
        coalesce(sum(amount_base_snapshot), 0)::float8 as total,
        count(*)::int as count
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status != 'CANCELED'
        and due_date >= ${month.start}
        and due_date < ${month.end}
    `,
    sql<NumericSummaryRow[]>`
      select ${sql.unsafe(signedSavingsSqlAlias("st"))} as total
      from public.savings_transactions st
      where st.family_id = ${context.family.id}::uuid
        and st.transaction_date >= ${month.start}
        and st.transaction_date < ${month.end}
    `,
    sql<NumericSummaryRow[]>`
      select ${sql.unsafe(signedSavingsSqlAlias("st"))} as total
      from public.savings_transactions st
      where st.family_id = ${context.family.id}::uuid
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status in ('PENDING', 'OVERDUE')
        and due_date > current_date
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status = 'PAID'
    `,
    listRecentIncomes(context.family.id, 5),
    listUpcomingExpenses(context.family.id, 5),
    listNotes(context.family.id, 1),
  ]);

  const availableReal =
    (totalIncome[0]?.total ?? 0) -
    (actualExpense[0]?.total ?? 0) -
    (reservedSavings[0]?.total ?? 0);
  const monthIncomeArsOriginal =
    monthIncomeByCurrency.find((item) => item.currency === "ARS")?.total ?? 0;
  const monthIncomeUsdOriginal =
    monthIncomeByCurrency.find((item) => item.currency === "USD")?.total ?? 0;

  return {
    family: context.family,
    fullName: context.fullName,
    role: context.role,
    monthLabel: new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
    }).format(month.startDate),
    monthIncomeTotal: monthIncomeSummary[0]?.total ?? 0,
    monthIncomeArsOriginal,
    monthIncomeUsdOriginal,
    monthIncomeCount: monthIncomeSummary[0]?.count ?? 0,
    monthExpenseTotal: monthExpenseSummary[0]?.total ?? 0,
    monthExpenseCount: monthExpenseSummary[0]?.count ?? 0,
    monthSavingsNet: monthSavingsSummary[0]?.total ?? 0,
    savingsReservedTotal: reservedSavings[0]?.total ?? 0,
    committedFuture: committedFuture[0]?.total ?? 0,
    availableReal,
    recentIncomes,
    upcomingExpenses,
    lastNote: notes[0] ?? null,
  };
}

export async function getIncomesPageData(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);
  const month = currentMonthRange();

  const [monthSummary, monthByCurrency, allSummary, incomes] = await Promise.all([
    sql<MonthlySummaryRow[]>`
      select
        coalesce(sum(amount_base_snapshot), 0)::float8 as total,
        count(*)::int as count
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${month.start}
        and transaction_date < ${month.end}
    `,
    sql<CurrencySummaryRow[]>`
      select
        currency,
        coalesce(sum(amount_original), 0)::float8 as total
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${month.start}
        and transaction_date < ${month.end}
      group by currency
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
    `,
    listRecentIncomes(context.family.id, 40),
  ]);

  return {
    family: context.family,
    fullName: context.fullName,
    monthIncomeTotal: monthSummary[0]?.total ?? 0,
    monthIncomeArsOriginal:
      monthByCurrency.find((item) => item.currency === "ARS")?.total ?? 0,
    monthIncomeUsdOriginal:
      monthByCurrency.find((item) => item.currency === "USD")?.total ?? 0,
    monthIncomeCount: monthSummary[0]?.count ?? 0,
    allIncomeTotal: allSummary[0]?.total ?? 0,
    incomes,
  };
}

export async function getExpensesPageData(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);
  const month = currentMonthRange();

  const [monthSummary, futureSummary, overdueSummary, expenses] = await Promise.all([
    sql<MonthlySummaryRow[]>`
      select
        coalesce(sum(amount_base_snapshot), 0)::float8 as total,
        count(*)::int as count
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status != 'CANCELED'
        and due_date >= ${month.start}
        and due_date < ${month.end}
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status in ('PENDING', 'OVERDUE')
        and due_date > current_date
    `,
    sql<MonthlySummaryRow[]>`
      select
        coalesce(sum(amount_base_snapshot), 0)::float8 as total,
        count(*)::int as count
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status in ('PENDING', 'OVERDUE')
        and due_date < current_date
    `,
    listRecentExpenses(context.family.id, 60),
  ]);

  return {
    family: context.family,
    fullName: context.fullName,
    monthExpenseTotal: monthSummary[0]?.total ?? 0,
    monthExpenseCount: monthSummary[0]?.count ?? 0,
    futureCommitted: futureSummary[0]?.total ?? 0,
    overdueCount: overdueSummary[0]?.count ?? 0,
    expenses,
  };
}

export async function getSavingsPageData(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);

  const [goals, transactions, reserved] = await Promise.all([
    sql<SavingsGoalRow[]>`
      select
        g.id,
        g.name,
        g.target_amount::float8 as "targetAmount",
        g.target_currency as "targetCurrency",
        coalesce(sum(
          case st.direction
            when 'DEPOSIT' then st.amount_base_snapshot
            when 'WITHDRAWAL' then -st.amount_base_snapshot
            else st.amount_base_snapshot
          end
        ), 0)::float8 as "totalSavedBase"
      from public.savings_goals g
      left join public.savings_transactions st on st.goal_id = g.id
      where g.family_id = ${context.family.id}::uuid
        and g.active = true
      group by g.id
      order by g.created_at asc
    `,
    sql<SavingsTransactionRow[]>`
      select
        st.id,
        st.goal_id as "goalId",
        g.name as "goalName",
        st.direction,
        st.amount_original::float8 as "amountOriginal",
        st.amount_base_snapshot::float8 as "amountBaseSnapshot",
        st.currency,
        st.transaction_date::text as "transactionDate",
        st.notes
      from public.savings_transactions st
      join public.savings_goals g on g.id = st.goal_id
      where st.family_id = ${context.family.id}::uuid
      order by st.transaction_date desc, st.created_at desc
      limit 40
    `,
    sql<NumericSummaryRow[]>`
      select ${sql.unsafe(signedSavingsSqlAlias("st"))} as total
      from public.savings_transactions st
      where st.family_id = ${context.family.id}::uuid
    `,
  ]);

  return {
    family: context.family,
    fullName: context.fullName,
    goals,
    transactions,
    savingsReservedTotal: reserved[0]?.total ?? 0,
  };
}

export async function getNotesPageData(authUser: AuthUser) {
  const context = await ensureUserAndFamily(authUser);
  const notes = await listNotes(context.family.id, 40);

  return {
    family: context.family,
    fullName: context.fullName,
    notes,
  };
}

export async function getCalendarPageData(authUser: AuthUser, monthParam?: string) {
  const context = await ensureUserAndFamily(authUser);
  const month = parseMonthParam(monthParam);
  const monthStart = month.startDate;
  const monthEnd = new Date(month.endDate);
  monthEnd.setUTCDate(monthEnd.getUTCDate() - 1);

  const startWeekOffset = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - startWeekOffset);

  const gridEnd = new Date(monthEnd);
  const endWeekOffset = 6 - ((gridEnd.getUTCDay() + 6) % 7);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + endWeekOffset);

  const [incomes, expenses, monthIncome, monthExpense] = await Promise.all([
    sql<IncomeRow[]>`
      select
        id,
        title,
        category,
        amount_original::float8 as "amountOriginal",
        amount_base_snapshot::float8 as "amountBaseSnapshot",
        currency,
        transaction_date::text as "transactionDate",
        notes
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${formatDateKey(gridStart)}
        and transaction_date <= ${formatDateKey(gridEnd)}
      order by transaction_date asc, created_at asc
    `,
    sql<ExpenseRow[]>`
      select
        id,
        title,
        category,
        amount_original::float8 as "amountOriginal",
        amount_base_snapshot::float8 as "amountBaseSnapshot",
        currency,
        due_date::text as "dueDate",
        payment_status as "paymentStatus",
        expense_kind as "expenseKind",
        entry_mode as "entryMode",
        installment_number as "installmentNumber",
        total_installments as "totalInstallments",
        notes
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and due_date >= ${formatDateKey(gridStart)}
        and due_date <= ${formatDateKey(gridEnd)}
      order by due_date asc, created_at asc
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.incomes
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and transaction_date >= ${month.start}
        and transaction_date < ${month.end}
    `,
    sql<NumericSummaryRow[]>`
      select coalesce(sum(amount_base_snapshot), 0)::float8 as total
      from public.expenses
      where family_id = ${context.family.id}::uuid
        and deleted_at is null
        and payment_status != 'CANCELED'
        and due_date >= ${month.start}
        and due_date < ${month.end}
    `,
  ]);

  const incomeMap = new Map<string, IncomeRow[]>();
  const expenseMap = new Map<string, ExpenseRow[]>();

  for (const income of incomes) {
    const items = incomeMap.get(income.transactionDate) ?? [];
    items.push(income);
    incomeMap.set(income.transactionDate, items);
  }

  for (const expense of expenses) {
    const items = expenseMap.get(expense.dueDate) ?? [];
    items.push(expense);
    expenseMap.set(expense.dueDate, items);
  }

  const days: CalendarDay[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const date = formatDateKey(cursor);
    const dayIncomes = incomeMap.get(date) ?? [];
    const dayExpenses = expenseMap.get(date) ?? [];

    days.push({
      date,
      dayNumber: cursor.getUTCDate(),
      inCurrentMonth: cursor >= monthStart && cursor < month.endDate,
      incomes: dayIncomes,
      expenses: dayExpenses,
      incomeTotal: dayIncomes.reduce(
        (accumulator, item) => accumulator + item.amountBaseSnapshot,
        0,
      ),
      expenseTotal: dayExpenses.reduce(
        (accumulator, item) => accumulator + item.amountBaseSnapshot,
        0,
      ),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const previousMonth = new Date(monthStart);
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  return {
    family: context.family,
    fullName: context.fullName,
    monthLabel: new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
    }).format(monthStart),
    previousMonthParam: formatDateKey(previousMonth).slice(0, 7),
    nextMonthParam: formatDateKey(nextMonth).slice(0, 7),
    monthIncomeTotal: monthIncome[0]?.total ?? 0,
    monthExpenseTotal: monthExpense[0]?.total ?? 0,
    days,
  };
}

export function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmountNumber(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(parseDateKey(date));
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(date));
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
