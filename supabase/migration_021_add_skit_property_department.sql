-- Yuva Parayan 2026 — add the Skit Property department.
-- Run once in the Supabase SQL editor (safe to re-run).

insert into departments (slug, name, description, sort_order) values
  ('skit-property', 'Skit Property', 'Props and stage materials for skits and performances', 15)
on conflict (slug) do nothing;
