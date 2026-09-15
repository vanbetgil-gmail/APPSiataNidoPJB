-- ---------------------------------------------------------------------
-- SIATA PJB — 0017: retirar una jornada abierta por equivocación
--
-- ── El hueco ─────────────────────────────────────────────────────────
--
-- `jornada` tiene política de inserción y de actualización, y ninguna de
-- borrado. En PostgreSQL eso significa que borrar está prohibido siempre.
--
-- Con el registro de mediciones en marcha, el primer error del primer día
-- es previsible: abrir la jornada con el taller equivocado, o con el
-- medidor de al lado. Hasta ahora esa fila se quedaba para siempre,
-- vacía, contando como una salida de campo que nunca ocurrió y
-- ensuciando los tableros.
--
-- ── Por qué solo si está vacía ───────────────────────────────────────
--
-- Porque una jornada CON mediciones es trabajo de campo: alguien estuvo
-- allí, con el medidor, tomando lecturas cada diez minutos. Eso no se
-- borra con un botón, ni siquiera por su autor. Si una lectura está mal,
-- se corrige —para eso existe `integrante_edita_medicion`, que deja
-- constancia de quién la modificó (FR-026)—; no se hace desaparecer.
--
-- La condición `not exists` lo garantiza en la base de datos, no en la
-- interfaz: aunque alguien llamara directamente a la API, una jornada con
-- una sola medición ya no se puede borrar.
--
-- ── Por qué solo su autor ────────────────────────────────────────────
--
-- `integrante_id = auth.uid()`. El responsable no se incluye a propósito:
-- no hay ninguna tarea de coordinación que consista en borrar jornadas
-- vacías ajenas, y añadirlo abriría esa puerta sin que nadie la pidiera.
-- ---------------------------------------------------------------------

create policy integrante_borra_su_jornada_vacia on jornada
  for delete using (
    integrante_id = auth.uid()
    and not exists (select 1 from medicion m where m.jornada_id = jornada.id)
  );
