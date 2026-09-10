-- ---------------------------------------------------------------------
-- NIDO PJB — 0011: «Op» resuelto = Taller Operación de Eventos
--
-- FR-021, FR-031. Cierra el pendiente que arrastraba el histórico desde
-- la primera lectura del archivo.
--
-- ── Qué se resuelve ──────────────────────────────────────────────────
--
-- `MEDIDORES.xlsx` traía 12 registros con el lugar anotado como «Op».
-- No correspondía a ningún taller conocido y no se podía adivinar, así
-- que se sembró un lugar con nombre de marcador —«SIN IDENTIFICAR
-- (registrado como Op)»— y esas 12 mediciones entraron con
-- `dato_dudoso = true`, fuera de todos los promedios.
--
-- El equipo confirmó el 2026-09-10 que «Op» es el **Taller Operación de
-- Eventos**. Con eso las 12 mediciones dejan de ser dudosas: se sabe
-- dónde se tomaron y pueden compararse con las de los demás talleres.
--
-- ── Por qué se renombra en vez de crear un lugar nuevo ───────────────
--
-- Porque las 12 mediciones ya apuntan a esa fila. Crear un lugar nuevo
-- obligaría a reapuntarlas y dejaría el marcador huérfano; renombrar
-- conserva los vínculos intactos y no toca ninguna medición.
--
-- ── Por qué se activa ────────────────────────────────────────────────
--
-- Se sembró con `activo = false` para que no apareciera como opción al
-- registrar una jornada nueva: nadie debía poder elegir un lugar que no
-- existía. Ahora existe y tiene nombre, así que vuelve al catálogo.
-- ---------------------------------------------------------------------

update lugar_medicion
set nombre = 'Taller Operación de Eventos',
    activo = true
where nombre like 'SIN IDENTIFICAR%';

-- Las 12 mediciones dejan de estar marcadas como dudosas.
--
-- Se limita a las que llevan ESA nota, no a todas las dudosas: el
-- campo existe para otros motivos —un valor sospechoso, una lectura
-- interrumpida— y borrar la marca de todas de un golpe silenciaría
-- problemas que nadie ha revisado.
update medicion
set dato_dudoso = false,
    nota_dudoso = null
where dato_dudoso
  and nota_dudoso like '%Op%';

comment on table lugar_medicion is
  'Catálogo de espacios de medición (FR-021). «Taller Operación de '
  'Eventos» aparecía en el histórico abreviado como «Op»; se resolvió '
  'en la migración 0011.';
