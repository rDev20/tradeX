import { TradeSlipsView } from "@/components/trade-slips-view";

export default async function TradeSlipsPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  return <TradeSlipsView channelId={channelId} />;
}
