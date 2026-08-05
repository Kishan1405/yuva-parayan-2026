-- Yuva Parayan 2026 — add the IT Department.
-- Run once in the Supabase SQL editor (safe to re-run).

insert into departments (slug, name, description, sort_order) values
  ('it', 'IT Department', 'App, website, and technical support', 14)
on conflict (slug) do nothing;
