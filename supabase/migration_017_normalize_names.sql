-- Yuva Parayan 2026 — normalize names to "First Surname", dropping any
-- middle name (commonly the father's name, e.g. "Jay Ashokbhai Gondaliya"
-- -> "Jay Gondaliya"). Only touches names with more than 2 words; 1- and
-- 2-word names are left exactly as-is.
--
-- Review the matching SELECT (see chat) BEFORE running this — it's a
-- one-way data change with no undo built in.
-- Run once in the Supabase SQL editor.

with parts as (
  select id, regexp_split_to_array(trim(name), '\s+') as words
  from users
)
update users u
set name = p.words[1] || ' ' || p.words[array_length(p.words, 1)]
from parts p
where u.id = p.id
  and array_length(p.words, 1) > 2;
