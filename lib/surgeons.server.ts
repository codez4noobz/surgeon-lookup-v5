import "server-only";

import { createClient as createServerSupabase } from "./supabase/server";
import {
  PROVIDER_SELECT_DETAIL,
  toSurgeon,
  type ProviderRow,
} from "./surgeons";
import type { Surgeon } from "./types";

// Server-side fetch for a single surgeon by NPI.
export async function fetchSurgeonByNpi(npi: string): Promise<Surgeon | null> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("providers")
    .select(PROVIDER_SELECT_DETAIL)
    .eq("npi", npi)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toSurgeon(data as unknown as ProviderRow);
}
