/**
 * HTTP client — wrapper sobre `fetch` com:
 * - User-Agent identificável
 * - Timeout configurável
 * - Retry com backoff exponencial (3 tentativas por padrão)
 * - Tratamento de 429 (rate limit) com Retry-After
 * - Tratamento de 5xx como retried
 * - Logging opcional de cada request
 *
 * Sem dependência externa — usa fetch nativo do Node 18+.
 */

export interface HttpClientConfig {
  /** User-Agent enviado em todas as requisições */
  userAgent: string;
  /** Timeout em ms (default 30s) */
  timeoutMs?: number;
  /** Número máximo de tentativas (default 3) */
  maxRetries?: number;
  /** Backoff inicial em ms (default 1000). Dobra a cada tentativa. */
  initialBackoffMs?: number;
  /** Headers padrão adicionados a TODAS as requisições */
  defaultHeaders?: Record<string, string>;
  /** Função de log opcional */
  onLog?: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Headers adicionais */
  headers?: Record<string, string>;
  /** Body (JSON.stringify automático se for objeto) */
  body?: unknown;
  /** Timeout específico desta request (sobrescreve default) */
  timeoutMs?: number;
  /** Número de tentativas específicas (sobrescreve default) */
  maxRetries?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
  /** Tempo total da request em ms (incluindo retries) */
  durationMs: number;
  /** Número de tentativas que foram necessárias */
  attempts: number;
}

export class HttpClient {
  private readonly config: Required<Omit<HttpClientConfig, "onLog" | "defaultHeaders">> & {
    onLog?: HttpClientConfig["onLog"];
    defaultHeaders?: Record<string, string>;
  };

  constructor(config: HttpClientConfig) {
    this.config = {
      userAgent: config.userAgent,
      timeoutMs: config.timeoutMs ?? 30_000,
      maxRetries: config.maxRetries ?? 3,
      initialBackoffMs: config.initialBackoffMs ?? 1000,
      defaultHeaders: config.defaultHeaders,
      onLog: config.onLog,
    };
  }

  private log(msg: string, meta?: Record<string, unknown>) {
    if (this.config.onLog) this.config.onLog(msg, meta);
  }

  async get<T = unknown>(url: string, opts: Omit<HttpRequestOptions, "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...opts, method: "GET" });
  }

  async post<T = unknown>(url: string, body: unknown, opts: Omit<HttpRequestOptions, "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...opts, method: "POST", body });
  }

  async request<T = unknown>(url: string, opts: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const maxRetries = opts.maxRetries ?? this.config.maxRetries;
    const timeoutMs = opts.timeoutMs ?? this.config.timeoutMs;
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headers: Record<string, string> = {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
          ...(this.config.defaultHeaders ?? {}),
          ...opts.headers,
        };

        let body: BodyInit | undefined;
        if (opts.body !== undefined) {
          if (typeof opts.body === "string") {
            body = opts.body;
          } else {
            body = JSON.stringify(opts.body);
            if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
          }
        }

        const response = await fetch(url, {
          method: opts.method ?? "GET",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timer);

        // 2xx: sucesso
        if (response.ok) {
          let data: any;
          const ct = response.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          return {
            status: response.status,
            ok: true,
            headers: response.headers,
            data: data as T,
            durationMs: Date.now() - start,
            attempts: attempt,
          };
        }

        // 429: rate limit — respeitar Retry-After
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") ?? "5", 10);
          this.log(`rate_limited`, { url, attempt, retryAfter });
          if (attempt < maxRetries) {
            await sleep(retryAfter * 1000);
            continue;
          }
          throw new HttpError(429, "rate_limited", await safeText(response));
        }

        // 5xx: retried
        if (response.status >= 500 && response.status < 600) {
          this.log(`server_error`, { url, status: response.status, attempt });
          if (attempt < maxRetries) {
            await this.backoff(attempt);
            continue;
          }
          throw new HttpError(response.status, "server_error", await safeText(response));
        }

        // 4xx (exceto 429): erro permanente, não tenta de novo
        throw new HttpError(response.status, "client_error", await safeText(response));
      } catch (e: any) {
        clearTimeout(timer);

        if (e instanceof HttpError) {
          // Já tratado acima (não retried)
          throw e;
        }

        // Erro de rede / timeout / abort — retried
        lastError = e;
        this.log(`network_error`, { url, attempt, error: e.message });

        if (attempt < maxRetries) {
          await this.backoff(attempt);
          continue;
        }
      }
    }

    throw lastError ?? new Error("http_request_failed");
  }

  private async backoff(attempt: number): Promise<void> {
    // Backoff exponencial com jitter: base * 2^(attempt-1) + random(0, base/2)
    const base = this.config.initialBackoffMs;
    const exp = base * Math.pow(2, attempt - 1);
    const jitter = Math.random() * (base / 2);
    await sleep(exp + jitter);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, public code: string, public body: string) {
    super(`HTTP ${status} (${code}): ${body.slice(0, 200)}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}

export { HttpError };
