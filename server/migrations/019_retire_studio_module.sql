-- Retire the MMV Studio application without deleting operational records.
UPDATE modules
   SET active = false,
       updated_at = now()
 WHERE key LIKE 'studio%';
