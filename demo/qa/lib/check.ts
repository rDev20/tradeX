// Tiny check runner — no test framework, no deps.
// Each check is a named async function that throws on failure.

export type CheckResult = {
  name: string;
  section: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
};

export class CheckContext {
  results: CheckResult[] = [];
  private currentSection = "default";

  section(name: string) {
    this.currentSection = name;
  }

  async check(name: string, fn: () => Promise<void> | void) {
    const t0 = Date.now();
    try {
      await fn();
      this.results.push({
        name,
        section: this.currentSection,
        passed: true,
        durationMs: Date.now() - t0,
      });
    } catch (err) {
      const e = err as Error;
      this.results.push({
        name,
        section: this.currentSection,
        passed: false,
        durationMs: Date.now() - t0,
        error: e.message,
        details: e.stack?.split("\n").slice(0, 3).join("\n"),
      });
    }
  }
}

// Lightweight assertion helpers
export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`expected falsy, got ${JSON.stringify(actual)}`);
    },
    toContain(substring: string) {
      if (typeof actual !== "string") throw new Error(`expected string, got ${typeof actual}`);
      if (!actual.includes(substring)) {
        throw new Error(`expected to contain "${substring}", got "${actual.slice(0, 200)}"`);
      }
    },
    toMatch(re: RegExp) {
      if (typeof actual !== "string") throw new Error(`expected string, got ${typeof actual}`);
      if (!re.test(actual)) {
        throw new Error(`expected to match ${re}, got "${actual.slice(0, 200)}"`);
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== "number") throw new Error(`expected number, got ${typeof actual}`);
      if (actual <= n) throw new Error(`expected > ${n}, got ${actual}`);
    },
    toBeOneOf(options: T[]) {
      if (!options.includes(actual)) {
        throw new Error(`expected one of ${JSON.stringify(options)}, got ${JSON.stringify(actual)}`);
      }
    },
  };
}
