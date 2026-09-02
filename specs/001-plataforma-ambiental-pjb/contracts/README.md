# Contratos — NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb · **Fase 1**

Interfaces que la aplicación expone. Cada archivo es la fuente de verdad de su ámbito; si el código y el contrato discrepan, el contrato manda hasta que se actualice deliberadamente.

| Archivo | Qué define | Requisitos que cubre |
|---|---|---|
| [db-schema.sql](./db-schema.sql) | Tablas, restricciones, disparadores y políticas RLS | FR-011 a FR-016, FR-018 a FR-025, FR-038a a FR-038f, FR-051 a FR-051g |
| [api.md](./api.md) | Rutas del servidor y operaciones de datos desde el cliente | FR-027, FR-031a a FR-031c, FR-036, FR-053 |
| [import-export.md](./import-export.md) | Estructura del archivo de hoja de cálculo, normalizaciones y deduplicación | FR-028 a FR-031c, R-007 |

## Interfaces de la aplicación

Además de estos contratos de datos, la aplicación expone dos superficies públicas que no requieren autenticación y cuya estabilidad importa:

| Ruta | Contrato |
|---|---|
| `/` | Mapa de biodiversidad. Nunca redirige a inicio de sesión (FR-005, SC-001) |
| `/especie/[id]` | Ficha pública direccionable y compartible por enlace (FR-009) |
| `/inmersiva/[puntoId]` | Visor inmersivo, accesible sin cuenta (FR-010i) |
| `/estacion` | Estación fija e instrumentos didácticos (FR-010) |
| `/creditos` | Equipo del proyecto, sujeto a autorización (FR-051g) |

Los identificadores de `/especie/[id]` son permanentes: una vez publicada una ficha, su enlace no cambia aunque se edite, se despublique y se vuelva a publicar. Romperlo invalidaría enlaces ya compartidos por los estudiantes.
