import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurgeonScope",
  description: "Surgeon lookup for med device sales reps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-[#f5f5f5] font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
