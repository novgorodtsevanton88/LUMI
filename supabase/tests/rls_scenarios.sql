\set ON_ERROR_STOP 0
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001','mama@ex.com'),('bbbbbbbb-0000-0000-0000-000000000002','tato@ex.com'),('cccccccc-0000-0000-0000-000000000003','stranger@ex.com');
select count(*) as profiles_auto from public.profiles;

-- A створює дитину
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.children (id, name, birth_date, sex) values ('11111111-0000-0000-0000-000000000001','Марта','2026-03-10','female');
select 'A sees child' t, count(*) from public.children;
select 'A owner row' t, role from public.family_members;
insert into public.sleep_sessions (id, child_id, kind, started_at, ended_at) values ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','nap','2026-11-04 09:00+02','2026-11-04 10:10+02');
-- другий активний сон: перший ок, другий має впасти
insert into public.sleep_sessions (child_id, kind, started_at) values ('11111111-0000-0000-0000-000000000001','nap','2026-11-04 12:00+02');
\echo '--- expect unique violation:'
insert into public.sleep_sessions (child_id, kind, started_at) values ('11111111-0000-0000-0000-000000000001','nap','2026-11-04 12:05+02');
-- застаріле оновлення ігнорується
update public.sleep_sessions set comment='new', client_updated_at='2026-11-04 11:00+02' where id='22222222-0000-0000-0000-000000000001';
update public.sleep_sessions set comment='stale', client_updated_at='2026-11-04 10:30+02' where id='22222222-0000-0000-0000-000000000001';
select 'LWW keeps newer' t, comment, version from public.sleep_sessions where id='22222222-0000-0000-0000-000000000001';
\echo '--- expect immutable child_id error:'
update public.sleep_sessions set child_id='99999999-0000-0000-0000-000000000009', client_updated_at=now() where id='22222222-0000-0000-0000-000000000001';
-- запрошення B
insert into public.family_invitations (child_id, email, token_hash) values ('11111111-0000-0000-0000-000000000001','tato@ex.com', encode(extensions.digest('secret-token','sha256'),'hex'));
reset role;

-- C (сторонній) нічого не бачить і не може писати
set role authenticated; set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003'; set request.jwt.claims = '{"email":"stranger@ex.com"}';
select 'C sees children' t, count(*) from public.children;
select 'C sees sleep' t, count(*) from public.sleep_sessions;
select 'C sees invitations' t, count(*) from public.family_invitations;
\echo '--- expect RLS violation (C insert sleep):'
insert into public.sleep_sessions (child_id, kind, started_at, ended_at) values ('11111111-0000-0000-0000-000000000001','nap','2026-11-03 09:00+02','2026-11-03 10:00+02');
\echo '--- expect wrong email error (C uses token):'
select public.accept_family_invitation('secret-token');
\echo '--- expect no access to members insert:'
insert into public.family_members (child_id, user_id, role) values ('11111111-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000003','member');
update public.sleep_sessions set comment='hack', client_updated_at=now() + interval '1 day';
select 'C hacked rows' t, count(*) from public.sleep_sessions where comment='hack';
reset role;

-- B приймає запрошення
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002'; set request.jwt.claims = '{"email":"tato@ex.com"}';
select 'B before' t, count(*) from public.sleep_sessions;
select public.accept_family_invitation('secret-token') as joined_child;
select 'B after' t, count(*) from public.sleep_sessions;
select 'B sees family' t, count(*) from public.family_members;
select 'B sees A profile' t, count(*) from public.profiles;
\echo '--- expect error: token reused'
select public.accept_family_invitation('secret-token');
\echo '--- B cannot delete owner row (0 rows):'
delete from public.family_members where role='owner';
\echo '--- B cannot hard-delete sleep (0 rows):'
delete from public.sleep_sessions;
-- storage
insert into storage.objects (bucket_id, name) values ('child-media','11111111-0000-0000-0000-000000000001/photo.jpg');
\echo '--- expect storage RLS violation (foreign folder):'
insert into storage.objects (bucket_id, name) values ('child-media','99999999-0000-0000-0000-000000000009/x.jpg');
reset role;

-- A відкликає доступ B
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.family_members where user_id='bbbbbbbb-0000-0000-0000-000000000002';
reset role;
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select 'B after revoke' t, count(*) from public.sleep_sessions;
select 'B storage after revoke' t, count(*) from storage.objects;
reset role;
\echo '--- anon sees nothing:'
set role anon; select count(*) from public.children;
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.growth_measurements (id, child_id, measured_on, weight_g, client_updated_at) values ('33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','2026-11-01',5200,'2026-11-01 10:00+02');
update public.growth_measurements set comment='newer', client_updated_at='2026-11-02 10:00+02' where id='33333333-0000-0000-0000-000000000001';
update public.growth_measurements set comment='stale', client_updated_at='2026-11-01 12:00+02' where id='33333333-0000-0000-0000-000000000001';
select comment, version, server_seq > 0 as has_seq from public.growth_measurements;
\echo '--- soft delete by member is an update; check constraint test (no values):'
insert into public.growth_measurements (child_id, measured_on) values ('11111111-0000-0000-0000-000000000001','2026-11-01');
