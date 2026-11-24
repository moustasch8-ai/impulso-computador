-- Alagoas Mobilidade: caronas interestaduais e reservas
-- Aplicada no projeto Supabase lmddodyzurpxswvnfsnv em 2026-11-24.
-- Requer a tabela public.profiles existente e Supabase Auth habilitado.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists vehicle_info text,
  add column if not exists driver_status text not null default 'not_driver'
    check (driver_status in ('not_driver','pending','approved','rejected'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_role text;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'driver' then 'driver' else 'passenger' end;
  insert into public.profiles (id,full_name,role,role_requested,phone,vehicle_info,driver_status)
  values (new.id,coalesce(new.raw_user_meta_data ->> 'full_name',''),'passenger',requested_role,
    nullif(new.raw_user_meta_data ->> 'phone',''),nullif(new.raw_user_meta_data ->> 'vehicle_info',''),
    case when requested_role='driver' then 'pending' else 'not_driver' end)
  on conflict (id) do update set full_name=excluded.full_name,role_requested=excluded.role_requested,
    phone=excluded.phone,vehicle_info=excluded.vehicle_info,driver_status=excluded.driver_status;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

create table if not exists public.ride_offers (
 id uuid primary key default gen_random_uuid(),
 driver_id uuid not null references auth.users(id) on delete cascade,
 driver_name text not null default 'Motorista',
 origin_city text not null, origin_state text not null default 'AL', origin_address text,
 destination_city text not null, destination_state text not null, destination_address text,
 departure_at timestamptz not null,
 seats_total integer not null check(seats_total between 1 and 8),
 seats_available integer not null check(seats_available between 0 and 8),
 price_per_seat numeric(10,2) not null check(price_per_seat>=0),
 vehicle_description text, notes text,
 status text not null default 'published' check(status in ('published','full','departed','completed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(seats_available<=seats_total),
 check(origin_city<>destination_city or origin_state<>destination_state)
);
create index if not exists ride_offers_search_idx on public.ride_offers(departure_at,origin_state,destination_state,status);
create index if not exists ride_offers_driver_idx on public.ride_offers(driver_id,departure_at desc);

create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 ride_offer_id uuid not null references public.ride_offers(id) on delete cascade,
 passenger_id uuid not null references auth.users(id) on delete cascade,
 seats integer not null check(seats between 1 and 8),
 unit_price numeric(10,2) not null check(unit_price>=0),
 total_amount numeric(10,2) not null check(total_amount>=0),
 status text not null default 'pending_payment' check(status in ('pending_payment','confirmed','cancelled','completed','refunded')),
 passenger_note text, expires_at timestamptz not null default(now()+interval '15 minutes'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bookings_passenger_idx on public.bookings(passenger_id,created_at desc);
create index if not exists bookings_offer_idx on public.bookings(ride_offer_id,status);
create unique index if not exists bookings_active_passenger_offer_uidx on public.bookings(ride_offer_id,passenger_id)
 where status in ('pending_payment','confirmed');

create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null unique references public.bookings(id) on delete cascade,
 payer_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'mercado_pago',
 provider_payment_id text unique, checkout_url text,
 payment_method text not null check(payment_method in ('pix','card')),
 amount numeric(10,2) not null check(amount>=0),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','refunded')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 target_user_id uuid not null references auth.users(id) on delete cascade,
 rating integer not null check(rating between 1 and 5), comment text,
 created_at timestamptz not null default now(),
 unique(booking_id,author_id), check(author_id<>target_user_id)
);
create index if not exists reviews_target_idx on public.reviews(target_user_id,created_at desc);

alter table public.ride_offers enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
drop policy if exists "Ride offers visible to signed in users" on public.ride_offers;
create policy "Ride offers visible to signed in users" on public.ride_offers for select to authenticated
 using(status in ('published','full','departed','completed') or driver_id=(select auth.uid()));
drop policy if exists "Approved drivers publish offers" on public.ride_offers;
create policy "Approved drivers publish offers" on public.ride_offers for insert to authenticated
 with check(driver_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='driver' and p.driver_status='approved'));
drop policy if exists "Drivers manage own offers" on public.ride_offers;
create policy "Drivers manage own offers" on public.ride_offers for update to authenticated
 using(driver_id=(select auth.uid())) with check(driver_id=(select auth.uid()));
drop policy if exists "Drivers delete own offers" on public.ride_offers;
create policy "Drivers delete own offers" on public.ride_offers for delete to authenticated using(driver_id=(select auth.uid()));

drop policy if exists "Passengers and offer drivers read bookings" on public.bookings;
create policy "Passengers and offer drivers read bookings" on public.bookings for select to authenticated
 using(passenger_id=(select auth.uid()) or exists(select 1 from public.ride_offers o where o.id=ride_offer_id and o.driver_id=(select auth.uid())));
drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments for select to authenticated using(payer_id=(select auth.uid()));
drop policy if exists "Users read reviews" on public.reviews;
create policy "Users read reviews" on public.reviews for select to authenticated using(true);
drop policy if exists "Eligible users create reviews" on public.reviews;
create policy "Eligible users create reviews" on public.reviews for insert to authenticated with check(
 author_id=(select auth.uid()) and exists(select 1 from public.bookings b join public.ride_offers o on o.id=b.ride_offer_id
 where b.id=booking_id and b.status='completed' and
 ((b.passenger_id=(select auth.uid()) and o.driver_id=target_user_id) or (o.driver_id=(select auth.uid()) and b.passenger_id=target_user_id)))
);

revoke update on public.profiles from authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated
 using((auth.jwt()->'app_metadata'->>'role')='admin');

create or replace function public.reserve_ride(p_offer_id uuid,p_seats integer,p_note text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare offer public.ride_offers%rowtype; new_booking_id uuid;
begin
 if auth.uid() is null then raise exception 'É necessário entrar na conta.'; end if;
 if p_seats<1 or p_seats>8 then raise exception 'Quantidade de assentos inválida.'; end if;
 select * into offer from public.ride_offers where id=p_offer_id for update;
 if not found or offer.status<>'published' then raise exception 'Esta carona não está disponível.'; end if;
 if offer.driver_id=auth.uid() then raise exception 'Você não pode reservar sua própria carona.'; end if;
 if offer.seats_available<p_seats then raise exception 'Não há assentos suficientes.'; end if;
 if exists(select 1 from public.bookings where ride_offer_id=p_offer_id and passenger_id=auth.uid() and status<>'cancelled') then raise exception 'Você já possui uma reserva nesta carona.'; end if;
 insert into public.bookings(ride_offer_id,passenger_id,seats,unit_price,total_amount,passenger_note)
 values(p_offer_id,auth.uid(),p_seats,offer.price_per_seat,offer.price_per_seat*p_seats,nullif(p_note,'')) returning id into new_booking_id;
 update public.ride_offers set seats_available=seats_available-p_seats,
  status=case when seats_available-p_seats=0 then 'full' else 'published' end,updated_at=now() where id=p_offer_id;
 return new_booking_id;
end;
$$;
revoke all on function public.reserve_ride(uuid,integer,text) from public,anon;
grant execute on function public.reserve_ride(uuid,integer,text) to authenticated;

create or replace function public.expire_pending_bookings()
returns integer language plpgsql security definer set search_path=''
as $$
declare expired_count integer;
begin
 if auth.uid() is null then raise exception 'É necessário entrar na conta.'; end if;
 with expired as (
  update public.bookings set status='cancelled',updated_at=now()
  where status='pending_payment' and expires_at<now() returning ride_offer_id,seats
 ), totals as(select ride_offer_id,sum(seats)::integer as seats from expired group by ride_offer_id)
 update public.ride_offers o set seats_available=least(o.seats_total,o.seats_available+totals.seats),
  status=case when o.status='full' then 'published' else o.status end,updated_at=now()
 from totals where o.id=totals.ride_offer_id and o.status in ('published','full');
 get diagnostics expired_count=row_count;
 return expired_count;
end;
$$;
revoke all on function public.expire_pending_bookings() from public,anon;
grant execute on function public.expire_pending_bookings() to authenticated;

create or replace function public.set_driver_status(p_driver_id uuid,p_status text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if (auth.jwt()->'app_metadata'->>'role') is distinct from 'admin' then raise exception 'Acesso restrito à administração.'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Status inválido.'; end if;
 update public.profiles set driver_status=p_status,role=case when p_status='approved' then 'driver' else 'passenger' end
 where id=p_driver_id and role_requested='driver';
 if not found then raise exception 'Cadastro de motorista não encontrado.'; end if;
end;
$$;
revoke all on function public.set_driver_status(uuid,text) from public,anon;
grant execute on function public.set_driver_status(uuid,text) to authenticated;

grant select,insert,update,delete on public.ride_offers to authenticated;
grant select on public.bookings,public.payments to authenticated;
grant select,insert on public.reviews to authenticated;
