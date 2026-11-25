-- Local test data only. Never run against a real database.
insert into "user"(id,name,username,email,"emailVerified",role,gender,plan,verified)
values ('u1','Test Seller','seller1','seller1@test.landil.dev',true,'seller',true,'pro',true) on conflict do nothing;
-- Passwords made by v1's better-auth 1.3.32 hashPassword. seller1 / seller1-password;
-- banned1 / banned-password is banned (sign-in must give 403).
insert into "user"(id,name,username,email,"emailVerified",role,gender,banned)
values ('u2','Banned Buyer','banned1','banned1@test.landil.dev',true,'buyer',false,true) on conflict do nothing;
insert into account(id,"accountId","providerId","userId",password) values
 ('a1','u1','credential','u1','8326763815ce8bb4f0fba398ea0da295:f7438f2a37cf9fd4f96a2acc8dfc21785c93613b49d0eda3acbe51a6192d6f260d3fc49b1d2b225fbf9e71332d03e288abe51a1fd52f61b2fd902000a2f2f961'),
 ('a2','u2','credential','u2','0f384cfbf5244019e3c1575fcb3a7fdf:517eea6306e7a3a9990920a9d35d47935a3e76339bd5804bb3f5d6f398ba03bacf6b08a5e612ebc16eea438ce364c99171275aca5eb4b9aebd0a359cd6d73001')
on conflict do nothing;
insert into listings.listing(id,user_id,status,property_type,title,asking_price,lot_area,city,province,description,title_type,created_at)
select 'l'||g, 'u1', case when g%5=0 then 'draft' else 'published' end,
  (array['Lot / Land','House & Lot','Condo unit','Commercial','Farm lot'])[1+g%5],
  'Test listing number '||g, 500000*g, (100+g*10)||' sqm',
  (array['Cebu City','Davao City','Quezon City'])[1+g%3], (array['Cebu','Davao del Sur','Metro Manila'])[1+g%3],
  'A test description that is long enough for listing '||g, 'TCT', now() - (g||' hours')::interval
from generate_series(1,45) g on conflict do nothing;
insert into listings.listing_photo(id,listing_id,url,key,cover)
select 'p'||g,'l'||g,'https://picsum.photos/seed/landil'||g||'/640/480','k'||g,true from generate_series(1,45) g where g <> 3 on conflict do nothing;
-- l1 has 6 photos (gallery, counter, viewer); l3 has none (empty state).
insert into listings.listing_photo(id,listing_id,url,key,cover)
select 'p1-'||g,'l1','https://picsum.photos/seed/landil1-'||g||'/1280/960','k1-'||g,false from generate_series(2,6) g on conflict do nothing;
insert into listings.listing_doc(id,listing_id,url,key,name,visibility) values
 ('d1','l1','https://example.com/public.pdf','dk1','Tax declaration.pdf','public'),
 ('d2','l1','https://example.com/secret.pdf','dk2','TCT scan.pdf','private') on conflict do nothing;
