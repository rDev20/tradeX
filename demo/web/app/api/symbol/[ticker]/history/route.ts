import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Range = "1D" | "1W" | "1M" | "6M" | "1Y";

const RANGE_TO_PARAMS: Record<Range, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "60m" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
};

type YahooChartResp = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketPrice?: number;
        timezone?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const url = new URL(req.url);
  const rawRange = (url.searchParams.get("range") ?? "1M").toUpperCase() as Range;
  const range: Range = (["1D", "1W", "1M", "6M", "1Y"] as Range[]).includes(rawRange)
    ? rawRange
    : "1M";
  const cfg = RANGE_TO_PARAMS[range];

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`;
    const r = await fetch(yahooUrl, {
      headers: {
        // yahoo blocks default node UA; use a real one
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json(
        { ticker, range, error: `Yahoo HTTP ${r.status}`, bars: [] },
        { status: 200 },
      );
    }
    const json = (await r.json()) as YahooChartResp;
    const result = json.chart?.result?.[0];
    if (!result) {
      const desc = json.chart?.error?.description ?? "no data";
      return NextResponse.json({ ticker, range, error: desc, bars: [] }, { status: 200 });
    }

    const ts = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0];
    const bars = ts
      .map((t, i) => ({
        time: t,
        open: q?.open?.[i] ?? null,
        high: q?.high?.[i] ?? null,
        low: q?.low?.[i] ?? null,
        close: q?.close?.[i] ?? null,
        volume: q?.volume?.[i] ?? null,
      }))
      .filter(
        (b): b is { time: number; open: number; high: number; low: number; close: number; volume: number | null } =>
          b.open !== null &&
          b.close !== null &&
          b.high !== null &&
          b.low !== null,
      );

    return NextResponse.json({
      ticker,
      range,
      interval: cfg.interval,
      currency: result.meta?.currency ?? "INR",
      previousClose:
        result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null,
      regularMarketPrice: result.meta?.regularMarketPrice ?? null,
      timezone: result.meta?.timezone ?? "Asia/Kolkata",
      bars,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ticker,
        range,
        error: err instanceof Error ? err.message : "yahoo error",
        bars: [],
      },
      { status: 200 },
    );
  }
}
