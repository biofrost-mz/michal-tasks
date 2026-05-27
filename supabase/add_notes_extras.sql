-- Add new columns to notes table for enhanced notes functionality
ALTER TABLE notes ADD COLUMN IF NOT EXISTS icon       text    DEFAULT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS status     text    DEFAULT 'draft';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived   boolean DEFAULT false NOT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags       text[]  DEFAULT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS extra_project_ids uuid[] DEFAULT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS extra_task_ids    uuid[] DEFAULT NULL;
