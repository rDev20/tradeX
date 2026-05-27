import { db } from "@/lib/db";
import Link from "next/link";
import { evaluateChannel, stopEvaluating } from "../actions";
import { practiceRupee, relativeTime } from "@/lib/utils";
import { Radio } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import {
  StartServiceFromChannelsEmpty,
  ChannelsSyncingState,
} from "@/components/channels-empty-states";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const userId = await requireUserId();

  const [channels, serviceStatus, telegram] = await Promise.all([
    db.channel.findMany({
      where: { userId },
      orderBy: [{ selected: "desc" }, { addedAt: "asc" }],
      include: {
        _count: { select: { messages: true, signals: true, trades: true } },
        messages: { orderBy: { postedAt: "desc" }, take: 1 },
      },
    }),
    db.userServiceStatus.findUnique({ where: { userId } }),
    db.userTelegramAccount.findUnique({ where: { userId } }),
  ]);

  const isRunning = serviceStatus?.status === "running";
  const tgConnected = !!telegram?.connectedAt;
  const noChannelsYet = channels.length === 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-1">
          Your Telegram channels and groups. Pick which ones to evaluate via paper-trading and
          allocate a Practice ₹ budget for each.
        </p>
      </div>

      {/* State A — service not running yet */}
      {noChannelsYet && !isRunning && (
        <StartServiceFromChannelsEmpty tgConnected={tgConnected} />
      )}

      {/* State B — service running, no channels yet */}
      {noChannelsYet && isRunning && <ChannelsSyncingState />}

      {/* State C — channel list */}
      {!noChannelsYet && (
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] divide-y divide-[var(--neutral-800)]">
          {channels.map((c) => {
            const lastMsg = c.messages[0];
            return (
              <div key={c.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--neutral-800)] flex items-center justify-center text-[var(--neutral-400)] mt-0.5">
                    <Radio size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/channels/${c.id}`}
                        className="font-semibold truncate hover:text-[var(--tradex-orange-500)]"
                      >
                        {c.name}
                      </Link>
                      {c.username && (
                        <span className="text-xs text-[var(--neutral-500)]">@{c.username}</span>
                      )}
                      {c.selected && (
                        <span className="text-[10px] uppercase tracking-wider bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-300)] px-1.5 py-0.5 rounded">
                          Evaluating · {practiceRupee(c.budget)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--neutral-500)] mt-0.5 truncate">
                      {lastMsg ? (
                        <>
                          Last message {relativeTime(lastMsg.postedAt)} · {c._count.messages}{" "}
                          ingested · {c._count.signals} parsed · {c._count.trades} paper-traded
                        </>
                      ) : (
                        <>Not synced yet</>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {c.selected ? (
                      <form action={stopEvaluating.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        >
                          Stop evaluating
                        </button>
                      </form>
                    ) : (
                      <details className="group">
                        <summary className="list-none cursor-pointer text-xs px-3 py-1.5 rounded border border-[var(--tradex-orange-500)]/40 text-[var(--tradex-orange-300)] hover:bg-[var(--tradex-orange-500)]/10 select-none">
                          Evaluate
                        </summary>
                        <form
                          action={evaluateChannel}
                          className="mt-3 flex items-center gap-2 bg-[var(--neutral-800)]/50 rounded p-2"
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <label className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] whitespace-nowrap">
                            Practice ₹ budget
                          </label>
                          <input
                            name="budget"
                            type="number"
                            min={1000}
                            step={1000}
                            defaultValue={100000}
                            className="w-32 rounded bg-[var(--neutral-950)] border border-[var(--neutral-700)] px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-[var(--tradex-orange-500)]"
                          />
                          <button
                            type="submit"
                            className="text-xs px-3 py-1 rounded bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] text-white font-medium"
                          >
                            Confirm
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--neutral-500)]">
        The Practice ₹ budget is the simulated wallet allocated to each channel. All trades are
        paper-only — no real money moves.
      </p>
    </div>
  );
}
