-- Migration: add paragraph_number to comments for per-paragraph commenting
ALTER TABLE comments ADD COLUMN paragraph_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_comments_paragraph ON comments(chapter_id, paragraph_number);
