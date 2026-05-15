"use client";

import { useState } from "react";
import { US_STATES } from "@/lib/mock-data";

export default function TerritoryPage() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [zipInput, setZipInput] = useState("");
  const [saved, setSaved] = useState(false);

  function toggleState(state: string) {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
    setSaved(false);
  }

  function handleSave() {
    // TODO: persist to Supabase user profile
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const zips = zipInput
    .split(",")
    .map((z) => z.trim())
    .filter((z) => z.length > 0);

  return (
    <div className="pt-2">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#f5f5f5]">Your territory</h2>
        <p className="text-sm text-[#737373] mt-1">
          Select the states and zip codes where you work. Your search results will filter to this area.
        </p>
      </div>

      {/* States */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 mb-4">
        <p className="text-xs font-medium text-[#555555] uppercase tracking-wider mb-4">States</p>
        <div className="grid grid-cols-6 gap-1.5">
          {US_STATES.map((state) => (
            <button
              key={state}
              onClick={() => toggleState(state)}
              className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedStates.includes(state)
                  ? "bg-white text-black"
                  : "bg-[#1a1a1a] text-[#737373] hover:text-[#f5f5f5]"
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Zip codes */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 mb-6">
        <p className="text-xs font-medium text-[#555555] uppercase tracking-wider mb-4">
          Zip codes
        </p>
        <textarea
          placeholder="98101, 98102, 98103..."
          value={zipInput}
          onChange={(e) => { setZipInput(e.target.value); setSaved(false); }}
          rows={3}
          className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#444444] focus:border-[#333333] transition-colors resize-none"
        />
        {zips.length > 0 && (
          <p className="text-xs text-[#555555] mt-2">{zips.length} zip code{zips.length !== 1 ? "s" : ""} added</p>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={selectedStates.length === 0 && zips.length === 0}
        className="w-full bg-white text-black rounded-lg py-3 text-sm font-medium hover:bg-[#e5e5e5] transition-colors disabled:opacity-30"
      >
        {saved ? "Saved" : "Save territory"}
      </button>
    </div>
  );
}
