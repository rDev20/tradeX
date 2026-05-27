import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { CheckResult } from "./check.js";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export function printConsoleReport(phase: string, results: CheckResult[]) {
  const bySection = new Map<string, CheckResult[]>();
  for (const r of results) {
    if (!bySection.has(r.section)) bySection.set(r.section, []);
    bySection.get(r.section)!.push(r);
  }

  console.log(`\n${BOLD}╔══ tradeX QA · phase ${phase} ══╗${RESET}\n`);

  for (const [section, items] of bySection) {
    console.log(`${BOLD}${section}${RESET}`);
    for (const r of items) {
      const mark = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const time = `${DIM}${r.durationMs}ms${RESET}`;
      console.log(`  ${mark} ${r.name} ${time}`);
      if (!r.passed && r.error) {
        console.log(`    ${RED}${r.error}${RESET}`);
      }
    }
    console.log();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const verdict = failed === 0
    ? `${GREEN}${BOLD}ALL PASS (${passed}/${results.length})${RESET}`
    : `${RED}${BOLD}${failed} FAIL · ${passed} PASS · ${results.length} total${RESET}`;
  console.log(verdict);
  console.log();
}

export function writeMarkdownReport(phase: string, results: CheckResult[]) {
  const dir = resolve(import.meta.dirname, "../reports");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${phase}.md`);

  const bySection = new Map<string, CheckResult[]>();
  for (const r of results) {
    if (!bySection.has(r.section)) bySection.set(r.section, []);
    bySection.get(r.section)!.push(r);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  const now = new Date().toISOString();

  let md = `# QA Report · phase ${phase}\n\n`;
  md += `> Generated ${now}\n\n`;
  md += `## Summary\n\n`;
  md += `| | Count |\n|---|---:|\n`;
  md += `| ✅ Passed | ${passed} |\n`;
  md += `| ❌ Failed | ${failed} |\n`;
  md += `| **Total** | **${results.length}** |\n\n`;
  md += failed === 0
    ? `**Verdict: PHASE PASSED** — ready to ship / proceed to next phase.\n\n`
    : `**Verdict: BLOCKED** — fix the ${failed} failing check${failed === 1 ? "" : "s"} below before shipping.\n\n`;

  md += `---\n\n`;

  for (const [section, items] of bySection) {
    md += `## ${section}\n\n`;
    md += `| | Check | Time |\n|---|---|---:|\n`;
    for (const r of items) {
      md += `| ${r.passed ? "✅" : "❌"} | ${r.name} | ${r.durationMs}ms |\n`;
    }
    const fails = items.filter((r) => !r.passed);
    if (fails.length > 0) {
      md += `\n### ${section} · failures\n\n`;
      for (const f of fails) {
        md += `**${f.name}**\n\n`;
        md += "```\n" + (f.error ?? "(no error message)") + "\n```\n\n";
      }
    }
    md += `\n`;
  }

  writeFileSync(file, md);
  console.log(`${DIM}Report written to ${file}${RESET}\n`);
}

export function exitCode(results: CheckResult[]): number {
  return results.every((r) => r.passed) ? 0 : 1;
}
