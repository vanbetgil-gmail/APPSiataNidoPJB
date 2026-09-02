-- ---------------------------------------------------------------------
-- NIDO PJB — 0006: jornadas históricas sin autor identificado
--
-- FR-030b, SC-016.
--
-- ── Qué problema resuelve ────────────────────────────────────────────
--
-- Al preparar la migración del histórico aparecieron 19 mediciones que
-- vienen de dos alias de Gmail cuyos titulares el equipo no pudo
-- identificar. Están completas —fecha, hora, lugar, medidor y las diez
-- variables—; lo único que falta es quién sostuvo el aparato.
--
-- `jornada.integrante_id` era `not null`, de modo que esas 19 filas no
-- cabían en la base de datos. La única salida habría sido descartarlas.
--
-- (Hay otras 37 filas del histórico que sí se rechazan, pero por un
-- motivo distinto: no traen lugar ni medidor, y sin lugar una medición
-- de aire no se puede comparar ni ubicar. Eso lo resuelve la
-- importación, no el esquema. Ver contracts/import-export.md §4b.)
--
-- ── Por qué se conservan ─────────────────────────────────────────────
--
-- Porque el dato científico está intacto y lo que falta es metadato.
-- Borrar mediciones reales del aire del colegio para no admitir un
-- campo vacío sería perder lo que importa por preservar lo accesorio.
--
-- Se consideró atribuirlas a un integrante concreto y se descartó: los
-- dos alias deletrean nombres de otras personas, y el 17 de septiembre
-- uno de ellos midió en «Op» con los equipos 9031 y 9034 mientras el
-- integrante candidato medía en el Taller de Mecánica Industrial con el
-- 33. Mismo día, sitios y aparatos distintos: son dos personas.
--
-- El alias en bruto NO se guarda. Un correo personal de Gmail sin
-- titular a quien corresponda es un dato personal sin finalidad, y
-- conservarlo iría contra la minimización que exige tratar datos de
-- menores (Ley 1581 de 2012). Se descarta en la importación.
--
-- ── Por qué la restricción de abajo ──────────────────────────────────
--
-- Quitar `not null` a secas abriría la puerta a que la aplicación
-- creara mediciones anónimas, y eso sí rompería la trazabilidad que
-- pide FR-030a. La restricción lo impide: solo los orígenes
-- `importacion` y `migracion` admiten autor nulo. Una jornada nacida en
-- la aplicación sigue obligada a tener autor, exactamente como antes.
-- ---------------------------------------------------------------------

alter table jornada
  alter column integrante_id drop not null;

alter table jornada
  add constraint jornada_sin_autor_solo_importada
  check (integrante_id is not null or origen <> 'app');

comment on column jornada.integrante_id is
  'Autor de la jornada. Nulo solo en registros importados cuyo autor no '
  'se pudo identificar (FR-030b). Las jornadas creadas en la aplicación '
  'siempre lo llevan, garantizado por jornada_sin_autor_solo_importada.';

-- ---------------------------------------------------------------------
-- Consecuencia en los permisos: nada que cambiar, pero conviene dejarlo
-- escrito porque no es evidente.
--
-- Las políticas de `jornada` y `medicion` comparan `integrante_id =
-- auth.uid()`. Con autor nulo esa comparación da NULL, que en SQL se
-- trata como falso. El efecto es justo el que se quiere:
--
--   · Nadie puede crear una jornada sin autor desde la aplicación
--     (la política de inserción ya lo exigía; la restricción de arriba
--     lo hace además imposible a nivel de esquema).
--   · Ningún estudiante puede editar una jornada histórica sin autor.
--   · El responsable sí, por la rama `es_responsable()`. Es quien podrá
--     atribuirlas más adelante si aparece la correspondencia.
-- ---------------------------------------------------------------------
