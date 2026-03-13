import "server-only";

import crypto from "node:crypto";
import postgres from "postgres";
import type { User as AuthUser } from "@supabase/supabase-js";

type CurrencyCode = "ARS" | "USD";

type FamilyRow = {
  id: string;
  name: string;
  baseCurrency: CurrencyCode;
  defaultDisplayCurrency: CurrencyCode;
};

type MonthlyIncomeSummaryRow = {
  total: number;
  count: number;
};

type IncomeRow = {
  id: string;
  title: string;
  category: string | null;
  amountOriginal: number;
  amountBaseSnapshot: number;
  currency: CurrencyCode;
  transactionDate: string;
  notes: string | null;
};

type DashboardData = {
  family: FamilyRow;
  fullName: string;
  monthIncomeTotal: number;
  monthIncomeCount: number;
  recentIncomes: IncomeRow[];
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

const bootstrapSql = `
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

create index if not exists family_members_user_id_idx on public.family_members (user_id);
create index if not exists incomes_family_id_date_idx on public.incomes (family_id, transaction_date desc);
create index if not exists incomes_family_id_created_by_idx on public.incomes (family_id, created_by_user_id);
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
      ? authUser.user_metadata.full_name.trim()
      : "";

  if (metadataName) {
    return metadataName;
  }

  const localPart = authUser.email?.split("@")[0] ?? "familia";
  return localPart.replace(/[._-]+/g, " ");
}

function toFamilyName(fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "Familia";
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

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function ensureUserAndFamily(authUser: AuthUser) {
  await ensureAppSchema();

  const email = authUser.email;

  if (!email) {
    throw new Error("El usuario autenticado no tiene email.");
  }

  const fullName = toDisplayName(authUser);

  await sql`
    insert into public.users (id, email, full_name)
    values (${authUser.id}::uuid, ${email}, ${fullName})
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = excluded.full_name,
      updated_at = timezone('utc', now())
  `;

  const membership = await sql<FamilyRow[]>`
    select
      f.id,
      f.name,
      f.base_currency as "baseCurrency",
      f.default_display_currency as "defaultDisplayCurrency"
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
    };
  }

  const familyId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
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
      ${memberId}::uuid,
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
      baseCurrency: "ARS" as CurrencyCode,
      defaultDisplayCurrency: "ARS" as CurrencyCode,
    },
    fullName,
  };
}

export async function getDashboardData(authUser: AuthUser): Promise<DashboardData> {
  const context = await ensureUserAndFamily(authUser);
  const range = currentMonthRange();

  const monthlyIncomeSummary = await sql<MonthlyIncomeSummaryRow[]>`
    select
      coalesce(sum(amount_base_snapshot), 0)::float8 as total,
      count(*)::int as count
    from public.incomes
    where family_id = ${context.family.id}::uuid
      and deleted_at is null
      and transaction_date >= ${range.start}
      and transaction_date < ${range.end}
  `;

  const recentIncomes = await sql<IncomeRow[]>`
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
    order by transaction_date desc, created_at desc
    limit 8
  `;

  return {
    family: context.family,
    fullName: context.fullName,
    monthIncomeTotal: monthlyIncomeSummary[0]?.total ?? 0,
    monthIncomeCount: monthlyIncomeSummary[0]?.count ?? 0,
    recentIncomes,
  };
}

export async function createIncomeForUser(
  authUser: AuthUser,
  input: IncomeInput,
) {
  const context = await ensureUserAndFamily(authUser);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("El ingreso necesita un nombre.");
  }

  if (!Number.isFinite(input.amountOriginal) || input.amountOriginal <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const category = input.category?.trim() || null;
  const notes = input.notes?.trim() || null;
  const amountOriginal = Number(input.amountOriginal.toFixed(2));
  const fxRateUsed = input.fxRateUsed ? Number(input.fxRateUsed.toFixed(6)) : null;

  let amountBaseSnapshot = amountOriginal;

  if (input.currency !== context.family.baseCurrency) {
    if (!fxRateUsed || fxRateUsed <= 0) {
      throw new Error(
        "Si cargas un ingreso en USD, completa la cotizacion para convertirlo a ARS.",
      );
    }

    amountBaseSnapshot = Number((amountOriginal * fxRateUsed).toFixed(2));
  }

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
      ${authUser.id}::uuid,
      ${normalizedTitle},
      ${category},
      ${amountOriginal},
      ${input.currency},
      ${input.transactionDate},
      ${notes},
      ${fxRateUsed ? "manual" : null},
      ${fxRateUsed},
      ${amountBaseSnapshot},
      ${context.family.baseCurrency}
    )
  `;
}

export function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}
