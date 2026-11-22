-- =====================================================================================================
-- CoupleFinance · Fase 8C: Realtime
--
-- Hace que Supabase avise a la app al instante cuando cambia algo de la pareja.
-- La app NO usa el contenido del aviso: solo lo toma como señal para sincronizar (el motor de la
-- Fase 8B sigue siendo el único que escribe en la base local).
--
-- La seguridad no cambia: Realtime respeta las políticas RLS de las tablas, así que cada cuenta
-- solo recibe avisos de las filas de SU pareja.
-- Ejecutar una sola vez, después de los dos archivos anteriores.
-- =====================================================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sectores', 'movimientos', 'repartos'] LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;