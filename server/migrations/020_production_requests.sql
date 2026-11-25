-- Add priority to production requests without changing existing records.
ALTER TABLE production_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

ALTER TABLE production_tasks
  DROP CONSTRAINT IF EXISTS production_tasks_priority_check;

ALTER TABLE production_tasks
  ADD CONSTRAINT production_tasks_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS production_tasks_priority_due_idx
  ON production_tasks (
    (CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END),
    due_date
  )
  WHERE status <> 'published';
