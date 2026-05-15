"use client";

import { useEffect, useMemo, useState } from "react";
import SurgeonCard from "@/components/SurgeonCard";
import { fetchSurgeonsClient } from "@/lib/surgeons";
import { SPECIALTY_OPTIONS, type Surgeon } from "@/lib/types";

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce query input so we don't fire on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSurgeonsClient({
      query: debouncedQuery || undefined,
      specialty: specialty || undefined,
      limit: 200,
    })
      .then((rows) => {
        if (!cancelled) setSurgeons(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, specialty]);

  const count = surgeons.length;
  const hasFilters = useMemo(
    () => Boolean(query || specialty),
    [query, specialty]
  );

  return (
    <div className="pt-2">
      <div className="mb-5 space-y-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, city, or zip"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#222222] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#444444] focus:border-[#333333] transition-colors"
          />
        </div>

        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="w-full bg-[#111111] border border-[#222222] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] focus:border-[#333333] transition-colors appearance-none"
        >
          <option value="">All specialties</option>
          {SPECIALTY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#555555]">
          {loading
            ? "Searching..."
            : `${count} surgeon${count !== 1 ? "s" : ""}${
                count === 200 ? "+" : ""
              }`}
        </p>
        {hasFilters && (
          <button
            onClick={() => {
              setQuery("");
              setSpecialty("");
            }}
            className="text-xs text-[#555555] hover:text-[#f5f5f5] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="text-center py-12">
          <p className="text-[#b04848] text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {!loading && !error && surgeons.length > 0
          ? surgeons.map((s) => <SurgeonCard key={s.npi} surgeon={s} />)
          : null}
        {!loading && !error && surgeons.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#555555] text-sm">No surgeons found</p>
          </div>
        )}
      </div>
    </div>
  );
}
