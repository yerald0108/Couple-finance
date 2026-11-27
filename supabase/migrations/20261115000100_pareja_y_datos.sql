-- =====================================================================================
-- CoupleFinance · Fase 8A · Pareja, miembros, tablas sincronizables y seguridad (RLS)
-- =====================================================================================
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Se ejecuta una sola vez.
--
-- Qué crea:
--   parejas / miembros ......... quién forma la pareja (máximo 2 cuentas) y su código para unirse.
--   sectores / movimientos /
--   repartos ................... los datos que se sincronizarán en la Fase 8B.
--   Funciones .................. crear_pareja, unir_pareja, mi_pareja, cambiar_mi_nombre.
--
-- Seguridad:
--   * RLS activado en TODAS las tablas: solo las 2 cuentas de una pareja ven y escriben sus datos.
--   * Nadie puede borrar filas (solo marcarlas como borradas con deleted_at).
--   * Las cuentas no tocan parejas/miembros directamente: solo usan las funciones de abajo.
-- =====================================================================================


-- ------------------------------------------------------------------------------------
-- 1) Pareja y miembros
-- ------------------------------------------------------------------------------------

create table public.parejas (
  id         uuid primary key default gen_random_uuid(),
  -- Código de 8 letras/números para que la segunda persona se una (sin 0, O, 1, I, L: se confunden).
  codigo     text not null unique
             check (codigo ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  -- Si algún día se borra la cuenta de quien la creó, la pareja y sus datos NO se borran.
  creada_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.miembros (
  user_id    uuid primary key references auth.users (id) on delete cascade,  -- una cuenta, una sola pareja
  pareja_id  uuid not null references public.parejas (id) on delete cascade,
  nombre     text not null check (nombre = btrim(nombre) and char_length(nombre) between 1 and 20),
  created_at timestamptz not null default now()
);

create index miembros_pareja_idx on public.miembros (pareja_id);
-- Los dos nombres de una pareja no pueden ser iguales (así las etiquetas "registrado por" no se confunden).
create unique index miembros_nombre_unico on public.miembros (pareja_id, lower(nombre));

-- Una pareja no puede tener más de 2 cuentas (garantía de la propia base, aunque alguien se salte las funciones).
create or replace function public.miembros_maximo_dos() returns trigger
language plpgsql as $$
begin
  perform 1 from public.parejas where id = new.pareja_id for update;  -- evita que dos se unan a la vez
  if (select count(*) from public.miembros where pareja_id = new.pareja_id) >= 2 then
    raise exception 'Esta pareja ya está completa.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger miembros_maximo_dos before insert on public.miembros
  for each row execute function public.miembros_maximo_dos();


-- ------------------------------------------------------------------------------------
-- 2) Ayudas de seguridad
-- ------------------------------------------------------------------------------------

-- Id de la pareja de la cuenta que hace la consulta (null si no tiene). Las políticas RLS la usan.
create or replace function public.mi_pareja_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select pareja_id from public.miembros where user_id = auth.uid()
$$;

-- Genera un código de pareja aleatorio con el alfabeto sin letras confusas.
create or replace function public.generar_codigo_pareja() returns text
language plpgsql volatile set search_path = public, pg_temp as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 caracteres
  v_bytes    bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');  -- 16 bytes aleatorios
  v_codigo   text := '';
  i          int;
begin
  for i in 0..7 loop
    v_codigo := v_codigo || substr(v_alfabeto, 1 + (get_byte(v_bytes, i) % 31), 1);
  end loop;
  return v_codigo;
end $$;


-- ------------------------------------------------------------------------------------
-- 3) Funciones que usa la app (crear pareja, unirse, ver mi pareja, cambiar mi nombre)
-- ------------------------------------------------------------------------------------

