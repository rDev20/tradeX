import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; error?: string }>;
}) {
  const { as, error } = await searchParams;
  const isAdmin = as === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-950)] p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <Link href="/" className="text-4xl font-semibold tracking-tight inline-block">
            trade<span className="brand-orange">X</span>
          </Link>
          <div className="mt-2 text-xs uppercase tracking-widest text-[var(--neutral-400)]">
            {isAdmin ? "Admin source control" : "Sign in to your beta account"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <form
            action={login}
            className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {isAdmin ? "Admin login" : "User login"}
                </div>
                <div className="mt-1 text-xs text-[var(--neutral-500)]">
                  {isAdmin
                    ? "Manage Telegram source channels and global broadcasting."
                    : "Enter the trading floor and track your paper trading."}
                </div>
              </div>
              <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
                {isAdmin ? "Admin" : "User"}
              </span>
            </div>

            <div>
              <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
                {isAdmin ? "Admin email or username" : "Email"}
              </label>
              <input
                name="email"
                type={isAdmin ? "text" : "email"}
                required
                autoComplete="username"
                className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]"
                placeholder={isAdmin ? "Admin_Karaan" : "you@example.com"}
                defaultValue={isAdmin ? "Admin_Karaan" : ""}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]"
                placeholder="********"
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded px-3 py-2">
                Invalid email or password.
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] text-white py-2.5 text-sm font-medium transition"
            >
              {isAdmin ? "Enter admin portal" : "Enter trading floor"}
            </button>
          </form>

          <div className="grid gap-3">
            <RoleLink
              active={!isAdmin}
              href="/login"
              title="User portal"
              body="For onboarded users to set funds, lots, and watch calls execute in paper mode."
            />
            <RoleLink
              active={isAdmin}
              href="/login?as=admin"
              title="Admin portal"
              body="For Karaan to connect Telegram, choose the global broadcast channel, and monitor parsing."
            />
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--neutral-500)]">
          New to tradeX?{" "}
          <Link href="/signup" className="underline hover:text-[var(--neutral-300)]">
            Create an account
          </Link>
        </div>
        <div className="mt-3 text-center text-[10px] text-[var(--neutral-600)]">
          Closed beta · Practice ₹ only · No real money
        </div>
      </div>
    </div>
  );
}

function RoleLink({
  active,
  href,
  title,
  body,
}: {
  active: boolean;
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md border border-[var(--tradex-orange-500)] bg-[var(--tradex-orange-500)]/10 p-4 transition"
          : "rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 hover:border-[var(--neutral-700)] transition"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        {active && (
          <span className="rounded border border-[var(--tradex-orange-500)]/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--tradex-orange-300)]">
            Selected
          </span>
        )}
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--neutral-400)]">{body}</p>
    </Link>
  );
}
