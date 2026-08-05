-- Yuva Parayan 2026 — add the remaining 9 departments (Sangeet, Sabha
-- Vyavastha, Parayan Pujan, and Prasad were already seeded).
-- Run once in the Supabase SQL editor (safe to re-run).

insert into departments (slug, name, description, sort_order) values
  ('sabha-karyakram', 'Sabha Karyakram', 'Sabha programme and schedule coordination', 5),
  ('presentator', 'Presentator', 'Stage presentation, MC, and announcements', 6),
  ('attendance', 'Attendance', 'Attendee check-in and headcount', 7),
  ('footwear', 'Footwear', 'Footwear stand and safekeeping', 8),
  ('audio-video', 'Audio-Video', 'Sound, video, and live-streaming setup', 9),
  ('photography', 'Photography', 'Event photography and coverage', 10),
  ('decoration', 'Decoration', 'Venue and stage decoration', 11),
  ('sant-sarbhara', 'Sant Sarbhara', 'Hospitality and care for the Sants', 12),
  ('sant-swagat', 'Sant Swagat', 'Reception and welcome for the Sants', 13)
on conflict (slug) do nothing;
