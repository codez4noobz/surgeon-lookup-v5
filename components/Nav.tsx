"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const links = [
    { href: "/dashboard", label: "Search", icon: SearchIcon },
    { href: "/territory", label: "Territory", icon: MapIcon },
  ];

  return (
    <nav className="border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between max-w-2xl mx-auto w-full">
      <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-[#f5f5f5]">
        SurgeonScope
      </Link>

      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
              pathname === href
                ? "bg-[#1a1a1a] text-[#f5f5f5]"
                : "text-[#737373] hover:text-[#f5f5f5]"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}

        <button
          onClick={handleSignOut}
          className="ml-2 text-xs text-[#737373] hover:text-[#f5f5f5] transition-colors px-2 py-1.5"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  );
}
