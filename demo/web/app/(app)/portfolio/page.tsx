import { PortfolioView } from "@/components/portfolio-view";

export const dynamic = "force-dynamic";

export default function PortfolioPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Portfolio
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Holdings &amp; trade history</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-1 max-w-2xl">
          Your open paper positions and closed trades. All numbers are{" "}
          <span className="text-[var(--tradex-orange-300)] font-medium">Practice ₹</span> — no real
          money is involved. Realistic Indian transaction costs (STT, brokerage, GST, SEBI, stamp)
          are deducted from every closed trade.
        </p>
      </div>
      <PortfolioView />
    </div>
  );
}
