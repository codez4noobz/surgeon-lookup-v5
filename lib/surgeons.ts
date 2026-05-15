// Client-side data layer. Safe to import in "use client" components.

import { createClient as createBrowserSupabase } from "./supabase/client";
import type { Surgeon } from "./types";

export interface FetchOptions {
  query?: string;
  specialty?: string;
  states?: string[];
  limit?: number;
}

export interface ProviderRow {
  npi: string;
  first_name: string | null;
  last_name: string | null;
  credential: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  address_line1: string | null;
  primary_taxonomy_label: string | null;
  emails?:
    | {
        email: string | null;
        source: string | null;
        affiliations?: unknown;
      }[]
    | null;
  publications?:
    | { top_titles: unknown }
    | { top_titles: unknown }[]
    | null;
  scores?:
    | { tier: string | null; kol_score: number | null }
    | { tier: string | null; kol_score: number | null }[]
    | null;
}

export const PROVIDER_SELECT_LIST =
  "npi,first_name,last_name,credential,city,state,zip,phone,address_line1,primary_taxonomy_label," +
  "emails(email,source)," +
  "scores(tier,kol_score)";

export const PROVIDER_SELECT_DETAIL =
  "npi,first_name,last_name,credential,city,state,zip,phone,address_line1,primary_taxonomy_label," +
  "emails(email,source,affiliations)," +
  "publications(top_titles)," +
  "scores(tier,kol_score)";

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export function toSurgeon(row: ProviderRow): Surgeon {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();

  const emails = row.emails ?? [];
  const own = emails.find((e) => e.source === "own");
  const any = emails[0];
  const email = (own ?? any)?.email ?? null;

  const pub = pickOne(row.publications);
  const titlesRaw = pub?.top_titles;
  const titles = Array.isArray(titlesRaw) ? titlesRaw : [];
  const research = titles
    .map((t: unknown) => {
      if (typeof t === "string") return { title: t, url: null };
      if (t && typeof t === "object") {
        const o = t as { title?: string; url?: string | null };
        return { title: o.title ?? "", url: o.url ?? null };
      }
      return null;
    })
    .filter((x): x is { title: string; url: string | null } => !!x && !!x.title);

  const affRaw = emails
    .flatMap((e) =>
      Array.isArray(e.affiliations) ? (e.affiliations as unknown[]) : []
    )
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  const affiliations = Array.from(new Set(affRaw));

  const score = pickOne(row.scores);

  return {
    id: row.npi,
    npi: row.npi,
    name,
    credentials: row.credential ?? "",
    specialty: row.primary_taxonomy_label ?? "",
    address: row.address_line1 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    phone: row.phone ?? null,
    email,
    affiliations,
    research,
    tier: score?.tier ?? null,
    kolScore: score?.kol_score ?? null,
  };
}

export async function fetchSurgeonsClient(
  opts: FetchOptions = {}
): Promise<Surgeon[]> {
  const sb = createBrowserSupabase();
  let q = sb
    .from("providers")
    .select(PROVIDER_SELECT_LIST)
    .order("last_name", { ascending: true })
    .limit(opts.limit ?? 200);

  if (opts.specialty) q = q.eq("primary_taxonomy_label", opts.specialty);
  if (opts.states?.length) q = q.in("state", opts.states);

  if (opts.query) {
    const t = opts.query.trim().replace(/[,()]/g, " ");
    if (t.length > 0) {
      const like = `%${t}%`;
      q = q.or(
        `last_name.ilike.${like},first_name.ilike.${like},city.ilike.${like},zip.ilike.${t}%`
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as ProviderRow[]).map(toSurgeon);
}
