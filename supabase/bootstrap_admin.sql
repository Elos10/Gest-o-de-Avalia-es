-- Execute no Supabase SQL Editor depois de criar e confirmar o usuário no Auth.
-- Este script é idempotente e nunca armazena a senha do usuário.
do $$
declare
  v_admin_email text := 'detic@uberabadigital.com.br';
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email)=lower(v_admin_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário % não encontrado no Supabase Auth.', v_admin_email;
  end if;

  select id into v_org_id
  from public.organizations
  where name='Secretaria Municipal de Educação de Uberaba'
  order by created_at
  limit 1;

  if v_org_id is null then
    insert into public.organizations(name)
    values ('Secretaria Municipal de Educação de Uberaba')
    returning id into v_org_id;
  end if;

  insert into public.profiles(id,organization_id,name,role,active)
  values (v_user_id,v_org_id,'Administrador DETIC','ADMIN',true)
  on conflict (id) do update set
    organization_id=excluded.organization_id,
    name=excluded.name,
    role='ADMIN',
    active=true;
end $$;
