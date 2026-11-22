-- =====================================================================================
-- CoupleFinance · Fase 8B · Funciones de sincronización (subir y bajar cambios)
-- =====================================================================================
-- Pégalo en Supabase → SQL Editor → New query → Run. Va DESPUÉS del archivo de la Fase 8A.
--
--   sync_push(...)    sube de una vez los cambios pendientes de un teléfono. Es "todo o nada": un ingreso y
--                     su reparto llegan juntos. Si el servidor ya tiene una versión más NUEVA de una fila
--                     (updated_at mayor), esa fila no se pisa (last-write-wins).
--   sync_pull(...)    devuelve lo que cambió en el servidor desde un punto (por orden de llegada al servidor).
--   sync_resumen()    cuenta lo que la pareja ya tiene guardado (para decidir cómo unir un teléfono nuevo).
--
-- Las tres corren con los permisos de la persona que llama (SECURITY INVOKER): la seguridad (RLS) de la
-- Fase 8A sigue decidiendo qué filas puede ver o escribir. Solo trabajan con la pareja de esa cuenta.
-- =====================================================================================

create or replace function public.sync_push(
  p_sectores    jsonb default '[]'::jsonb,
  p_movimientos jsonb default '[]'::jsonb,
  p_repartos    jsonb default '[]'::jsonb
) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare
  v_pareja uuid := public.mi_pareja_id();
  n_sec int; n_mov int; n_rep int;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para sincronizar.' using errcode = '28000';
  end if;
  if v_pareja is null then
    raise exception 'Todavía no perteneces a ninguna pareja.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_sectores) <> 'array' or jsonb_typeof(p_movimientos) <> 'array' or jsonb_typeof(p_repartos) <> 'array' then
    raise exception 'Datos de sincronización no válidos.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_sectores) > 1000 or jsonb_array_length(p_movimientos) > 1000 or jsonb_array_length(p_repartos) > 1000 then
    raise exception 'Demasiados cambios en un solo envío.' using errcode = '22023';
  end if;

  -- 1) Sectores. "on conflict … where excluded.updated_at >= t.updated_at" = gana la versión más nueva
  --    (si llega la misma hora, gana la que llega última; así los dos teléfonos terminan iguales).
  with x as (
    insert into public.sectores as t
           (pareja_id, id, nombre, descripcion, tipo, icono, color, activo, orden, created_at, updated_at, deleted_at)
    select v_pareja, r.id, r.nombre, r.descripcion, r.tipo, r.icono, r.color,
           coalesce(r.activo, 1), coalesce(r.orden, 0), r.created_at, r.updated_at, r.deleted_at
      from jsonb_to_recordset(p_sectores) as r(
             id text, nombre text, descripcion text, tipo text, icono text, color text,
             activo int, orden int, created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)
    on conflict (pareja_id, id) do update set
           nombre = excluded.nombre, descripcion = excluded.descripcion, tipo = excluded.tipo,
           icono = excluded.icono, color = excluded.color, activo = excluded.activo, orden = excluded.orden,
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
     where excluded.updated_at >= t.updated_at
    returning 1)
  select count(*) into n_sec from x;

  -- 2) Movimientos. "registrado_por" solo se acepta si es una de las 2 cuentas de la pareja; si no, queda vacío.
  with x as (
    insert into public.movimientos as t
           (pareja_id, id, tipo, monto, forma, concepto, origen, sector_id, motivo_ahorro, es_salida_ahorro,
            fecha, registrado_por, created_at, updated_at, deleted_at)
    select v_pareja, r.id, r.tipo, r.monto, r.forma, r.concepto, r.origen, r.sector_id, r.motivo_ahorro,
           coalesce(r.es_salida_ahorro, 0), r.fecha,
           (select m.user_id from public.miembros m where m.user_id = r.registrado_por and m.pareja_id = v_pareja),
           r.created_at, r.updated_at, r.deleted_at
      from jsonb_to_recordset(p_movimientos) as r(
             id text, tipo text, monto numeric, forma text, concepto text, origen text, sector_id text,
             motivo_ahorro text, es_salida_ahorro int, fecha timestamptz, registrado_por uuid,
             created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)
    on conflict (pareja_id, id) do update set
           tipo = excluded.tipo, monto = excluded.monto, forma = excluded.forma, concepto = excluded.concepto,
           origen = excluded.origen, sector_id = excluded.sector_id, motivo_ahorro = excluded.motivo_ahorro,
           es_salida_ahorro = excluded.es_salida_ahorro, fecha = excluded.fecha,
           registrado_por = excluded.registrado_por,
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
     where excluded.updated_at >= t.updated_at
    returning 1)
  select count(*) into n_mov from x;

  -- 3) Repartos.
  with x as (
    insert into public.repartos as t
           (pareja_id, id, movimiento_id, sector_id, monto, created_at, updated_at, deleted_at)
    select v_pareja, r.id, r.movimiento_id, r.sector_id, r.monto, r.created_at, r.updated_at, r.deleted_at
      from jsonb_to_recordset(p_repartos) as r(
             id text, movimiento_id text, sector_id text, monto numeric,
             created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)
    on conflict (pareja_id, id) do update set
           movimiento_id = excluded.movimiento_id, sector_id = excluded.sector_id, monto = excluded.monto,
           updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
     where excluded.updated_at >= t.updated_at
    returning 1)
  select count(*) into n_rep from x;

  return jsonb_build_object('sectores', n_sec, 'movimientos', n_mov, 'repartos', n_rep);
