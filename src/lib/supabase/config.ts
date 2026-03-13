function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

  if (anonKey) {
    return anonKey;
  }

  if (publishableKey) {
    return publishableKey;
  }

  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}
