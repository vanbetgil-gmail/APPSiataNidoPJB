-- ---------------------------------------------------------------------
-- SIATA PJB — 0019: los turnos reales de medición
--
-- FR-019, FR-020.
--
-- ── De dónde sale esto ───────────────────────────────────────────────
--
-- Del formulario de Google que el equipo lleva usando: «MEDICIONES PARA
-- LOS MEDIDORES DE LUIS». Es el procedimiento de verdad, y no coincide
-- del todo con lo que se programó a partir del histórico.
--
-- Tres diferencias, y las tres importan:
--
--  1. **Siete mediciones por jornada, no ocho.** El formulario tiene
--     MEDICION 1 a MEDICION 7 y ahí termina.
--
--  2. **La hora no se escribe: se elige el turno.** Cada medición
--     ofrece exactamente dos horas, y son las mismas siempre:
--
--         Medición   1     2     3     4     5     6     7
--         Mediodía  12:00 12:10 12:20 12:30 12:40 12:50 13:00
--         Tarde     14:00 14:10 14:20 14:30 14:40 14:50 15:00
--
--     Es decir: se elige a qué hora se empieza, y el resto sale solo.
--     Esta columna guarda esa elección.
--
--  3. **Falta un taller en el catálogo**: Desarrollo de software.
--
-- ── Por qué el turno se guarda y no se deduce ────────────────────────
--
-- Se podría mirar la hora de la primera medición y deducirlo. Pero la
-- jornada se abre ANTES de tomar ninguna lectura, y el cronómetro de la
-- primera tiene que saber ya a qué hora toca. Deducirlo de una fila que
-- todavía no existe no es posible.
--
-- Nulo está permitido: las quince jornadas del histórico se importaron
-- de un Excel que no registraba turnos, y no vamos a inventarles uno.
-- ---------------------------------------------------------------------

alter table jornada
  add column if not exists turno text;

alter table jornada drop constraint if exists turno_conocido;

alter table jornada add constraint turno_conocido check (
  turno is null or turno in ('mediodia', 'tarde')
);

comment on column jornada.turno is
  'A qué hora empieza la jornada: mediodia (12:00) o tarde (14:00). De ahí salen las siete horas, una cada diez minutos. Nulo en las jornadas importadas del histórico.';


-- ---------------------------------------------------------------------
-- El taller que faltaba
--
-- ── Por qué con `select` y no con un id escrito a mano ────────────────
--
-- `lugar_medicion.id` se genera al insertar, así que no hay un
-- identificador que poner. `on conflict (nombre)` lo hace repetible: si
-- la migración se ejecuta dos veces, la segunda no hace nada.
--
-- `es_interior` en `true` como los demás talleres: son espacios
-- cerrados, y de ahí viene que el dron no los capte (A-010b).
-- ---------------------------------------------------------------------
insert into lugar_medicion (nombre, es_interior, activo)
values ('Taller de Desarrollo de Software', true, true)
on conflict (nombre) do nothing;
