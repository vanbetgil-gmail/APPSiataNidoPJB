-- =====================================================================
-- NIDO PJB — Ortofoto de prueba
--
-- Permite desarrollar y validar el mapa (US1) SIN esperar a la toma de dron
-- real, que es el pendiente 1 del colegio. Es lo que hace que el MVP no
-- dependa de ningún insumo externo.
--
-- Las teselas de prueba se generan con:
--   ./scripts/generar-teselas.sh public/mapa/prueba-origen.png public/mapa/tiles
--
-- Al llegar la ortofoto real: generar sus teselas, insertar una fila nueva
-- con version = 2 y marcarla vigente. Los puntos ya marcados NO se desplazan,
-- porque se guardan en coordenadas relativas 0–1 (FR-006c).
-- =====================================================================

insert into imagen_base_mapa (ruta_teselas, ancho_px, alto_px, zoom_maximo, vigente, capturada_en)
values ('/mapa/tiles', 4096, 3072, 5, true, null)
on conflict do nothing;

update configuracion
set imagen_base_version_vigente = (select version from imagen_base_mapa where vigente)
where id;
