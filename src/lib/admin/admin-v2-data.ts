type AnyDb = {
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
  };
};

export async function readSearchParams<T extends Record<string, string | undefined>>(searchParams?: T | Promise<T>) {
  try {
    return (await Promise.resolve(searchParams || ({} as T))) || ({} as T);
  } catch {
    return {} as T;
  }
}

function isExpectedMissingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.toLowerCase().includes("no such table");
}

export function safeGet<T = any>(db: AnyDb, sql: string, ...params: unknown[]): T | null {
  try {
    return (db.prepare(sql).get(...params) as T) || null;
  } catch (error) {
    if (!isExpectedMissingTable(error)) {
      console.warn("[admin-v2] safeGet failed", { sql, error });
    }
    return null;
  }
}

export function safeAll<T = any>(db: AnyDb, sql: string, ...params: unknown[]): T[] {
  try {
    return (db.prepare(sql).all(...params) as T[]) || [];
  } catch (error) {
    if (!isExpectedMissingTable(error)) {
      console.warn("[admin-v2] safeAll failed", { sql, error });
    }
    return [];
  }
}

export function safeRun(db: AnyDb, sql: string, ...params: unknown[]) {
  try {
    return db.prepare(sql).run(...params);
  } catch (error) {
    if (!isExpectedMissingTable(error)) {
      console.warn("[admin-v2] safeRun failed", { sql, error });
    }
    return null;
  }
}

export function safeCount(db: AnyDb, sql: string, ...params: unknown[]): number {
  const row = safeGet<Record<string, unknown>>(db, sql, ...params);
  if (!row) return 0;
  const first = Object.values(row)[0];
  return Number(first) || 0;
}

export function safeSum(db: AnyDb, sql: string, ...params: unknown[]): number {
  return Math.floor(safeCount(db, sql, ...params));
}

export function tableExists(db: AnyDb, tableName: string): boolean {
  const row = safeGet<{ name?: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
    tableName,
  );
  return !!row?.name;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function shortDate(value?: string | null): string {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function normalizeStatusLabel(status?: string | null): string {
  const map: Record<string, string> = {
    ongoing: "Em andamento",
    completed: "Concluído",
    hiatus: "Hiato",
    dropped: "Dropado",
    pending: "Pendente",
    processing: "Processando",
    error: "Erro",
    active: "Ativo",
    hidden: "Oculto",
    removed: "Removido",
    approved: "Aprovado",
    rejected: "Rejeitado",
    paid: "Pago",
    draft: "Rascunho",
    user: "Usuário",
    reader: "Leitor",
    admin: "Admin",
    author: "Autor",
    banned: "Banido",
  };
  return map[status || ""] || status || "—";
}

export function statusTone(status?: string | null): "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate" | "blue" {
  if (!status) return "slate";
  if (["completed", "paid", "approved", "active", "success", "author"].includes(status)) return "emerald";
  if (["pending", "processing", "draft", "hiatus"].includes(status)) return "amber";
  if (["error", "rejected", "removed", "dropped", "banned", "hidden"].includes(status)) return "rose";
  if (["admin"].includes(status)) return "violet";
  if (["manga", "visual-novel"].includes(status)) return "cyan";
  return "blue";
}

export function imageFromRow(row: Record<string, any>): string | null {
  return row.cover_local_path || row.cover_url || row.cover_source_url || null;
}

export function truncateText(text?: string | null, size = 180): string {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > size ? `${clean.slice(0, size - 1)}…` : clean;
}
