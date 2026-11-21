-- Alagoas Mobilidade: autenticação, perfis e aprovação de motoristas
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text not null default '',
  account_type text not null check (account_type in ('passenger', 'driver')),
  driver_status text not null default 'not_applicable'
    check (driver_status in ('not_applicable', 'pending', 'approved', 'rejected')),
  vehicle_info text not null default '',
  created_at timestamptz not null default now(),
  constraint profile_driver_status_matches_type check (
    (account_type = 'driver' and driver_status in ('pending','approved','rejected')) or
    (account_type = 'passenger' and driver_status = 'not_applicable')
  )
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_type text;
begin
  chosen_type := case
    when new.raw_user_meta_data ->> 'account_type' = 'driver' then 'driver'
    else 'passenger'
  end;
  insert into public.profiles (id, full_name, email, phone, account_type, driver_status, vehicle_info)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    chosen_type,
    case when chosen_type = 'driver' then 'pending' else 'not_applicable' end,
    coalesce(new.raw_user_meta_data ->> 'vehicle_info', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_alagoas on auth.users;
create trigger on_auth_user_created_alagoas
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_driver_status(p_driver_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar ou rejeitar motoristas.';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Status inválido.';
  end if;
  update public.profiles
     set driver_status = p_status
   where id = p_driver_id and account_type = 'driver';
  if not found then
    raise exception 'Cadastro de motorista não encontrado.';
  end if;
end;
$$;

revoke all on function public.set_driver_status(uuid, text) from public;
grant execute on function public.set_driver_status(uuid, text) to authenticated;
