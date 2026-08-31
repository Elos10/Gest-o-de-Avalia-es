-- Execute este arquivo inteiro no Supabase SQL Editor depois das migrations.
-- O comando pode ser repetido e nunca armazena a senha do usuário.

with
admin_user as materialized (
  select id
  from auth.users
  where lower(email) = lower('detic@uberabadigital.com.br')
  limit 1
),
existing_org as materialized (
  select id
  from public.organizations
  where name = 'Secretaria Municipal de Educação de Uberaba'
  order by created_at
  limit 1
),
inserted_org as materialized (
  insert into public.organizations (id, name)
  select gen_random_uuid(), 'Secretaria Municipal de Educação de Uberaba'
  where not exists (select 1 from existing_org)
  returning id
),
admin_org as materialized (
  select id from existing_org
  union all
  select id from inserted_org
  limit 1
)
insert into public.profiles (id, organization_id, name, role, active)
select
  admin_user.id,
  admin_org.id,
  'Administrador DETIC',
  'ADMIN',
  true
from admin_user
cross join admin_org
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  role = 'ADMIN',
  active = true;

select
  u.email,
  p.role,
  p.active,
  o.name as organization
from auth.users u
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
where lower(u.email) = lower('detic@uberabadigital.com.br');
