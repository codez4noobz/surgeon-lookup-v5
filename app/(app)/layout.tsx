import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 px-4 pb-24 pt-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
