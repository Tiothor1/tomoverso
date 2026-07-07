import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([".pdf", ".txt", ".epub", ".docx", ".md"]);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "Nenhum arquivo enviado." }, { status: 400 });

    const ext = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_TYPES.has(ext)) {
      return NextResponse.json({ ok: false, error: `Formato não suportado: ${ext || "sem extensão"}.` }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "Arquivo grande demais. Limite: 20MB." }, { status: 413 });
    }

    const uploadId = randomUUID();
    const safeName = `${uploadId}${ext}`;
    const isVercel = !!process.env.VERCEL;
    const uploadDir = isVercel
      ? path.join("/tmp", "uploads")
      : path.join(process.cwd(), "public", "uploads", "imports");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    const publicPath = isVercel ? filePath : `/uploads/imports/${safeName}`;

    let extractedContent = null;
    let detectedTitle = null;
    let detectedChapters = 0;

    if (ext === ".txt") {
      const text = Buffer.from(bytes).toString("utf-8");
      extractedContent = text.slice(0, 50000);
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length > 0) detectedTitle = lines[0].trim().replace(/^#+\s*/, "").slice(0, 200);
      const chapterMatches = text.match(/(?:^|\n)(?:Cap[íi]tulo|Chapter|Volume|Parte)\s+\d+/gi);
      detectedChapters = chapterMatches?.length || 0;
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO import_queue (id, status, file_type, file_name, file_path, file_size, original_name, detected_title, detected_chapters, extracted_content)
      VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uploadId, ext.replace(".", ""), safeName, publicPath, bytes.byteLength, file.name, detectedTitle, detectedChapters, extractedContent);

    return NextResponse.json({ ok: true, id: uploadId, title: detectedTitle, chapters: detectedChapters, size: bytes.byteLength });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro ao processar upload" }, { status: 500 });
  }
}