-- Crea la pareja de esta cuenta y devuelve su código para compartirlo.
create or replace function public.crear_pareja(p_nombre text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid    uuid := auth.uid();
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_codigo text;
  v_pareja uuid;
  v_intento int := 0;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para crear la pareja.' using errcode = '28000';
  end if;
  if char_length(v_nombre) not between 1 and 20 then
    raise exception 'El nombre debe tener entre 1 y 20 letras.' using errcode = '22023';
  end if;
  if exists (select 1 from public.miembros where user_id = v_uid) then
    raise exception 'Esta cuenta ya pertenece a una pareja.' using errcode = '23505';
  end if;

  loop
    v_intento := v_intento + 1;
    v_codigo := public.generar_codigo_pareja();
    begin
      insert into public.parejas (codigo, creada_por) values (v_codigo, v_uid) returning id into v_pareja;
      exit;
    exception when unique_violation then
      if v_intento >= 10 then
        raise exception 'No se pudo generar un código. Inténtalo otra vez.' using errcode = '55000';
      end if;
    end;
  end loop;

  insert into public.miembros (user_id, pareja_id, nombre) values (v_uid, v_pareja, v_nombre);
  return jsonb_build_object('pareja_id', v_pareja, 'codigo', v_codigo);
end $$;

-- Une esta cuenta a la pareja que tiene ese código (si todavía hay lugar).
create or replace function public.unir_pareja(p_codigo text, p_nombre text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid    uuid := auth.uid();
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g'));
  v_pareja uuid;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para unirte a la pareja.' using errcode = '28000';
  end if;
  if char_length(v_nombre) not between 1 and 20 then
    raise exception 'El nombre debe tener entre 1 y 20 letras.' using errcode = '22023';
  end if;
  if exists (select 1 from public.miembros where user_id = v_uid) then
    raise exception 'Esta cuenta ya pertenece a una pareja.' using errcode = '23505';
  end if;

  select id into v_pareja from public.parejas where codigo = v_codigo for update;
  if not found then
    raise exception 'Código no válido.' using errcode = 'P0002';
  end if;
  if (select count(*) from public.miembros where pareja_id = v_pareja) >= 2 then
    raise exception 'Esta pareja ya está completa.' using errcode = '23514';
  end if;
  if exists (select 1 from public.miembros where pareja_id = v_pareja and lower(nombre) = lower(v_nombre)) then
    raise exception 'Elige un nombre distinto al de tu pareja.' using errcode = '23505';
  end if;

  insert into public.miembros (user_id, pareja_id, nombre) values (v_uid, v_pareja, v_nombre);
  return jsonb_build_object('pareja_id', v_pareja, 'codigo', v_codigo);
end $$;

-- Devuelve mi pareja: su código y los miembros (con "soy_yo"). Devuelve null si todavía no tengo pareja.
create or replace function public.mi_pareja() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
           'pareja_id', p.id,
           'codigo', p.codigo,
           'miembros', (
             select jsonb_agg(
                      jsonb_build_object('user_id', m.user_id, 'nombre', m.nombre, 'soy_yo', m.user_id = auth.uid())
                      order by m.created_at, m.user_id)
               from public.miembros m
              where m.pareja_id = p.id))
    from public.parejas p
   where p.id = public.mi_pareja_id()
$$;

-- Cambia mi nombre dentro de la pareja.
create or replace function public.cambiar_mi_nombre(p_nombre text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid    uuid := auth.uid();
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
begin
  if v_uid is null then
    raise exception 'Inicia sesión para cambiar tu nombre.' using errcode = '28000';
  end if;
  if char_length(v_nombre) not between 1 and 20 then
    raise exception 'El nombre debe tener entre 1 y 20 letras.' using errcode = '22023';
  end if;
  begin
    update public.miembros set nombre = v_nombre where user_id = v_uid;
  exception when unique_violation then
    raise exception 'Elige un nombre distinto al de tu pareja.' using errcode = '23505';
  end;
  if not found then
    raise exception 'Todavía no perteneces a ninguna pareja.' using errcode = 'P0002';
  end if;
end $$;


-- ------------------------------------------------------------------------------------
-- 4) Tablas sincronizables (iguales a las del teléfono + pareja_id y server_updated_at)
--    Los ids son texto: los generan los teléfonos (y los sectores base tienen ids fijos),
--    por eso la clave es (pareja_id, id). No hay claves foráneas entre ellas a propósito:
--    offline las filas pueden llegar en cualquier orden.
-- ------------------------------------------------------------------------------------

create table public.sectores (
  pareja_id         uuid not null references public.parejas (id) on delete cascade,
  id                text not null,
  nombre            text not null,
  descripcion       text,
  tipo              text not null check (tipo in ('ingresos','gastos_fijos','gustos','ahorro','personalizado')),
  icono             text,
  color             text,
  activo            integer not null default 1 check (activo in (0, 1)),
  orden             integer not null default 0,
  created_at        timestamptz not null,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (pareja_id, id)
);

create table public.movimientos (
  pareja_id         uuid not null references public.parejas (id) on delete cascade,
  id                text not null,
  tipo              text not null,
  monto             numeric(14,2) not null check (monto > 0),
  forma             text not null check (forma in ('efectivo','transferencia','usd')),
  concepto          text,
  origen            text,
  sector_id         text not null,
  motivo_ahorro     text,
  es_salida_ahorro  integer not null default 0 check (es_salida_ahorro in (0, 1)),
  fecha             timestamptz not null,
  -- Quién lo registró: la cuenta (debe ser una de las 2 de la pareja, lo comprueba un trigger).
  registrado_por    uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (pareja_id, id)
);

create table public.repartos (
  pareja_id         uuid not null references public.parejas (id) on delete cascade,
  id                text not null,
  movimiento_id     text not null,
  sector_id         text not null,
  monto             numeric(14,2) not null check (monto > 0),
  created_at        timestamptz not null,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (pareja_id, id)
);

-- Para pedir "lo que cambió desde la última vez" (pull) rápido.
create index sectores_pull_idx    on public.sectores    (pareja_id, server_updated_at);
create index movimientos_pull_idx on public.movimientos (pareja_id, server_updated_at);
create index repartos_pull_idx    on public.repartos    (pareja_id, server_updated_at);

-- Antes de guardar cualquier fila sincronizable:
--   * server_updated_at = reloj del SERVIDOR (sirve para pedir "lo nuevo" sin depender del reloj de los teléfonos),
--   * updated_at no puede estar en el futuro (más de 5 min): un teléfono con el reloj adelantado ganaría siempre,
--   * pareja_id, id y created_at no se pueden cambiar en una actualización.
create or replace function public.sync_antes_de_escribir() returns trigger
language plpgsql as $$
begin
  new.server_updated_at := clock_timestamp();
  new.updated_at := least(new.updated_at, new.server_updated_at + interval '5 minutes');
  if tg_op = 'UPDATE' then
    new.pareja_id  := old.pareja_id;
    new.id         := old.id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

-- "Registrado por" solo puede ser una de las 2 cuentas de esa pareja (o vacío).
create or replace function public.movimientos_registrado_por_valido() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.registrado_por is not null
     and not exists (select 1 from public.miembros
                      where user_id = new.registrado_por and pareja_id = new.pareja_id) then
    raise exception 'registrado_por debe ser una de las cuentas de la pareja.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger sectores_sync    before insert or update on public.sectores
  for each row execute function public.sync_antes_de_escribir();
create trigger movimientos_sync before insert or update on public.movimientos
  for each row execute function public.sync_antes_de_escribir();
create trigger repartos_sync    before insert or update on public.repartos
  for each row execute function public.sync_antes_de_escribir();
create trigger movimientos_registrado_por before insert or update on public.movimientos
  for each row execute function public.movimientos_registrado_por_valido();


-- ------------------------------------------------------------------------------------
-- 5) Seguridad: RLS y permisos
-- ------------------------------------------------------------------------------------

