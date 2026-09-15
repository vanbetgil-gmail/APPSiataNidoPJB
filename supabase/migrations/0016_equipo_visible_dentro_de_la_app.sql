-- ---------------------------------------------------------------------
-- SIATA PJB — 0016: el equipo puede verse los nombres entre sí
--
-- FR-021a, FR-051.
--
-- ── El fallo ─────────────────────────────────────────────────────────
--
-- La política `integrante_se_ve_a_si_mismo` dice:
--
--     for select using (id = auth.uid() or es_responsable())
--
-- Es decir: un estudiante solo puede leer SU PROPIA fila de `integrante`.
-- Para un responsable la tabla entera es legible; para todos los demás,
-- una sola fila.
--
-- Eso rompe en silencio dos cosas que ya están construidas:
--
--  1. **El desplegable «Quién la registró»** del formulario de ficha.
--     Consulta `integrante` para ofrecer los nombres del equipo. A la
--     docente le muestra los trece; a un estudiante le muestra uno: el
--     suyo. No da error, no avisa. Simplemente la lista aparece con un
--     solo nombre y parece que así fue diseñada.
--
--  2. **Los tableros**, que traducen el identificador del autor de cada
--     jornada a un nombre. Un estudiante ve «(sin identificar)» en el
--     trabajo de todos sus compañeros.
--
-- ── Por qué una vista y no cambiar la política ───────────────────────
--
-- Porque la política está bien: `integrante` guarda el correo, si es
-- menor de edad y si hay autorización de acudiente. Nada de eso debe
-- poder leerlo un compañero de curso.
--
-- Lo que sí puede leer —y necesita— son los nombres. Una vista que
-- selecciona tres columnas concretas resuelve el problema sin abrir la
-- tabla: lo que no está en la lista de columnas no se puede pedir.
--
-- ── Esto NO es una vista pública ─────────────────────────────────────
--
-- `integrante_publico` (migración 0015) es la del anuario: filtra por
-- autorización de acudiente y la lee cualquier visitante anónimo.
--
-- Esta otra es interna: la lee quien ha iniciado sesión, y a propósito
-- NO filtra por autorización, porque dentro del equipo los nombres se
-- conocen. Lo que FR-051 protege es la exposición PÚBLICA.
--
-- Por eso se concede a `authenticated` y nunca a `anon`.
-- ---------------------------------------------------------------------

create or replace view integrante_equipo as
select
  i.id,
  i.nombre,
  i.rol,
  i.activo
from integrante i;

comment on view integrante_equipo is
  'Nombres del equipo para uso interno. Nunca incluye correo ni si es menor de edad. Solo para sesiones iniciadas: jamás se concede a anon (FR-051).';

-- El orden importa: primero se quita a `anon` por si la vista existía de
-- antes con otros permisos, y después se concede a quien debe tenerlo.
revoke all on integrante_equipo from anon;
grant select on integrante_equipo to authenticated;
