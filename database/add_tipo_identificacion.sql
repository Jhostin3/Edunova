-- Agregar tipo de identificacion sin romper datos existentes.
-- Ejecutar en Supabase SQL Editor antes de desplegar frontend/edge functions.

alter table public.estudiantes
add column if not exists tipo_identificacion text not null default 'cedula_ecuatoriana';

alter table public.representantes
add column if not exists tipo_identificacion text not null default 'cedula_ecuatoriana';

alter table public.personal
add column if not exists tipo_identificacion text not null default 'cedula_ecuatoriana';

alter table public.profiles
add column if not exists tipo_identificacion text not null default 'cedula_ecuatoriana';

update public.estudiantes
set tipo_identificacion = case
  when cedula ~ '^[0-9]{10}$' then 'cedula_ecuatoriana'
  else 'documento_extranjero'
end
where tipo_identificacion is null
  or tipo_identificacion = 'cedula_ecuatoriana';

update public.representantes
set tipo_identificacion = case
  when cedula ~ '^[0-9]{10}$' then 'cedula_ecuatoriana'
  else 'documento_extranjero'
end
where tipo_identificacion is null
  or tipo_identificacion = 'cedula_ecuatoriana';

update public.personal
set tipo_identificacion = case
  when cedula ~ '^[0-9]{10}$' then 'cedula_ecuatoriana'
  else 'documento_extranjero'
end
where tipo_identificacion is null
  or tipo_identificacion = 'cedula_ecuatoriana';

update public.profiles
set tipo_identificacion = case
  when cedula ~ '^[0-9]{10}$' then 'cedula_ecuatoriana'
  else 'documento_extranjero'
end
where cedula is not null
  and (
    tipo_identificacion is null
    or tipo_identificacion = 'cedula_ecuatoriana'
  );

alter table public.estudiantes
drop constraint if exists estudiantes_tipo_identificacion_check;
alter table public.estudiantes
add constraint estudiantes_tipo_identificacion_check
check (tipo_identificacion in ('cedula_ecuatoriana', 'documento_extranjero'));

alter table public.representantes
drop constraint if exists representantes_tipo_identificacion_check;
alter table public.representantes
add constraint representantes_tipo_identificacion_check
check (tipo_identificacion in ('cedula_ecuatoriana', 'documento_extranjero'));

alter table public.personal
drop constraint if exists personal_tipo_identificacion_check;
alter table public.personal
add constraint personal_tipo_identificacion_check
check (tipo_identificacion in ('cedula_ecuatoriana', 'documento_extranjero'));

alter table public.profiles
drop constraint if exists profiles_tipo_identificacion_check;
alter table public.profiles
add constraint profiles_tipo_identificacion_check
check (tipo_identificacion in ('cedula_ecuatoriana', 'documento_extranjero'));
