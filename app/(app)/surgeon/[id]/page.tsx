import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchSurgeonByNpi } from "@/lib/surgeons.server";

export default async function SurgeonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const surgeon = await fetchSurgeonByNpi(id);
  if (!surgeon) notFound();

  return (
    <div className="pt-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#f5f5f5] transition-colors mb-6"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </Link>

      <div className="space-y-4">
        {/* Header */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
          <h1 className="text-lg font-semibold text-[#f5f5f5]">
            {surgeon.name}
            {surgeon.credentials ? `, ${surgeon.credentials}` : ""}
          </h1>
          <p className="text-sm text-[#737373] mt-1">{surgeon.specialty}</p>
          <p className="text-xs text-[#555555] mt-1">NPI {surgeon.npi}</p>
          {surgeon.tier && (
            <p className="text-xs text-[#737373] mt-2">{surgeon.tier}</p>
          )}
        </div>

        {/* Contact */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-[#555555] uppercase tracking-wider">
            Contact
          </p>
          <Row
            label="Address"
            value={
              [
                surgeon.address,
                [surgeon.city, surgeon.state, surgeon.zip]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <Row label="Phone" value={surgeon.phone} />
          <Row label="Email" value={surgeon.email} />
        </div>

        {/* Affiliations */}
        {surgeon.affiliations.length > 0 && (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
            <p className="text-xs font-medium text-[#555555] uppercase tracking-wider mb-4">
              Affiliations
            </p>
            <div className="space-y-2">
              {surgeon.affiliations.map((aff, i) => (
                <p key={i} className="text-sm text-[#f5f5f5]">
                  {aff}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Research */}
        {surgeon.research.length > 0 && (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
            <p className="text-xs font-medium text-[#555555] uppercase tracking-wider mb-4">
              Research
            </p>
            <div className="space-y-3">
              {surgeon.research.map((paper, i) => (
                <p key={i} className="text-sm text-[#f5f5f5] leading-snug">
                  {paper.url ? (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white underline underline-offset-2 decoration-[#444444]"
                    >
                      {paper.title}
                    </a>
                  ) : (
                    paper.title
                  )}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-[#555555]">{label}</p>
      <p className="text-sm text-[#f5f5f5]">
        {value ?? <span className="text-[#444444]">Not available</span>}
      </p>
    </div>
  );
}
