insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', '059b89cf-0417-4692-abdf-cb065496ea4c', 'authenticated', 'authenticated', 'test@kyh.io', '$2a$10$pbq2o5WRV0xvI/T7BeqFSOxUI7uNtNtdp0GiZQ8IJ.MRAIa4zUWwu', '2022-12-15 17:36:17.018386+00', null, '', NULL, '', null, '', '', null, '2022-12-15 17:36:17.020686+00', '{"provider": "email", "providers": ["email"]}', '{}', null, '2022-12-15 17:36:17.013909+00', '2022-12-15 18:36:07.166183+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', '3dacd099-052e-461f-a17d-e62ed50a6c4e', 'authenticated', 'authenticated', 'test-role-update@kyh.io', '$2a$10$KSehv2/PssjvSUqB4smY9.6vWlI/tvhlmHRczIwhdFJpWTpsOG9Ri', '2022-12-15 18:51:25.853536+00', null, '', NULL, '', null, '', '', null, '2022-12-15 18:51:25.855583+00', '{"provider": "email", "providers": ["email"]}', '{}', null, '2022-12-15 18:51:25.850698+00', '2022-12-15 18:51:25.857091+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', '34fac252-fd02-4bb9-bdf2-3492aab4e211', 'authenticated', 'authenticated', 'remove-member@kyh.io', '$2a$10$pTqWFMmLe48wVcJ1npV2beKuDk7tvD85aB0Irs1fWz/iD2laka7/K', '2022-12-15 18:52:57.13413+00', null, '', NULL, '', null, '', '', null, '2022-12-15 18:52:57.136098+00', '{"provider": "email", "providers": ["email"]}', '{}',  null, '2022-12-15 18:52:57.131611+00', '2022-12-15 18:52:57.137297+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', '337ad11f-42c1-4ab8-844d-961aa13d154b', 'authenticated', 'authenticated', 'test-remove@kyh.io', '$2a$10$r4nX/nhS7i9dg1uVyaJle.fUnfgcPzocdQG/NeVkLDnkk2CNJ0otu', '2022-12-15 19:12:34.109233+00', null, '', NULL, '', null, '', '', null, '2022-12-15 19:12:34.114223+00', '{"provider": "email", "providers": ["email"]}', '{}', null, '2022-12-15 19:12:34.106689+00', '2022-12-15 19:12:34.115815+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', 'b2e506f1-0ff6-43de-8437-67a870564ab2', 'authenticated', 'authenticated', 'test-transfer-ownership@kyh.io', '$2a$10$4o6tnJiJvagTnK5pucC40eF2R9yy1j87PRJ9Ld.kE3g.fCAivj4zS', '2022-12-15 19:24:42.345467+00', null, '', NULL, '', null, '', '', null, '2022-12-15 19:24:42.347755+00', '{"provider": "email", "providers": ["email"]}', '{}', null, '2022-12-15 19:24:42.341975+00', '2022-12-15 19:24:42.349475+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.users
  values ('00000000-0000-0000-0000-000000000000', '2b4a6624-7118-4551-8f0f-6b753e32e139', 'authenticated', 'authenticated', 'test2@kyh.io', '$2a$10$qnNMdqnF6hipOVe9sN.rXu7nK2bFcNzyu5GLzHKZpG9CA7kObkcbi', '2022-12-15 19:24:42.345467+00', null, '', NULL, '', null, '', '', null, '2022-12-15 19:24:42.347755+00', '{"provider": "email", "providers": ["email"]}', '{}', null, '2022-12-15 19:24:42.341975+00', '2022-12-15 19:24:42.349475+00', null, null,
    '', '', null, default, '', 0, NULL, '', null);

insert into auth.identities (id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at) values (
    '059b89cf-0417-4692-abdf-cb065496ea4c', 'email', '059b89cf-0417-4692-abdf-cb065496ea4c', '{}', '2022-12-15 19:24:42.345467+00', '2022-12-15 19:24:42.345467+00', '2022-12-15 19:24:42.345467+00'
);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('2b4a6624-7118-4551-8f0f-6b753e32e139', null, null, true);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('059b89cf-0417-4692-abdf-cb065496ea4c', null, null, true);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('3dacd099-052e-461f-a17d-e62ed50a6c4e', null, null, true);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('34fac252-fd02-4bb9-bdf2-3492aab4e211', null, null, true);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('337ad11f-42c1-4ab8-844d-961aa13d154b', null, null, true);

insert into public.users (id, display_name, photo_url, onboarded)
  values ('b2e506f1-0ff6-43de-8437-67a870564ab2', null, null, true);

insert into public.organizations (id, name, logo_url) OVERRIDING system VALUE
  values (6, 'IndieCorp', null);

insert into public.organizations (id, name, logo_url) OVERRIDING system VALUE
  values (7, 'Test', null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (7, '2b4a6624-7118-4551-8f0f-6b753e32e139', 7, 2, null, null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (8, '059b89cf-0417-4692-abdf-cb065496ea4c', 6, 2, null, null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (9, null, 6, 0, 'invited-member@kyh.io', 'P2d6khWwRJddMPKK');

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (10, '3dacd099-052e-461f-a17d-e62ed50a6c4e', 6, 0, null, null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (11, '34fac252-fd02-4bb9-bdf2-3492aab4e211', 6, 0, null, null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (12, null, 6, 0, 'user-invite-email-pwd@kyh.io', 'yB0kEPZCljLIsg4a');

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (13, null, 6, 0, 'test2@kyh.io', '89Mu5Q42DjzIWvyc');

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (14, null, 6, 0, 'invite-delete@kyh.io', 't6AuNGl7JYbFYLCM');

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (15, '337ad11f-42c1-4ab8-844d-961aa13d154b', 6, 0, null, null);

insert into public.memberships (id, user_id, organization_id, role, invited_email, code) OVERRIDING system VALUE
  values (16, 'b2e506f1-0ff6-43de-8437-67a870564ab2', 6, 0, null, null);

SELECT setval('organizations_id_seq', COALESCE((SELECT MAX(id)+1 FROM organizations), 1), false);
SELECT setval('memberships_id_seq', COALESCE((SELECT MAX(id)+1 FROM memberships), 1), false);