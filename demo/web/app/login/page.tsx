import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-950)] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="text-4xl font-semibold tracking-tight inline-block">
            trade<span className="brand-orange">X</span>
          </Link>
          <div className="mt-2 text-xs uppercase tracking-widest text-[var(--neutral-400)]">
            Sign in to your beta account
          </div>
        </div>

        <form
          action={login}
          className="rounded-2xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 space-y-4"
        >
          <div>
            <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]"
              placeholder="you@example.com"
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
              placeholder="••••••••"
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
            Sign in
          </button>
        </form>

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
