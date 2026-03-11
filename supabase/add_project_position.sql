-- Přidá sloupec position do tabulky projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS position bigint;

-- Nastaví výchozí position podle created_at (nejstarší = nejmenší číslo)
UPDATE projects
SET position = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC) * 1000 AS rn
  FROM projects
  WHERE position IS NULL
) sub
WHERE projects.id = sub.id;
