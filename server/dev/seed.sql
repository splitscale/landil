-- Local test data only. Never run against a real database.
insert into "user"(id,name,username,email,"emailVerified",role,gender,plan,verified)
values ('u1','Test Seller','seller1','seller1@test.landil.dev',true,'seller',true,'pro',true) on conflict do nothing;
insert into listings.listing(id,user_id,status,property_type,title,asking_price,lot_area,city,province,description,title_type,created_at)
select 'l'||g, 'u1', case when g%5=0 then 'draft' else 'published' end,
  (array['Lot / Land','House & Lot','Condo unit','Commercial','Farm lot'])[1+g%5],
  'Test listing number '||g, 500000*g, (100+g*10)||' sqm',
  (array['Cebu City','Davao City','Quezon City'])[1+g%3], (array['Cebu','Davao del Sur','Metro Manila'])[1+g%3],
  'A test description that is long enough for listing '||g, 'TCT', now() - (g||' hours')::interval
from generate_series(1,45) g on conflict do nothing;
insert into listings.listing_photo(id,listing_id,url,key,cover)
select 'p'||g,'l'||g,'https://picsum.photos/seed/landil'||g||'/640/480','k'||g,true from generate_series(1,45) g on conflict do nothing;
insert into listings.listing_doc(id,listing_id,url,key,name,visibility) values
 ('d1','l1','https://example.com/public.pdf','dk1','Tax declaration.pdf','public'),
 ('d2','l1','https://example.com/secret.pdf','dk2','TCT scan.pdf','private') on conflict do nothing;
