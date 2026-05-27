-- Add subtasks column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;
