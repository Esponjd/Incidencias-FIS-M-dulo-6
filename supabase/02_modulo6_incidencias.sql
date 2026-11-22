-- =====================================================================
-- LABFIS | MÓDULO 6 · GESTIÓN DE INCIDENCIAS Y REPARACIONES (Grupo 6)
-- Ejecutar en Supabase -> SQL Editor DESPUÉS de 01_base_demo.sql.
-- Script idempotente: se puede volver a ejecutar sin duplicar objetos.
-- Solo datos ficticios. No contiene claves, service_role ni contraseñas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Secuencia para el código legible INC-xxx
--    Los registros creados desde la app empiezan en INC-101; los códigos
--    INC-001 a INC-056 quedan reservados para el seed de pruebas (03).
-- ---------------------------------------------------------------------
create sequence if not exists public.incidencias_codigo_seq start with 101;

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------
create table if not exists public.incidencias (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique
                           default ('INC-' || lpad(nextval('public.incidencias_codigo_seq')::text, 3, '0')),
  descripcion            text not null check (char_length(trim(descripcion)) between 1 and 1000),
  equipo_ubicacion       text not null check (char_length(trim(equipo_ubicacion)) between 1 and 200),
  estado                 text not null default 'Pendiente'
                           check (estado in ('Pendiente', 'En reparación', 'Cerrada')),
  prioridad              text check (prioridad in ('Alta', 'Media', 'Baja')),
  responsable            text check (responsable is null or char_length(trim(responsable)) between 1 and 80),
  solicitante_nombre     text not null check (char_length(trim(solicitante_nombre)) between 1 and 120),
  solicitante_rol        text not null check (solicitante_rol in ('Docente', 'Estudiante')),
  actualizado_por        text,
  estado_actualizado_at  timestamptz,
  fecha_cierre           timestamptz,
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- HU-01 CA-04: no puede existir responsable sin prioridad.
  constraint incidencias_responsable_requiere_prioridad
    check (responsable is null or prioridad is not null),
  -- HU-05: una incidencia en reparación o cerrada debe tener responsable.
  constraint incidencias_en_curso_requiere_responsable
    check (estado = 'Pendiente' or responsable is not null),
  -- HU-05 CA-02: toda incidencia cerrada tiene fecha de cierre.
  constraint incidencias_cerrada_requiere_fecha
    check (estado <> 'Cerrada' or fecha_cierre is not null)
);

