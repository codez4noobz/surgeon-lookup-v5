import Link from "next/link";
import { Surgeon } from "@/lib/types";

export default function SurgeonCard({ surgeon }: { surgeon: Surgeon }) {
  return (
    <Link href={`/surgeon/${surgeon.id}`} className="block">
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#333333] transition-colors active:bg-[#161616]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#f5f5f5] truncate">
              {surgeon.name}, {surgeon.credentials}
            </p>
            <p className="text-xs text-[#737373] mt-0.5">{surgeon.specialty}</p>
          </div>
          <svg
            className="text-[#333333] shrink-0 mt-0.5"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-[#555555]">
          <span>{surgeon.city}, {surgeon.state}</span>
          {surgeon.phone && <span>{surgeon.phone}</span>}
        </div>
      </div>
    </Link>
  );
}
