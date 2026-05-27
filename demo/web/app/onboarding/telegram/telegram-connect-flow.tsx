"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2, CheckCircle2 } from "lucide-react";

type Stage = "phone" | "code" | "twofa" | "success";

export function TelegramConnectFlow({
  defaultPhone,
  requestEndpoint = "/api/onboarding/telegram/request-code",
  submitEndpoint = "/api/onboarding/telegram/submit-code",
  successCopy = "Connected. Loading channels...",
}: {
  defaultPhone: string;
  requestEndpoint?: string;
  submitEndpoint?: string;
  successCopy?: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sendCode = () => {
    setError(null);
    startTransition(async () => {
      const r = await fetch(requestEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.message ?? j.error ?? "Failed to send code.");
        return;
      }
      if (j.alreadyAuthorized) {
        setStage("success");
        setTimeout(() => router.push(j.redirect ?? "/"), 800);
        return;
      }
      setStage("code");
    });
  };

  const submitCode = (extraPassword?: string) => {
    setError(null);
    startTransition(async () => {
      const r = await fetch(submitEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, password: extraPassword ?? password }),
      });
      const j = await r.json();
      if (j.needs2FA) {
        setStage("twofa");
        return;
      }
      if (!r.ok || !j.ok) {
        setError(j.message ?? j.error ?? "Failed to verify code.");
        return;
      }
      setStage("success");
      setTimeout(() => router.push(j.redirect ?? "/"), 800);
    });
  };

  return (
    <div className="rounded-2xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-[var(--info)]/15 text-[var(--info)] flex items-center justify-center">
          <MessageCircle size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">Telegram</div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            {labelFor(stage)}
          </div>
        </div>
      </div>

      {stage === "phone" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]"
            />
            <div className="text-[10px] text-[var(--neutral-500)] mt-1">
              The same number you use for Telegram. Include country code.
            </div>
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button
            onClick={sendCode}
            disabled={pending || !phone}
            className="w-full rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] disabled:opacity-50 text-white py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Send code to my Telegram
          </button>
        </div>
      )}

      {stage === "code" && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--neutral-400)] leading-relaxed">
            Open the <span className="text-[var(--neutral-200)] font-medium">Telegram</span> app on
            your phone — there'll be a message from "Telegram" with a 5-digit login code. Enter it
            below.
          </p>
          <div>
            <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
              5-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • •"
              className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-3 text-2xl tracking-[0.4em] text-center text-[var(--neutral-50)] tabular-nums focus:outline-none focus:border-[var(--tradex-orange-500)]"
              autoFocus
            />
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button
            onClick={() => submitCode()}
            disabled={pending || code.length < 4}
            className="w-full rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] disabled:opacity-50 text-white py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Verify code
          </button>
          <button
            onClick={() => {
              setStage("phone");
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-[var(--neutral-400)] hover:text-[var(--neutral-100)] transition"
          >
            ← Use a different phone number
          </button>
        </div>
      )}

      {stage === "twofa" && (
        <div className="space-y-4">
          <div className="text-xs rounded-md border border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)] px-3 py-2 leading-relaxed">
            Your Telegram account has 2FA enabled. Enter your Telegram password (the one you set in
            Telegram Settings → Privacy → Two-Step Verification, NOT the OTP).
          </div>
          <div>
            <label className="text-xs text-[var(--neutral-400)] uppercase tracking-wider">
              Telegram 2FA password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-md bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-50)] focus:outline-none focus:border-[var(--tradex-orange-500)]"
              autoFocus
            />
          </div>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <button
            onClick={() => submitCode(password)}
            disabled={pending || !password}
            className="w-full rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] disabled:opacity-50 text-white py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Verify and finish
          </button>
        </div>
      )}

      {stage === "success" && (
        <div className="text-center py-6">
          <CheckCircle2 className="mx-auto mb-3 text-[var(--success)]" size={36} />
          <div className="font-semibold">{successCopy}</div>
          <div className="text-xs text-[var(--neutral-500)] mt-1">
            Opening your dashboard. Stage 3 is selecting the Telegram channels to evaluate.
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] px-3 py-2">
      {children}
    </div>
  );
}

function labelFor(stage: Stage): string {
  switch (stage) {
    case "phone":
      return "Step 1 of 2 · phone";
    case "code":
      return "Step 2 of 2 · OTP";
    case "twofa":
      return "Step 2 of 2 · 2FA";
    case "success":
      return "Connected";
  }
}
