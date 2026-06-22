/**
 * Rate limiter — Token Bucket por fonte.
 *
 * Cada fonte (VNDB, JIKAN, etc.) tem seu próprio bucket. O bucket
 * é reabastecido a uma taxa configurável (ex: 5 tokens/s pra VNDB).
 *
 * Uso:
 *   const limiter = new TokenBucket({ rate: 5, capacity: 5 });
 *   await limiter.acquire();   // bloqueia até ter 1 token
 *   await response.json();
 *
 * Sem dependência externa — usa `setTimeout` nativo do Node.
 */

export interface TokenBucketConfig {
  /** Tokens adicionados por segundo (ex: 5 = 5 req/s) */
  rate: number;
  /** Capacidade máxima do bucket (burst máximo). Default = rate */
  capacity?: number;
  /** Nome da fonte (apenas pra logs) */
  name?: string;
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly rate: number;
  private readonly capacity: number;
  private readonly name: string;

  // Fila de promessas esperando tokens
  private waiters: Array<{ resolve: () => void; ts: number }> = [];
  private refillTimer: NodeJS.Timeout | null = null;

  constructor(config: TokenBucketConfig) {
    this.rate = config.rate;
    this.capacity = config.capacity ?? config.rate;
    this.name = config.name ?? "unnamed";
    this.tokens = this.capacity; // começa cheio
    this.lastRefill = Date.now();
  }

  /**
   * Aguarda até ter 1 token disponível, depois consome.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Sem tokens — calcular quanto tempo até o próximo
    const waitMs = Math.ceil((1 - this.tokens) * (1000 / this.rate));
    return new Promise<void>((resolve) => {
      const entry = { resolve, ts: Date.now() + waitMs };
      this.waiters.push(entry);
      this.ensureRefillTimer();
    });
  }

  /**
   * Tenta adquirir sem bloquear. Retorna true se conseguiu.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Reseta o bucket (útil pra testes).
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
    // Resolve todas as waiters pendentes
    for (const w of this.waiters) w.resolve();
    this.waiters = [];
  }

  /**
   * Stats pra debug.
   */
  stats() {
    return {
      name: this.name,
      rate: this.rate,
      capacity: this.capacity,
      tokens: Math.floor(this.tokens * 100) / 100,
      waiters: this.waiters.length,
    };
  }

  // ── Internals ───────────────────────────────────────────────────────

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
      this.lastRefill = now;
    }
  }

  private ensureRefillTimer(): void {
    if (this.refillTimer) return;
    // Timer que acorda a cada 50ms pra processar waiters.
    // NÃO usamos unref() aqui — o await acquire() já segura o event loop,
    // mas unref() faz o timer não contar como ref ativa, o que pode causar
    // encerramento prematuro do processo quando ele é a única coisa pendente.
    this.refillTimer = setInterval(() => {
      this.refill();
      // Resolve waiters cujos tokens estão disponíveis
      const now = Date.now();
      const remaining: typeof this.waiters = [];
      for (const w of this.waiters) {
        if (this.tokens >= 1 && w.ts <= now) {
          this.tokens -= 1;
          w.resolve();
        } else {
          remaining.push(w);
        }
      }
      this.waiters = remaining;
      if (this.waiters.length === 0 && this.refillTimer) {
        clearInterval(this.refillTimer);
        this.refillTimer = null;
      }
    }, 50);
  }
}

// ── Registry global de buckets por fonte ───────────────────────────────

const registry = new Map<string, TokenBucket>();

export function getBucket(name: string, rate: number, capacity?: number): TokenBucket {
  let b = registry.get(name);
  if (!b) {
    b = new TokenBucket({ name, rate, capacity });
    registry.set(name, b);
  }
  return b;
}

export function listBuckets() {
  return Array.from(registry.values()).map((b) => b.stats());
}
