// Cookie-aware fetch wrapper. Uses built-in fetch (Node 22+).

const DEFAULT_BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

export class HttpClient {
  private cookies = new Map<string, string>();
  baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.baseUrl = baseUrl;
  }

  private cookieHeader(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private storeSetCookies(headers: Headers) {
    const setCookies = headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === "" || value === "deleted") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  async request(
    path: string,
    init: RequestInit & { followRedirect?: boolean } = {},
  ): Promise<Response> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const cookie = this.cookieHeader();
    const headers = new Headers(init.headers);
    if (cookie) headers.set("cookie", cookie);

    const res = await fetch(url, {
      ...init,
      headers,
      redirect: init.followRedirect === false ? "manual" : init.redirect,
    });
    this.storeSetCookies(res.headers);
    return res;
  }

  async get(path: string, opts: { followRedirect?: boolean } = {}) {
    return this.request(path, { method: "GET", ...opts });
  }

  async postForm(
    path: string,
    fields: Record<string, string>,
    opts: { followRedirect?: boolean } = {},
  ) {
    const body = new URLSearchParams(fields);
    return this.request(path, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      followRedirect: opts.followRedirect ?? false,
    });
  }

  async postJson(
    path: string,
    payload: unknown,
    opts: { followRedirect?: boolean } = {},
  ) {
    return this.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      followRedirect: opts.followRedirect ?? false,
    });
  }

  hasCookie(name: string): boolean {
    return this.cookies.has(name);
  }

  clearCookies() {
    this.cookies.clear();
  }
}
