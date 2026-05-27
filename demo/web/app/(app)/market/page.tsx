import { MarketGrid } from "@/components/market-grid";
import { FeaturedSymbol } from "@/components/featured-symbol";

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FeaturedSymbol focusTicker={params?.focus ?? null} />
      <MarketGrid />
    </div>
  );
}
