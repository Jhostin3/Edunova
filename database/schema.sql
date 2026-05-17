-- Edunova: esquema inicial (roles + perfiles)
-- Ejecutar en Supabase -> SQL Editor (o migraciones).

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabla: roles
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id serial primary key,
  nombre text not null unique,
  descripcion text,
  created_at timestamptz not null default now()
);

comment on table public.roles is 'Roles del sistema (slug en nombre).';

-- ---------------------------------------------------------------------------
-- Tabla: profiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol_id integer not null references public.roles (id),
  email text,
  nombres text,
  apellidos text,
  telefono text,
  foto_url text,
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de usuario enlazado a Supabase Auth.';

create index if not exists profiles_rol_id_idx on public.profiles (rol_id);

-- ---------------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------------
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- Datos iniciales: roles
-- ---------------------------------------------------------------------------
insert into public.roles (nombre, descripcion) values
  ('admin_rectorado', 'Administracion y rectorado del sistema'),
  ('coordinador_clubes', 'Coordinacion de clubes'),
  ('guardia', 'Personal de guardia / control de acceso'),
  ('estudiante', 'Estudiante')
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------------
-- Perfil automatico al registrarse (rol estudiante por defecto)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid integer;
begin
  select r.id into rid
  from public.roles r
  where r.nombre = 'estudiante'
  limit 1;

  if rid is null then
    raise exception 'No existe el rol estudiante en public.roles';
  end if;

  insert into public.profiles (id, rol_id, email)
  values (new.id, rid, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and rol_id = (
    select p.rol_id
    from public.profiles p
    where p.id = auth.uid()
  )
  and estado = (
    select p.estado
    from public.profiles p
    where p.id = auth.uid()
  )
);

-- Nota: altas masivas / cambio de rol por admin suele hacerse con service_role
-- o politicas adicionales en una fase posterior.
