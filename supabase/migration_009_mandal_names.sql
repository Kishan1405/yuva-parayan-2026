-- Yuva Parayan 2026 — replace placeholder Mandal names with the real ones.
-- Run once in the Supabase SQL editor (safe to re-run).

update mandals set name = 'Pramukh Nagar' where sort_order = 1;
update mandals set name = 'Gurudev Park' where sort_order = 2;
update mandals set name = 'Gunatit Nagar' where sort_order = 3;
