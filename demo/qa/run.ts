// QA entry point. Usage: tsx run.ts <phase>
//   tsx run.ts m0.1

import { CheckContext } from "./lib/check.js";
import { printConsoleReport, writeMarkdownReport, exitCode } from "./lib/report.js";
import { closeDb } from "./lib/db.js";

const PHASES: Record<string, () => Promise<(ctx: CheckContext) => Promise<void>>> = {
  "m0.1": async () => (await import("./phases/m0_1.js")).runM0_1,
  "m0.2": async () => (await import("./phases/m0_2.js")).runM0_2,
  "m0.3": async () => (await import("./phases/m0_3.js")).runM0_3,
  "m0.5": async () => (await import("./phases/m0_5.js")).runM0_5,
  "m0.6": async () => (await import("./phases/m0_6.js")).runM0_6,
  "trade-slips": async () => (await import("./phases/trade_slips.js")).runTradeSlips,
};

async function main() {
  const phase = (process.argv[2] ?? "").toLowerCase();
  if (!phase) {
    console.error("Usage: tsx run.ts <phase>\nKnown phases:", Object.keys(PHASES).join(", "));
    process.exit(2);
  }
  const loader = PHASES[phase];
  if (!loader) {
    console.error(`Unknown phase: ${phase}\nKnown:`, Object.keys(PHASES).join(", "));
    process.exit(2);
  }

  const fn = await loader();
  const ctx = new CheckContext();

  try {
    await fn(ctx);
  } catch (err) {
    console.error("\nUnhandled error in phase runner:", err);
  } finally {
    closeDb();
  }

  printConsoleReport(phase, ctx.results);
  writeMarkdownReport(phase, ctx.results);
  process.exit(exitCode(ctx.results));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
