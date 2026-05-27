import Link from "next/link";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cap?: string }>;
}) {
  const { error, cap } = await searchParams;
  const decodedError = error ? decodeURIComponent(error) : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-950)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-4xl font-semibold tracking-tight inline-block">
            trade<span className="brand-orange">X</span>
          </Link>
          <div className="mt-2 text-xs uppercase tracking-widest text-[var(--neutral-400)]">
            Create your account · Closed beta
          </div>
        </div>

        <SignupForm
          initialError={decodedError}
          capReached={cap === "1"}
          betaCap={process.env.MAX_BETA_USERS ?? "10"}
        />

        <div className="mt-6 text-center text-xs text-[var(--neutral-500)]">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-[var(--neutral-300)]">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
