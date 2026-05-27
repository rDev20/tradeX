import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, LogOut, MessageCircle, Radio, Settings } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { requireAdminUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Activity },
  { href: "/admin/telegram", label: "Telegram", icon: MessageCircle },
  { href: "/admin/channels", label: "Channels", icon: Radio },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdminUser();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--neutral-950)] text-[var(--neutral-50)]">
      <header className="h-14 border-b border-[var(--neutral-800)] bg-[var(--neutral-900)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-xl font-semibold tracking-tight">
            trade<span className="brand-orange">X</span>
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] border border-[var(--neutral-700)] rounded px-1.5 py-0.5">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[var(--neutral-200)]">{admin.fullName}</span>
            <span className="text-[10px] text-[var(--neutral-500)]">{admin.phone}</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-xs text-[var(--neutral-400)] hover:text-[var(--neutral-50)] transition"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex">
        <aside className="w-60 min-h-[calc(100vh-3.5rem)] shrink-0 border-r border-[var(--neutral-800)] bg-[var(--neutral-900)] px-3 py-6">
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--neutral-400)] hover:text-[var(--neutral-50)] hover:bg-[var(--neutral-800)]/50 transition",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
