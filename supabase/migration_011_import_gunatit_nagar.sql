-- Yuva Parayan 2026 -- bulk import: Gunatit Nagar attendee list
-- Source: Gunatit Nagar List.xlsx (44 people, name + mobile only)
-- Skips any contact_number that already has an account (avoids duplicates
-- for people who already self-signed-up). PIN defaults to last 4 digits,
-- same convention as normal signup.
-- Run once in the Supabase SQL editor.

insert into users (name, contact_number, mandal_id, login_pin_hash)
select v.name, v.contact_number,
  (select id from mandals where name = 'Gunatit Nagar'),
  crypt(right(v.contact_number, 4), gen_salt('bf'))
from (values
  ('Bhadresh Savaliya', '9408612057'),
  ('Pankajbhai Vasani', '9724749930'),
  ('Vivek Kalariya', '7046311143'),
  ('Jay Ashokbhai Gondaliya', '9408887845'),
  ('Virat Jani', '9737064884'),
  ('Darshan Vaghela', '7622055371'),
  ('Jay Vasani', '9998993066'),
  ('Jatish Nadoliya', '9106296679'),
  ('Dhruvin Makvana', '9408830300'),
  ('Tejas Kasundra', '9104316782'),
  ('Harshit Pithadiya', '9925010001'),
  ('Hiren Nileshbhai Kamani', '9913900945'),
  ('Dhaval Harishbhai Tank', '8140849951'),
  ('Devang Chavda', '9265267692'),
  ('Milan Ramani', '8469976040'),
  ('Soham Rudakiya', '8780039302'),
  ('Tirthrajsinh Jadeja', '9909185532'),
  ('Mayur Parmar', '8000763309'),
  ('Jay Vora', '9913983092'),
  ('Atman Dudakiya', '9909018825'),
  ('Kirtan Zalera', '8511120137'),
  ('Yashvardhan Vaghadiya', '9909966642'),
  ('Jaimish Tank', '7874711192'),
  ('Darshan Dudakiya', '8866385131'),
  ('Dhaval pipaliya', '9099424964'),
  ('Smit Gohel', '9624365821'),
  ('Dhruv Kacha', '9054833152'),
  ('Akshar Rathod', '9316021303'),
  ('Savan Korat', '8780723491'),
  ('Dhruvik Sureliya', '7567757557'),
  ('Karan Gohel', '9624940494'),
  ('Apurva Vaghela', '9978398702'),
  ('Karmraj Jadeja', '9601000675'),
  ('Darshit Tank', '9510051499'),
  ('Dev Yadav', '8320787386'),
  ('Krish Makvana', '9723292292'),
  ('Kaushal Gohel', '9586619819'),
  ('Vivek Umraliya', '9725123443'),
  ('Ravi Chatraliya', '9099350012'),
  ('Abhay Dineshbhai Kamani', '9429442152'),
  ('Kaushal Khambhayta', '9913189333'),
  ('Vraj Thummar', '9482749188'),
  ('Kaushal Miteshbhai Rathod', '9274053424'),
  ('Jatin Ganatra', '7600844230')
) as v(name, contact_number)
where not exists (
  select 1 from users u where u.contact_number = v.contact_number
);
