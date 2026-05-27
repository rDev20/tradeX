// Helper to invoke the worker's Python scripts from Next.js server-side.
// Each call spawns a one-shot subprocess and parses one line of JSON from stdout.
// All path resolution is deferred to call-time so Next.js's static collector
// (which evaluates this module with import.meta.dirname undefined) can compile cleanly.

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

function getDirs() {
  // Resolve from import.meta.url (works at runtime in both ESM and Next bundling)
  const filename = fileURLToPath(import.meta.url);
  const libDir = dirname(filename);
  const webDir = resolve(libDir, "..");
  const workerDir = resolve(webDir, "../worker");
  return { webDir, workerDir };
}

function findPythonExecutable(workerDir: string): string {
  const winPython = resolve(workerDir, ".venv", "Scripts", "python.exe");
  const nixPython = resolve(workerDir, ".venv", "bin", "python");
  if (existsSync(winPython)) return winPython;
  if (existsSync(nixPython)) return nixPython;
  return process.platform === "win32" ? "python" : "python3";
}

export type PythonRunResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; stderr?: string };

/** Run a `auth.py` subcommand and parse JSON stdout. */
export async function runAuthScript<T = Record<string, unknown>>(
  subcommand: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<PythonRunResult<T>> {
  const { workerDir } = getDirs();
  const py = findPythonExecutable(workerDir);
  const authScript = resolve(workerDir, "auth.py");

  return new Promise((res) => {
    const fullArgs = [authScript, subcommand, ...args];
    const child = spawn(py, fullArgs, {
      cwd: workerDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const t = setTimeout(() => {
      child.kill();
      res({ ok: false, error: "Python subprocess timed out", stderr });
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(t);
      res({ ok: false, error: err.message, stderr });
    });

    child.on("close", () => {
      clearTimeout(t);
      const lastJson = stdout
        .trim()
        .split("\n")
        .reverse()
        .find((l) => l.trim().startsWith("{"));
      if (!lastJson) {
        return res({
          ok: false,
          error: "No JSON output from Python subprocess",
          stderr: stderr.slice(0, 500),
        });
      }
      try {
        const parsed = JSON.parse(lastJson) as T;
        res({ ok: true, data: parsed });
      } catch (err) {
        res({
          ok: false,
          error: `Failed to parse Python JSON: ${(err as Error).message}`,
          stderr: stderr.slice(0, 500),
        });
      }
    });
  });
}