create table if not exists public.incidencia_actividades (
  id              uuid primary key default gen_random_uuid(),
  incidencia_id   uuid not null references public.incidencias(id) on delete cascade,
  descripcion     text not null check (char_length(trim(descripcion)) between 1 and 1000),
  autor_nombre    text not null check (char_length(trim(autor_nombre)) between 1 and 120),
  autor_rol       text not null check (autor_rol in ('Coordinador técnico', 'Técnico de soporte', 'Pasante')),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table if not exists public.incidencia_observaciones (
  id              uuid primary key default gen_random_uuid(),
  incidencia_id   uuid not null references public.incidencias(id) on delete cascade,
  actividad_id    uuid references public.incidencia_actividades(id) on delete set null,
  texto           text not null check (char_length(trim(texto)) between 1 and 1000),
  autor_nombre    text not null check (char_length(trim(autor_nombre)) between 1 and 120),
  autor_rol       text not null check (autor_rol in ('Coordinador técnico', 'Técnico de soporte', 'Pasante')),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table if not exists public.incidencia_evidencias (
  id              uuid primary key default gen_random_uuid(),
  incidencia_id   uuid not null references public.incidencias(id) on delete cascade,
  actividad_id    uuid references public.incidencia_actividades(id) on delete set null,
  origen          text not null check (origen in ('Reporte', 'Reparacion')),
  nombre_archivo  text not null check (char_length(trim(nombre_archivo)) between 1 and 255),
  extension       text not null check (extension in ('jpg', 'jpeg', 'png', 'pdf')),
  mime_type       text check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  tamano_bytes    bigint check (tamano_bytes is null or tamano_bytes between 1 and 5242880),
  storage_path    text,
  autor_nombre    text not null check (char_length(trim(autor_nombre)) between 1 and 120),
  autor_rol       text not null check (autor_rol in ('Coordinador técnico', 'Técnico de soporte', 'Pasante', 'Docente', 'Estudiante')),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table if not exists public.incidencia_historial_estados (
  id               uuid primary key default gen_random_uuid(),
  incidencia_id    uuid not null references public.incidencias(id) on delete cascade,
  estado_anterior  text check (estado_anterior is null or estado_anterior in ('Pendiente', 'En reparación', 'Cerrada')),
  estado_nuevo     text not null check (estado_nuevo in ('Pendiente', 'En reparación', 'Cerrada')),
  responsable      text not null,
  user_id          uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default clock_timestamp()
);

-- Índices para las consultas más frecuentes del módulo.
create index if not exists incidencias_estado_prioridad_idx on public.incidencias (estado, prioridad);
create index if not exists incidencias_responsable_idx on public.incidencias (responsable);
create index if not exists incidencia_actividades_inc_idx on public.incidencia_actividades (incidencia_id, created_at);
create index if not exists incidencia_observaciones_inc_idx on public.incidencia_observaciones (incidencia_id, created_at);
create index if not exists incidencia_evidencias_inc_idx on public.incidencia_evidencias (incidencia_id, created_at);
create index if not exists incidencia_historial_inc_idx on public.incidencia_historial_estados (incidencia_id, created_at);

-- ---------------------------------------------------------------------
-- 3. Reglas de negocio en triggers
-- ---------------------------------------------------------------------

-- 3.1 Antes de insertar/actualizar una incidencia.
create or replace function public.incidencias_antes_de_guardar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Desde la app (usuario autenticado) toda incidencia nace "Pendiente".
    -- El seed (SQL Editor, sin auth.uid()) puede crear escenarios de prueba.
    if auth.uid() is not null and new.estado <> 'Pendiente' then
      raise exception 'Una incidencia nueva debe registrarse en estado Pendiente';
    end if;
    if new.estado <> 'Pendiente' then
      new.estado_actualizado_at := coalesce(new.estado_actualizado_at, clock_timestamp());
    end if;
    return new;
  end if;

  new.updated_at := now();

  if new.estado is distinct from old.estado then
    if old.estado = 'Cerrada' then
      raise exception 'Una incidencia cerrada no se puede reabrir';
    end if;
    if new.estado = 'Cerrada' then
      if old.estado <> 'En reparación' then
        raise exception 'Solo se puede cerrar una incidencia que está En reparación';
      end if;
      -- HU-05 CA-03: no se cierra sin solución registrada.
      if not exists (select 1 from public.incidencia_observaciones o where o.incidencia_id = new.id)
         and not exists (select 1 from public.incidencia_evidencias e
                         where e.incidencia_id = new.id and e.origen = 'Reparacion') then
        raise exception 'Debe registrar la solución aplicada antes de cerrar la incidencia';
      end if;
      new.fecha_cierre := clock_timestamp();
    end if;
    new.estado_actualizado_at := clock_timestamp();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_incidencias_antes_de_guardar on public.incidencias;
create trigger trg_incidencias_antes_de_guardar
before insert or update on public.incidencias
for each row execute function public.incidencias_antes_de_guardar();

-- 3.2 Historial automático de estados (HU-05 CA-04).
--     SECURITY DEFINER: los usuarios no necesitan permiso de INSERT sobre
--     el historial, así nadie puede falsificarlo desde el navegador.
create or replace function public.incidencias_registrar_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.incidencia_historial_estados
      (incidencia_id, estado_anterior, estado_nuevo, responsable, user_id)
    values
      (new.id,
       case when tg_op = 'INSERT' then null else old.estado end,
       new.estado,
       coalesce(nullif(trim(new.actualizado_por), ''),
                case when tg_op = 'INSERT' then new.solicitante_nombre else 'Sistema' end),
       auth.uid());
  end if;
  return null;
end;
$$;

drop trigger if exists trg_incidencias_historial on public.incidencias;
create trigger trg_incidencias_historial
after insert or update of estado on public.incidencias
for each row execute function public.incidencias_registrar_historial();

-- 3.3 No se registran actividades en incidencias cerradas (HU-03 CA-04).
create or replace function public.actividades_validar_incidencia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.incidencias i where i.id = new.incidencia_id and i.estado = 'Cerrada') then
    raise exception 'No se pueden registrar actividades en una incidencia cerrada';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actividades_validar on public.incidencia_actividades;
create trigger trg_actividades_validar
before insert on public.incidencia_actividades
for each row execute function public.actividades_validar_incidencia();

-- 3.4 Una observación/evidencia vinculada a una actividad debe ser de la
--     misma incidencia (trazabilidad HU-04 CA-01).
create or replace function public.validar_actividad_misma_incidencia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.actividad_id is not null and not exists (
       select 1 from public.incidencia_actividades a
       where a.id = new.actividad_id and a.incidencia_id = new.incidencia_id) then
    raise exception 'La actividad vinculada no pertenece a esta incidencia';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_observaciones_actividad on public.incidencia_observaciones;
create trigger trg_observaciones_actividad
before insert on public.incidencia_observaciones
for each row execute function public.validar_actividad_misma_incidencia();

drop trigger if exists trg_evidencias_actividad on public.incidencia_evidencias;
create trigger trg_evidencias_actividad
before insert on public.incidencia_evidencias
for each row execute function public.validar_actividad_misma_incidencia();

-- ---------------------------------------------------------------------
-- 4. Permisos (GRANT mínimos). Evitan el error 42501 "permission denied".
-- ---------------------------------------------------------------------
revoke all on table public.incidencias, public.incidencia_actividades, public.incidencia_observaciones,
  public.incidencia_evidencias, public.incidencia_historial_estados from anon;
revoke all on sequence public.incidencias_codigo_seq from anon;

grant usage on schema public to authenticated;

grant select on table public.incidencias to authenticated;
grant insert (descripcion, equipo_ubicacion, solicitante_nombre, solicitante_rol, actualizado_por, user_id)
  on table public.incidencias to authenticated;
grant update (prioridad, responsable, estado, actualizado_por)
  on table public.incidencias to authenticated;

grant select, insert on table public.incidencia_actividades to authenticated;
grant select, insert on table public.incidencia_observaciones to authenticated;
grant select, insert on table public.incidencia_evidencias to authenticated;
grant select on table public.incidencia_historial_estados to authenticated;

-- El DEFAULT del código usa nextval(): el rol necesita la secuencia.
grant usage, select on sequence public.incidencias_codigo_seq to authenticated;

-- ---------------------------------------------------------------------
-- 5. Row Level Security
--    El módulo es colaborativo: el personal autenticado consulta todas las
--    incidencias (coordinador, técnicos y pasantes trabajan sobre las mismas).
--    Cada registro nuevo queda firmado con user_id = auth.uid().
--    No hay políticas DELETE: nadie puede borrar desde la app.
-- ---------------------------------------------------------------------
alter table public.incidencias enable row level security;
alter table public.incidencia_actividades enable row level security;
alter table public.incidencia_observaciones enable row level security;
alter table public.incidencia_evidencias enable row level security;
alter table public.incidencia_historial_estados enable row level security;

drop policy if exists "incidencias_select_autenticados" on public.incidencias;
create policy "incidencias_select_autenticados" on public.incidencias
  for select to authenticated using (true);

drop policy if exists "incidencias_insert_propias" on public.incidencias;
create policy "incidencias_insert_propias" on public.incidencias
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "incidencias_update_autenticados" on public.incidencias;
create policy "incidencias_update_autenticados" on public.incidencias
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

drop policy if exists "actividades_select_autenticados" on public.incidencia_actividades;
create policy "actividades_select_autenticados" on public.incidencia_actividades
  for select to authenticated using (true);

drop policy if exists "actividades_insert_propias" on public.incidencia_actividades;
create policy "actividades_insert_propias" on public.incidencia_actividades
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "observaciones_select_autenticados" on public.incidencia_observaciones;
create policy "observaciones_select_autenticados" on public.incidencia_observaciones
  for select to authenticated using (true);

drop policy if exists "observaciones_insert_propias" on public.incidencia_observaciones;
create policy "observaciones_insert_propias" on public.incidencia_observaciones
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "evidencias_select_autenticados" on public.incidencia_evidencias;
create policy "evidencias_select_autenticados" on public.incidencia_evidencias
  for select to authenticated using (true);

drop policy if exists "evidencias_insert_propias" on public.incidencia_evidencias;
create policy "evidencias_insert_propias" on public.incidencia_evidencias
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "historial_select_autenticados" on public.incidencia_historial_estados;
create policy "historial_select_autenticados" on public.incidencia_historial_estados
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 6. (OPCIONAL) Archivos en Supabase Storage
--    La app funciona SIN esto: guarda los metadatos de la evidencia en
--    incidencia_evidencias y avisa que el archivo no se subió.
--    Para guardar también el archivo, descomentar y ejecutar este bloque.
-- ---------------------------------------------------------------------
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('evidencias-incidencias', 'evidencias-incidencias', false, 5242880,
--         array['image/jpeg', 'image/png', 'application/pdf'])
-- on conflict (id) do nothing;
--
-- drop policy if exists "evidencias_storage_select" on storage.objects;
-- create policy "evidencias_storage_select" on storage.objects
--   for select to authenticated using (bucket_id = 'evidencias-incidencias');
--
-- drop policy if exists "evidencias_storage_insert" on storage.objects;
-- create policy "evidencias_storage_insert" on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'evidencias-incidencias' and (storage.foldername(name))[1] = (select auth.uid())::text);
