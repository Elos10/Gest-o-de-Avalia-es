-- Execute once in Supabase SQL Editor after creating the first Auth user.
-- Replace the values before execution. Never expose this script with real credentials.
do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- auth.users.id
  v_org_id uuid;
begin
  if not exists (select 1 from auth.users where id=v_user_id) then
    raise exception 'Crie o usuário no Supabase Auth e informe seu UUID.';
  end if;
  insert into public.organizations(name) values ('Minha Secretaria de Educação') returning id into v_org_id;
  insert into public.profiles(id,organization_id,name,role,active)
  values (v_user_id,v_org_id,'Administrador','ADMIN',true);
end $$;
