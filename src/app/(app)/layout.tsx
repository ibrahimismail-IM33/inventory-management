import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { signOut } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/receive", label: "Receive" },
  { href: "/expiry", label: "Expiry" },
  { href: "/returns", label: "Returns" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ws = await getWorkspace();

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-teal-700">
            WAQT
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="opacity-80 hover:opacity-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="opacity-70">{ws.company.name}</span>
            <form action={signOut}>
              <button className="rounded-md border border-black/15 px-2 py-1 hover:bg-black/5">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