alter table public.parejas     enable row level security;
alter table public.miembros    enable row level security;
alter table public.sectores    enable row level security;
alter table public.movimientos enable row level security;
alter table public.repartos    enable row level security;

-- Pareja y miembros: solo se pueden VER los de mi propia pareja. Se modifican únicamente con las funciones.
create policy parejas_ver  on public.parejas  for select to authenticated using (id = public.mi_pareja_id());
create policy miembros_ver on public.miembros for select to authenticated using (pareja_id = public.mi_pareja_id());

-- Datos: ver, crear y editar solo los de mi pareja. No hay política de borrado: no se puede borrar.
create policy sectores_ver        on public.sectores    for select to authenticated using (pareja_id = public.mi_pareja_id());
create policy sectores_crear      on public.sectores    for insert to authenticated with check (pareja_id = public.mi_pareja_id());
create policy sectores_editar     on public.sectores    for update to authenticated
  using (pareja_id = public.mi_pareja_id()) with check (pareja_id = public.mi_pareja_id());

create policy movimientos_ver     on public.movimientos for select to authenticated using (pareja_id = public.mi_pareja_id());
create policy movimientos_crear   on public.movimientos for insert to authenticated with check (pareja_id = public.mi_pareja_id());
create policy movimientos_editar  on public.movimientos for update to authenticated
  using (pareja_id = public.mi_pareja_id()) with check (pareja_id = public.mi_pareja_id());

create policy repartos_ver        on public.repartos    for select to authenticated using (pareja_id = public.mi_pareja_id());
create policy repartos_crear      on public.repartos    for insert to authenticated with check (pareja_id = public.mi_pareja_id());
create policy repartos_editar     on public.repartos    for update to authenticated
  using (pareja_id = public.mi_pareja_id()) with check (pareja_id = public.mi_pareja_id());

-- Permisos de tabla: sin sesión (anon) nada; con sesión (authenticated) solo lo necesario.
revoke all on public.parejas, public.miembros, public.sectores, public.movimientos, public.repartos
  from anon, authenticated;
grant select on public.parejas, public.miembros to authenticated;
grant select, insert, update on public.sectores, public.movimientos, public.repartos to authenticated;

-- Funciones: solo con sesión iniciada.
revoke all on function public.mi_pareja_id()              from public, anon;
revoke all on function public.generar_codigo_pareja()     from public, anon;
revoke all on function public.crear_pareja(text)          from public, anon;
revoke all on function public.unir_pareja(text, text)     from public, anon;
revoke all on function public.mi_pareja()                 from public, anon;
revoke all on function public.cambiar_mi_nombre(text)     from public, anon;
grant execute on function public.mi_pareja_id()           to authenticated;
grant execute on function public.crear_pareja(text)       to authenticated;
grant execute on function public.unir_pareja(text, text)  to authenticated;
grant execute on function public.mi_pareja()              to authenticated;
grant execute on function public.cambiar_mi_nombre(text)  to authenticated;