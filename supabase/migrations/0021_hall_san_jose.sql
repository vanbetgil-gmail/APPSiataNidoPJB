-- ---------------------------------------------------------------------
-- SIATA PJB — 0021: el Hall San José entra al catálogo de medición
--
-- FR-021, FR-022.
--
-- ── De dónde sale ────────────────────────────────────────────────────
--
-- De una respuesta del formulario de Google que decía, en la casilla del
-- medidor: «33 (lugar de medición real fue San José)».
--
-- Es decir: alguien midió allí, no encontró el sitio en la lista y lo
-- escribió donde pudo. Esa nota se habría perdido en la importación —la
-- casilla es el número de serie— y la jornada habría quedado sin lugar,
-- que es la forma en que ya se perdieron 37 mediciones del histórico.
--
-- ── Por qué no es un taller ──────────────────────────────────────────
--
-- Los cinco lugares originales son talleres: espacios cerrados donde se
-- suelda, se corta madera o se imprime. El Hall San José es zona de paso.
--
-- Esa diferencia importa para lo que se mide: en un taller interesa el
-- aire que respira quien trabaja con la máquina; en un hall interesa el
-- aire por el que pasan todos los días varios cientos de estudiantes.
--
-- ── `es_interior` en falso ───────────────────────────────────────────
--
-- Un hall está techado pero abierto por los lados, así que el dron sí lo
-- capta y el aire se renueva solo. Si resulta ser un espacio cerrado,
-- basta cambiar esta columna: no hay nada más que dependa de ella.
--
-- El nombre coincide con el de la zona del campus que ya usan las fichas
-- de biodiversidad (migración 0012). Que el mismo sitio se llame igual en
-- las dos listas es lo que permitirá, el día que interese, cruzar lo que
-- crece en un lugar con el aire que allí se respira.
-- ---------------------------------------------------------------------

insert into lugar_medicion (nombre, es_interior, activo)
values ('Hall San José', false, true)
on conflict (nombre) do nothing;
