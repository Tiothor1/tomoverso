import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "Nenhum arquivo enviado." }, { status: 400 });

    const allowedTypes = [".pdf", ".txt", ".epub", ".docx", ".md"];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json({ ok: false, error: `Formato não suportado: ${ext}. Use: ${allowedTypes.join(", ")}` }, { status: 400 });
    }

    // Salva arquivo
    const uploadId = randomUUID();
    const safeName = `${uploadId}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "imports");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Extrai texto básico se for TXT
    let extractedContent = null;
    let detectedTitle = null;
    let detectedChapters = 0;

    if (ext === ".txt") {
      const text = Buffer.from(bytes).toString("utf-8");
      extractedContent = text.slice(0, 50000); // limita a 50KB

      // Tenta detectar título (primeira linha não vazia)
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length > 0) {
        detectedTitle = lines[0].trim().replace(/^#+\s*/, "").slice(0, 200);
      }

      // Tenta detectar capítulos
      const chapterMatches = text.match(/(?:^|\n)(?:Cap[íi]tulo|Chapter|Volume|Parte)\s+\d+/gi);
      detectedChapters = chapterMatches?.length || 0;
    }

    // Cria entrada na fila
    const db = getDb();
    db.prepare(`
      INSERT INTO import_queue (id, status, file_type, file_name, file_path, file_size, original_name, detected_title, detected_chapters, extracted_content)
      VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uploadId, ext.replace(".", ""), safeName, `/uploads/imports/${safeName}`, bytes.byteLength, file.name, detectedTitle, detectedChapters, extractedContent);

    return NextResponse.json({ ok: true, id: uploadId, title: detectedTitle, chapters: detectedChapters, size: bytes.byteLength });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erro ao processar upload" }, { status: 500 });
  }
}
