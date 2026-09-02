-- =====================================================================
-- NIDO PJB — Semilla de catálogos
--
-- ORDEN OBLIGATORIO: `configuracion` va primero. El disparador
-- verificar_dominio_institucional() la consulta al insertar integrantes,
-- así que sin ella ningún alta funciona.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuración (FR-011, FR-035e)
--
-- El dominio es un supuesto sin confirmar (spec.md A-006): se asume
-- salesianos.edu.co, que es el que usa hoy el equipo docente. Si el colegio
-- emite las cuentas bajo institutopedrojustoberrio.com, basta cambiar
-- ESTA FILA. No hay nada más que tocar en todo el sistema.
-- ---------------------------------------------------------------------
insert into configuracion (id, dominio_institucional, norma_ica)
values (true, 'salesianos.edu.co', 'Resolución 2254 de 2017 (Colombia)')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Lugares de medición (FR-021)
--
-- Los cinco que aparecen en MEDIDORES.xlsx, con el nombre ya canónico:
-- sin espacios sobrantes ni variantes de mayúsculas.
--
-- es_interior = true en los cinco: son talleres cerrados. Por eso concentran
-- contaminación, y por eso el dron no puede documentarlos por dentro
-- (spec.md A-010b).
-- ---------------------------------------------------------------------
insert into lugar_medicion (nombre, es_interior) values
  ('Taller de Mecánica Industrial',  true),
  ('Taller de Mecánica Automotriz',  true),
  ('Ebanistería',                    true),
  ('Artes Gráficas',                 true)
on conflict (nombre) do nothing;

-- ⚠️ PENDIENTE DEL COLEGIO — «Op» aparece en 12 de los 135 registros
-- históricos y no corresponde a ningún lugar identificable.
--
-- Se siembra con nombre explícito de marcador para que NADIE lo confunda con
-- un lugar real. Sustituir por el nombre verdadero antes de ejecutar la
-- migración del histórico (scripts/migrar-historico.ts).
-- Mientras tanto, esos 12 registros se importan con dato_dudoso = true.
insert into lugar_medicion (nombre, es_interior, activo) values
  ('SIN IDENTIFICAR (registrado como «Op»)', true, false)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- Medidores (FR-022, SC-008)
--
-- El archivo trae las series 31–34 y también 9031–9034. Son CUATRO equipos,
-- no ocho: el prefijo 90 es un artefacto de captura.
--
-- ⚠️ CONFIRMAR CON EL EQUIPO antes de migrar el histórico. Si en realidad
-- fueran ocho aparatos distintos, unificarlos mezclaría lecturas de equipos
-- diferentes y el histórico quedaría corrupto en silencio.
-- ---------------------------------------------------------------------
insert into medidor (numero_serie, etiqueta) values
  ('31', 'Medidor 31'),
  ('32', 'Medidor 32'),
  ('33', 'Medidor 33'),
  ('34', 'Medidor 34')
on conflict (numero_serie) do nothing;

-- ---------------------------------------------------------------------
-- Categorías de biodiversidad (FR-007)
-- Punto de partida; el equipo puede añadir las que necesite.
-- ---------------------------------------------------------------------
insert into categoria_biodiversidad (nombre, icono) values
  ('Árbol',             'arbol'),
  ('Arbusto',           'arbusto'),
  ('Ave',               'ave'),
  ('Insecto',           'insecto'),
  ('Planta ornamental', 'planta')
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- Integrantes
--
-- ⚠️ PENDIENTE DEL COLEGIO — no se siembran cuentas reales.
--
-- Los 10 correos institucionales y la correspondencia de alias se
-- entregaron el 2026-09-02, pero siguen sin sembrarse aquí: son datos
-- personales de menores y este archivo se versiona en un repositorio
-- público. El alta se hace con `pnpm cargar-equipo`, que los lee de
-- datos-colegio/ (ignorado por git). Ver spec.md A-006a.
--
-- Sembrar correos inventados crearía cuentas con acceso real: no se hace.
--
-- El alta la realiza el responsable desde /admin/integrantes (FR-013a).
-- Para desarrollo local, supabase/seed/desarrollo.sql crea un responsable
-- de prueba; ese archivo NO debe ejecutarse en producción.
-- ---------------------------------------------------------------------
