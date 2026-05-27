-- Quick Todos — extra optional columns
-- Spusť v Supabase SQL Editoru

ALTER TABLE quick_todos ADD COLUMN IF NOT EXISTS priority text DEFAULT NULL;
ALTER TABLE quick_todos ADD COLUMN IF NOT EXISTS due_date date DEFAULT NULL;
ALTER TABLE quick_todos ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;
ALTER TABLE quick_todos ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;
