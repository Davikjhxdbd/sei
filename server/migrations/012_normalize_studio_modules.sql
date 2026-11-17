-- Normalize the legacy standalone Studio app entries.
-- Migration 006 used a LIKE pattern that can be sensitive to backslash
-- escaping; explicit keys make the intended state deterministic.
update modules
   set active = false,
       updated_at = now()
 where key in (
   'studio_production',
   'studio_events',
   'studio_checklists',
   'studio_reports',
   'studio_errors',
   'studio_occurrences',
   'studio_problems',
   'studio_schedules',
   'studio_media',
   'studio_presets'
 );

-- The consolidated Studio remains the single active entry point.
update modules
   set active = true,
       updated_at = now()
 where key = 'studio';
