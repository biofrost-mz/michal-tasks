-- Přidá sloupec remind_at (jednorázová připomínka) na tabulku tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_at timestamptz;
