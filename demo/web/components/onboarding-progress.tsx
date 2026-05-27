export function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  const totalSteps = 3;

  return (
    <header className="border-b border-[var(--neutral-800)] bg-[var(--neutral-900)] px-6 py-4 -mx-6 -mt-10 mb-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">
          trade<span className="brand-orange">X</span>
        </div>
        <div className="text-xs uppercase tracking-widest text-[var(--neutral-500)]">
          Step {step} of {totalSteps}
        </div>
      </div>
      <div className="max-w-3xl mx-auto mt-3 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={
              i <= step
                ? "flex-1 h-1 rounded-full bg-[var(--tradex-orange-500)]"
                : "flex-1 h-1 rounded-full bg-[var(--neutral-800)]"
            }
          />
        ))}
      </div>
    </header>
  );
}
