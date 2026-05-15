#!/usr/bin/env node
/**
 * Reads data/surgeons.db (SQLite) and inserts every row into Supabase.
 * Run after schema.sql has been applied. Assumes empty tables.
 *
 * Usage:
 *   npm run seed
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dbPath = path.join(projectRoot, "data", "surgeons.db");
const db = new Database(dbPath, { readonly: true });

const BATCH = 500;

function parseJSON(s) {
  if (s == null) return null;
  if (typeof s !== "string") return s;
  if (s === "") return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function insertBatched(table, rows, mapper) {
  const total = rows.length;
  console.log(`\n${table}: ${total.toLocaleString()} rows`);
  for (let i = 0; i < total; i += BATCH) {
    const slice = rows.slice(i, i + BATCH).map(mapper);
    const { error } = await sb.from(table).insert(slice);
    if (error) {
      console.error(`\n  ERROR at row ${i}:`, error.message);
      console.error("  Sample row:", JSON.stringify(slice[0]).slice(0, 300));
      process.exit(1);
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, total).toLocaleString()} / ${total.toLocaleString()}`);
  }
  process.stdout.write(" done\n");
}

async function main() {
  const t0 = Date.now();
  console.log("Reading SQLite at", dbPath);

  // Providers
  const providers = db
    .prepare(
      `SELECT npi, last_name, first_name, middle_name, credential, sex,
              city, state, zip, phone, address_line1,
              enumeration_date, primary_taxonomy, primary_taxonomy_label
       FROM providers`
    )
    .all();
  await insertBatched("providers", providers, (r) => r);

  // Publications
  const publications = db
    .prepare(
      `SELECT npi, pubmed_total, bari_foregut_count, top_titles, last_searched
       FROM publications`
    )
    .all();
  await insertBatched("publications", publications, (r) => ({
    npi: r.npi,
    pubmed_total: r.pubmed_total ?? 0,
    bari_foregut_count: r.bari_foregut_count ?? 0,
    top_titles: parseJSON(r.top_titles),
    last_searched: r.last_searched ?? null,
  }));

  // Payments
  const payments = db
    .prepare(
      `SELECT npi, op_total_usd, op_record_count,
              op_top_mfrs, op_top_products, op_top_natures, last_searched
       FROM payments`
    )
    .all();
  await insertBatched("payments", payments, (r) => ({
    npi: r.npi,
    op_total_usd: r.op_total_usd ?? 0,
    op_record_count: r.op_record_count ?? 0,
    op_top_mfrs: parseJSON(r.op_top_mfrs),
    op_top_products: parseJSON(r.op_top_products),
    op_top_natures: parseJSON(r.op_top_natures),
    last_searched: r.last_searched ?? null,
  }));

  // Scores
  const scores = db
    .prepare(`SELECT npi, kol_score, tier, last_computed FROM scores`)
    .all();
  await insertBatched("scores", scores, (r) => ({
    npi: r.npi,
    kol_score: r.kol_score ?? 0,
    tier: r.tier ?? null,
    last_computed: r.last_computed ?? null,
  }));

  // Emails (strip SQLite id; let Postgres bigserial assign)
  const emails = db
    .prepare(
      `SELECT npi, email, source, affiliations, last_searched FROM emails`
    )
    .all();
  await insertBatched("emails", emails, (r) => ({
    npi: r.npi,
    email: r.email ?? null,
    source: r.source ?? null,
    affiliations: parseJSON(r.affiliations),
    last_searched: r.last_searched ?? null,
  }));

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nSeed complete in ${secs}s`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
