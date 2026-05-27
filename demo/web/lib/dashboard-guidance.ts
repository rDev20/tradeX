export type DashboardGuidanceInput = {
  telegram: {
    connected: boolean;
    name: string | null;
    phone: string | null;
    username: string | null;
    connectedAt: string | null;
  };
  serviceStatus: "running" | "stopped";
  counts: {
    channelsSelected: number;
    messagesToday: number;
    signalsToday: number;
    tradesToday: number;
  };
  lastTickAt: string | null;
  serviceEvent: { type: string; at: string } | null;
  events?: { type: string; at: string }[];
};

export type DashboardNextAction =
  | {
      kind: "link";
      tone: "brand" | "info" | "success";
      href: string;
      label: string;
      title: string;
      body: string;
      eyebrow: string;
    }
  | {
      kind: "service";
      tone: "brand";
      nextStatus: "running";
      label: string;
      title: string;
      body: string;
      eyebrow: string;
    };

export function decideNextAction(input: DashboardGuidanceInput): DashboardNextAction {
  if (!input.telegram.connected) {
    return {
      kind: "link",
      tone: "brand",
      href: "/connections",
      label: "Connect Telegram",
      eyebrow: "Step 1",
      title: "Connect your Telegram account",
      body: "tradeX needs your Telegram session before it can discover channels or read signals.",
    };
  }

  if (input.counts.channelsSelected === 0) {
    return {
      kind: "link",
      tone: "brand",
      href: "/channels",
      label: "Select channels",
      eyebrow: "Step 3",
      title: "Choose 1-3 Telegram channels to evaluate",
      body: "Pick channels and assign a Practice budget. This keeps testing focused and easy to read.",
    };
  }

  if (input.serviceStatus !== "running") {
    return {
      kind: "service",
      tone: "brand",
      nextStatus: "running",
      label: "Start Trading Service",
      eyebrow: "Ready",
      title: "Start watching your selected channels",
      body: "The worker will ingest messages, parse signals, and create paper trade slips.",
    };
  }

  if (input.counts.tradesToday > 0) {
    return {
      kind: "link",
      tone: "success",
      href: "/trading-floor",
      label: "Watch Trade Slips",
      eyebrow: "Live now",
      title: "Trades are moving on the Trading Floor",
      body: "Open the live cockpit to see entries, target tracking, P&L, and completed slips.",
    };
  }

  if (input.counts.messagesToday > 0 || input.counts.signalsToday > 0) {
    return {
      kind: "link",
      tone: "info",
      href: "/trading-floor",
      label: "Open Trading Floor",
      eyebrow: "Watching",
      title: "Signals are being processed",
      body: "The Trading Floor shows messages, parsed signals, and paper execution as they arrive.",
    };
  }

  return {
    kind: "link",
    tone: "info",
    href: "/trading-floor",
    label: "Open Trading Floor",
    eyebrow: "Standing by",
    title: "tradeX is watching for the next signal",
    body: "Keep the cockpit open while Telegram messages arrive from your selected channels.",
  };
}

export function missionStatusText(input: DashboardGuidanceInput): string {
  const telegram = input.telegram.connected ? "Telegram connected" : "Telegram not connected";
  const channels =
    input.counts.channelsSelected === 1
      ? "1 channel selected"
      : `${input.counts.channelsSelected} channels selected`;
  const service = input.serviceStatus === "running" ? "Service live" : "Service stopped";
  return `Paper Trading · ${telegram} · ${channels} · ${service}`;
}

export function lastSyncAt(input: DashboardGuidanceInput): string | null {
  const times = [
    input.lastTickAt,
    input.serviceEvent?.at ?? null,
    ...(input.events ?? []).slice(0, 1).map((event) => event.at),
  ].filter((value): value is string => !!value);
  if (times.length === 0) return null;
  return times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function channelHealthLabel(channel: {
  tradesToday: number;
  messages: number;
  signals: number;
  todayPnl: number;
  lifetimePnl: number;
}) {
  if (channel.tradesToday > 0) return "Active today";
  if (channel.signals > 0) return "Watching signals";
  if (channel.messages > 0) return "Messages seen";
  if (channel.lifetimePnl > 0) return "Performing well";
  if (channel.todayPnl < 0 || channel.lifetimePnl < 0) return "Needs review";
  return "Needs more data";
}