end $$;


-- Filas de una tabla que llegaron al servidor DESPUÉS del punto (p_ts, p_id), en orden de llegada.
-- Devuelve como máximo p_limite filas (tope 1000) como lista JSON.
create or replace function public.sync_pull(
  p_tabla  text,
  p_ts     timestamptz default '1970-01-01T00:00:00Z',
  p_id     text        default '',
  p_limite int         default 500
) returns jsonb
language plpgsql stable set search_path = public, pg_temp as $$
declare
  v_pareja uuid := public.mi_pareja_id();
  v_filas  jsonb;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para sincronizar.' using errcode = '28000';
  end if;
  if v_pareja is null then
    raise exception 'Todavía no perteneces a ninguna pareja.' using errcode = 'P0002';
  end if;
  if p_tabla not in ('sectores', 'movimientos', 'repartos') then
    raise exception 'Tabla no válida.' using errcode = '22023';
  end if;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(x) order by x.server_updated_at, x.id), ''[]''::jsonb)
       from (select * from public.%I
              where pareja_id = $1 and (server_updated_at, id) > ($2, $3)
              order by server_updated_at, id
              limit $4) x', p_tabla)
    into v_filas
    using v_pareja, coalesce(p_ts, '1970-01-01T00:00:00Z'::timestamptz), coalesce(p_id, ''),
          greatest(1, least(coalesce(p_limite, 500), 1000));
  return v_filas;
end $$;


-- Cuánto tiene ya guardado la pareja (sin contar lo eliminado).
create or replace function public.sync_resumen() returns jsonb
language plpgsql stable set search_path = public, pg_temp as $$
declare
  v_pareja uuid := public.mi_pareja_id();
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para sincronizar.' using errcode = '28000';
  end if;
  if v_pareja is null then
    raise exception 'Todavía no perteneces a ninguna pareja.' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'movimientos', (select count(*) from public.movimientos where pareja_id = v_pareja and deleted_at is null),
    'sectores_personalizados', (select count(*) from public.sectores
                                 where pareja_id = v_pareja and deleted_at is null and tipo = 'personalizado'));
end $$;


revoke all on function public.sync_push(jsonb, jsonb, jsonb)         from public, anon;
revoke all on function public.sync_pull(text, timestamptz, text, int) from public, anon;
revoke all on function public.sync_resumen()                          from public, anon;
grant execute on function public.sync_push(jsonb, jsonb, jsonb)         to authenticated;
grant execute on function public.sync_pull(text, timestamptz, text, int) to authenticated;
grant execute on function public.sync_resumen()                          to authenticated;