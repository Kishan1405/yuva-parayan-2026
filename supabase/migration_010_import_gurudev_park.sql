-- Yuva Parayan 2026 -- bulk import: Gurudev Park attendee list
-- Source: Gurudev Park Yuvak List udated.xlsx (55 people, name + mobile only)
-- Skips any contact_number that already has an account (avoids duplicates
-- for people who already self-signed-up). PIN defaults to last 4 digits,
-- same convention as normal signup.
-- Run once in the Supabase SQL editor.

insert into users (name, contact_number, mandal_id, login_pin_hash)
select v.name, v.contact_number,
  (select id from mandals where name = 'Gurudev Park'),
  crypt(right(v.contact_number, 4), gen_salt('bf'))
from (values
  ('Vinit Jentibhai Khunt', '7874067967'),
  ('Gaurav Amrutbhai Vora', '8866644673'),
  ('Jay Ashwinbhai Ghadiya', '9465763207'),
  ('Jevin Rasilbhai Gorasiya', '9712934693'),
  ('Pratik Dineshbhai Timbadiya', '9328837127'),
  ('Prem Vimalbhai Sarvaiya', '8128989043'),
  ('Vasant Vimalbhai Sanghani', '8320051862'),
  ('Vraj Shialeshbhai Tala', '9409763166'),
  ('Yash Sanjaybhai Dobariya', '9510115450'),
  ('Manthan Manishbhai Dobariya', '8141608335'),
  ('Ruchik Tala', '6353740734'),
  ('Ruchit Vipulbhai Dhaduk', '8866535215'),
  ('Devarsh Dharmeshbai Shingala', '9316216314'),
  ('Harsh Balkrushnabhai Bhanderi', '9106793522'),
  ('Kunal Gardgibhai Tilva', '7874474374'),
  ('Mahek Bipinbhai Sidapara', '9377637071'),
  ('Param Dipakbhai Patel', '7622048196'),
  ('Pedhaiya Khodidas', '9274132041'),
  ('Priyank Dineshbhai Dholaroya', '7862945814'),
  ('Ravi Jayantibhai Undhad', '9727510844'),
  ('Ridham Jayeshbhai Dobariya', '9313080043'),
  ('Rohan Chandubhai Dobariya', '9023753326'),
  ('Ronak Jentibhai Bhanderi', '8849898862'),
  ('Rudra Gopalbhai Barvadiya', '9727698642'),
  ('Rushil Ashokbhai Gadhiya', '6353324061'),
  ('Rutvik Dhanjibhai Dholariya', '7777937668'),
  ('Tilak Harishbhai Sojitra', '7990707743'),
  ('Tushar Gandubhai Kakadiya', '7600883034'),
  ('Yagna Jayantibhai Khatrani', '8329335682'),
  ('Heet pravinbhai ghadiya', '8320588105'),
  ('Sagar Thummar', '9727861928'),
  ('Shoham Vora', '9033723734'),
  ('Smit Korat', '7016956979'),
  ('Yash Kareliya', '9824411640'),
  ('JayKrushna Talapada', '8320699209'),
  ('Darsh Gajipara', '9727337130'),
  ('Takshay Bhanderi', '7046335237'),
  ('Viraj Ajudiya', '7575888448'),
  ('Milan Gajera', '9664888914'),
  ('Meet Gajera', '9664888914'),
  ('Kirtan Aambaliya', '7990073648'),
  ('Bhargav Gajera', '7046444895'),
  ('Mayur khunt', '7984566822'),
  ('Harsh Kotadiya', '9824450622'),
  ('Shyam Limbasiya', '9512805348'),
  ('Yagnik Vekariya', '7990221834'),
  ('hardik Vaghasiya', '7016382115'),
  ('Uttam Vasoya', '8849065354'),
  ('Dishant Dholakiya', '9714853250'),
  ('Rudra Radadiya', '8799650795'),
  ('Rushil Ghelani', '8320371936'),
  ('Granth Dhebariya', '9979260447'),
  ('Garva Savaliya', '9726686920'),
  ('Jaydip Khunt', '7874486044'),
  ('Vedant Gondaliya', '9274029991')
) as v(name, contact_number)
where not exists (
  select 1 from users u where u.contact_number = v.contact_number
);
