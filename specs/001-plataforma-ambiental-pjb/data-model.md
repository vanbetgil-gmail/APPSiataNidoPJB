# Phase 1 — Modelo de datos: NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb
**Fecha**: 2026-08-28
**Fuente**: entidades de [spec.md](./spec.md) + decisiones de [research.md](./research.md)

El esquema ejecutable está en [contracts/db-schema.sql](./contracts/db-schema.sql). Este documento explica el porqué de cada decisión.

---

## Mapa de relaciones

```text
integrante ──< jornada ──< medicion
     │                        │
     │                        └── (11 variables numéricas + ICA calculado)
     │
     ├──< ficha_biodiversidad ──< foto_ficha
     │            │
     │            └──> categoria_biodiversidad
     │
     └──< alias_historico            (vinculación con el histórico)

lugar_medicion ──< jornada
lugar_medicion ──< punto_destacado    (marcado manual de alta contaminación)

medidor ──< jornada

punto_mapa ──< vista_inmersiva
   ▲   ▲
   │   └── ficha_biodiversidad
   └────── lugar_medicion

imagen_base_mapa                      (versión vigente de la ortofoto)
punto_interes_didactico ──< vista_inmersiva
configuracion                         (dominio institucional, norma ICA vigente)
```

---

## Principios que gobiernan el esquema

Tres reglas atraviesan todo el modelo y explican decisiones que de otro modo parecerían recargadas:

1. **Nada numérico se guarda como texto.** El archivo actual tiene `27°` y `0001` en columnas numéricas (FR-018, SC-006). Todas las variables son `numeric`, y la conversión ocurre en la importación, nunca en la lectura.
2. **Donde hay catálogo, no hay texto libre.** Lugar y medidor son claves foráneas (FR-021, FR-022). Es lo que impide que reaparezcan `Artes  graficas ` y los medidores duplicados `32`/`9032`.
3. **Ausencia y cero son cosas distintas.** `NULL` significa «no medido»; `0` significa «medido en cero» (FR-025). Confundirlos falsearía los promedios de los tableros.

---

## Entidades

### `integrante`

Miembro autorizado. La tabla es a la vez la lista de acceso: si no hay fila, no hay ingreso (FR-013a, sin autorregistro).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | Coincide con el id de Supabase Auth |
| `correo` | text UNIQUE NOT NULL | Debe pertenecer al dominio de `configuracion` (FR-011) |
| `nombre` | text NOT NULL | Nombre visible |
| `rol` | enum `integrante` \| `responsable` | FR-014 |
| `es_menor_edad` | boolean NOT NULL DEFAULT true | Por omisión se asume menor: el caso seguro |
| `autorizacion_acudiente` | boolean NOT NULL DEFAULT false | FR-051d |
| `activo` | boolean NOT NULL DEFAULT true | Baja lógica: conserva autoría (FR-013) |
| `creado_en` | timestamptz NOT NULL | |

**Reglas de validación**:

- Nunca se elimina físicamente: se marca `activo = false`. Borrarlo dejaría mediciones huérfanas y rompería SC-016.
- `autorizacion_acudiente` solo puede ponerla en `true` un `responsable`, nunca la propia persona.
- **Debe existir al menos un `responsable` activo en todo momento.** Si el único responsable falta, ninguna ficha nueva puede publicarse (caso límite recogido en la spec).

### `alias_historico`

Vincula los alias de correo personal del archivo original con el integrante correspondiente (FR-030, FR-030a).

| Campo | Tipo | Reglas |
|---|---|---|
| `alias` | text PK | Ej. `alias-1` |
| `integrante_id` | uuid FK → `integrante` | |
| `registrado_por` | uuid FK → `integrante` | Auditoría |
| `registrado_en` | timestamptz | |

Existe como tabla propia, y no como columna en `integrante`, porque una misma persona podría haber usado más de un alias, y porque conservarla explícita permite auditar la migración después de hecha, que es justamente lo que exige FR-030a.

Solo entran aquí los alias **con titular identificado**. Los que no lo tienen no se registran: sus mediciones se importan con `integrante_id` nulo y el alias en bruto se descarta (FR-030b). La tabla no es un registro de todo lo que traía el archivo, sino de las correspondencias que el equipo pudo confirmar.

### `lugar_medicion`

Catálogo de espacios (FR-021).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text UNIQUE NOT NULL | Canónico, sin espacios sobrantes |
| `es_interior` | boolean NOT NULL | Los 5 actuales son talleres cerrados (A-010b) |
| `punto_mapa_id` | uuid FK → `punto_mapa` | Posición en el mapa |
| `activo` | boolean NOT NULL DEFAULT true | |

**Datos iniciales**: Taller de Mecánica Industrial, Taller de Mecánica Automotriz, Ebanistería, Artes Gráficas y el pendiente `Op`.

`es_interior` no es decorativo: determina que el punto no puede documentarse con dron y que su vista inmersiva, si llega a existir, será una captura interior (FR-010d).

### `medidor`

Catálogo de equipos (FR-022).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `numero_serie` | text UNIQUE NOT NULL | Identidad única y definitiva |
| `etiqueta` | text | Nombre de uso corriente |
| `disponible` | boolean NOT NULL DEFAULT true | |

La restricción `UNIQUE` es la que materializa SC-008 («cero medidores con identidad duplicada»): la migración debe resolver `32` frente a `9032` antes de insertar, porque el esquema no admitirá ambos como equipos distintos si son el mismo.

### `jornada`

Sesión de campo que agrupa mediciones (FR-019).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | Generado en el cliente (R-006) |
| `fecha` | date NOT NULL | |
| `lugar_id` | uuid FK NOT NULL | |
| `medidor_id` | uuid FK NOT NULL | |
| `integrante_id` | uuid FK, nullable | Quien midió. Nulo solo si `origen <> 'app'` y no se pudo identificar (FR-030b) |
| `cerrada` | boolean NOT NULL DEFAULT false | FR-020 |
| `origen` | enum `app` \| `importacion` \| `migracion` | Trazabilidad |
| `creada_en` | timestamptz NOT NULL | |

### `medicion`

Lectura individual. El corazón del sistema.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | **Generado en el cliente antes de guardar en local** (R-006) |
| `jornada_id` | uuid FK NOT NULL | |
| `numero` | smallint NOT NULL | Orden dentro de la jornada |
| `hora` | time NOT NULL | Ajustable si se captura en diferido (FR-023) |
| `pm1` | numeric | µg/m³ |
| `pm25` | numeric | µg/m³ — entra al ICA |
| `pm10` | numeric | µg/m³ — entra al ICA |
| `hcho` | numeric | µg/m³ |
| `tvoc` | numeric | µg/m³ |
| `humedad_relativa` | numeric | % |
| `temperatura` | numeric | °C |
| `particulas_litro` | numeric | per/L |
| `co2` | numeric | ppm |
| `aqi_medidor` | numeric | **Lo que reporta el equipo**, escala EPA (FR-035d) |
| `dato_dudoso` | boolean NOT NULL DEFAULT false | FR-031 |
| `nota_dudoso` | text | Por qué se marcó |
| `creada_en` / `modificada_en` | timestamptz | |
| `modificada_por` | uuid FK | FR-026 |

**Restricciones**:

- `UNIQUE (jornada_id, numero)` — no puede haber dos lecturas número 3 en la misma jornada.
- **Clave natural de deduplicación**: índice único sobre `(fecha, hora, lugar_id, medidor_id)` derivado de la jornada. Es lo que hace idempotente tanto la sincronización sin conexión como la reimportación (FR-031c, SC-015).
- Rangos plausibles verificados en la aplicación con advertencia y confirmación, **no** como restricción rígida de base de datos: FR-024 exige advertir sin impedir. Una restricción `CHECK` haría imposible registrar una lectura extrema real.

**El ICA no se almacena.** Se calcula al vuelo a partir de `pm25` y `pm10`. Guardarlo lo dejaría desactualizado el día que se corrija un punto de corte, y R-004 advierte que esos puntos de corte aún deben verificarse contra el texto oficial. Calcularlo siempre garantiza coherencia entre mapa, tableros y fichas (FR-035a).

Cuando faltan `pm25` y `pm10`, el ICA es **no disponible** — nunca «buena» por omisión (caso límite de la spec).

### `punto_mapa`

Posición sobre la ortofoto. Es la pieza que resuelve FR-006a y FR-006c.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `x_relativa` | numeric NOT NULL | Fracción 0–1 del ancho de la imagen |
| `y_relativa` | numeric NOT NULL | Fracción 0–1 del alto |
| `imagen_base_version` | int NOT NULL FK | Contra qué versión se marcó |

**Por qué fracciones y no píxeles**: si mañana el colegio vuela el dron otra vez y genera una ortofoto de distinta resolución, los puntos guardados en fracciones siguen cayendo en el mismo sitio del predio. Guardados en píxeles absolutos quedarían todos desplazados. Es exactamente lo que exige FR-006c.

**Restricción**: `CHECK (x_relativa BETWEEN 0 AND 1 AND y_relativa BETWEEN 0 AND 1)` — implementa FR-042 a nivel de datos: no se puede marcar fuera de la imagen.

### `imagen_base_mapa`

| Campo | Tipo | Reglas |
|---|---|---|
| `version` | int PK | |
| `ruta_teselas` | text NOT NULL | Carpeta de la pirámide (R-002) |
| `ancho_px` / `alto_px` | int NOT NULL | Dimensiones del original |
| `zoom_maximo` | int NOT NULL | Niveles generados |
| `vigente` | boolean NOT NULL | Solo una a la vez |
| `capturada_en` | date | Fecha del vuelo |

### `ficha_biodiversidad`

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `nombre_comun` | text NOT NULL | |
| `nombre_cientifico` | text NOT NULL | |
| `categoria_id` | uuid FK NOT NULL | |
| `descripcion` | text NOT NULL | |
| `punto_mapa_id` | uuid FK NOT NULL | |
| `estado` | enum | `borrador` \| `en_revision` \| `publicado` \| `despublicado` (FR-038a) |
| `aprobada_alguna_vez` | boolean NOT NULL DEFAULT false | **Clave de FR-038c** |
| `motivo_rechazo` | text | FR-038d |
| `mostrar_autor` | boolean NOT NULL DEFAULT false | FR-051a, FR-051b |
| `autor_id` | uuid FK NOT NULL | Autoría interna, siempre |
| `aprobada_por` / `aprobada_en` | uuid FK / timestamptz | |
| `creada_en` / `modificada_en` / `modificada_por` | | FR-043 |

**`aprobada_alguna_vez` es el campo que hace funcionar la decisión de revisión** (Q2 = opción B). Sin él no habría forma de distinguir «ficha nueva que necesita aprobación» de «ficha ya aprobada que solo se está editando». Una vez `true`, nunca vuelve a `false`, ni siquiera si la ficha se despublica: la confianza ya fue otorgada a ese registro.

**`mostrar_autor` nace en `false`** (FR-051b). Es la diferencia entre proteger por omisión y exponer por descuido, tratándose de menores de edad.

**Regla combinada** que exige FR-051d: `mostrar_autor` solo puede activarse si el autor tiene `autorizacion_acudiente = true` **o** `es_menor_edad = false`. Se implementa como disparador en base de datos, no solo como validación en la interfaz, para que sea imposible saltársela.

#### Transiciones de estado

```text
                  ┌──────────────────────────────────────┐
                  │                                      │
  (crear) → borrador ──enviar──> en_revision ──aprobar──> publicado
                  ▲                    │                   │  ▲
                  └───rechazar─────────┘                   │  │
                    (+ motivo_rechazo)                     │  │
                                                 despublicar  republicar
                                                           │  │  (sin nueva
                                                           ▼  │   aprobación:
                                                     despublicado  ya aprobada
                                                                   alguna vez)
```

- **Solo `publicado` es visible al público.** Cualquier otro estado es invisible fuera del equipo.
- `borrador → en_revision`: lo hace el autor. Exige campos completos (FR-041).
- `en_revision → publicado`: **solo un `responsable`** (FR-038b). Marca `aprobada_alguna_vez = true`.
- `en_revision → borrador`: rechazo con motivo obligatorio (FR-038d).
- `publicado → publicado` (edición): directa, sin revisión, si `aprobada_alguna_vez = true` (FR-038c).
- `despublicado → publicado`: directa, porque ya fue aprobada una vez.

### `foto_ficha`

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `ficha_id` | uuid FK NOT NULL | |
| `ruta_storage` | text NOT NULL | Supabase Storage (R-008) |
| `orden` | smallint NOT NULL | |
| `subida_por` / `subida_en` | | |

Al menos una por ficha para poder publicarla (FR-039). Se redimensionan en el cliente antes de subir, para cumplir el escenario 7 de la Historia 5.

### `categoria_biodiversidad`

Catálogo para filtrar el mapa (FR-007): árbol, arbusto, ave, insecto, planta ornamental, y las que el equipo añada.

### `vista_inmersiva`

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | uuid PK | |
| `punto_mapa_id` | uuid FK NOT NULL | |
| `tipo_medio` | enum `panorama_360` \| `foto_detalle` \| `video` | FR-010b |
| `origen` | enum `dron` \| `movil` | FR-010d — los interiores no son de dron |
| `ruta` | text NOT NULL | Archivo estático en CDN (R-008) |
| `ruta_respaldo` | text | Imagen fija si el medio no reproduce (FR-010h) |
| `orden` | smallint | Un punto puede tener varias (FR-010b) |

**Es opcional por punto** (FR-010c): un punto sin filas aquí funciona con normalidad. Esta tabla es la que permite escribir hoy la aplicación sin saber aún el formato del material (A-010c).

### `punto_destacado`

Marcado manual de alta contaminación (FR-010j a FR-010m). Decisión Q-B = opción B: **solo manual**.

| Campo | Tipo | Reglas |
|---|---|---|
| `lugar_id` | uuid PK FK → `lugar_medicion` | |
| `marcado_por` | uuid FK NOT NULL | FR-010m |
| `marcado_en` | timestamptz NOT NULL | |
| `nota` | text | Justificación del responsable |

Tabla aparte, y no una columna en `lugar_medicion`, precisamente porque la marca es manual y auditable: quién y cuándo son parte del dato. Desmarcar es borrar la fila.

**El sistema jamás escribe ni borra aquí por su cuenta** (FR-010k). Cuando los datos dejan de respaldar una marca, se muestra un aviso al responsable, pero la decisión sigue siendo suya.

### `punto_interes_didactico`

La estación meteorológica fija y cada instrumento construido por los estudiantes (FR-010): nombre, variable asociada, explicación, foto, y opcionalmente un `punto_mapa_id`.

### `configuracion`

Tabla de una sola fila con lo que debe poder cambiarse sin tocar código:

| Campo | Para qué |
|---|---|
| `dominio_institucional` | FR-011 — hoy `salesianos.edu.co`, sin confirmar (A-006) |
| `norma_ica` | FR-035e — texto de la norma que se muestra al público |
| `imagen_base_version_vigente` | Qué ortofoto está en uso |

---

## Cómo se traducen los permisos a reglas de datos

Las políticas RLS completas están en [contracts/db-schema.sql](./contracts/db-schema.sql). El resumen conceptual:

| Quién | Qué puede leer | Qué puede escribir |
|---|---|---|
| **Anónimo** | Fichas en estado `publicado`, sus fotos, categorías, puntos del mapa, vistas inmersivas, puntos destacados, contenido didáctico, configuración pública | Nada |
| **Integrante** | Todo lo anterior + mediciones, jornadas, catálogos, y sus propias fichas en cualquier estado | Sus jornadas y mediciones; sus fichas; `mostrar_autor` de sus fichas (si tiene autorización) |
| **Responsable** | Todo | Todo lo anterior + aprobar y rechazar fichas, gestionar integrantes, catálogos y puntos destacados |

**El anónimo nunca puede leer `medicion` ni `jornada` en detalle** (FR-015, A-010d). Lo que sí ve del mapa es la marca de punto destacado y la categoría cualitativa agregada, servida por una vista de solo lectura que no expone valores individuales.

**`integrante.correo` no se expone jamás** (FR-051). Las vistas públicas leen de una proyección que solo incluye `nombre`, y únicamente cuando `mostrar_autor = true` y hay autorización registrada.

---

## Datos iniciales necesarios

| Catálogo | Contenido |
|---|---|
| `lugar_medicion` | 5 filas — 4 conocidas + `Op` pendiente de nombre real |
| `medidor` | 4 equipos, con las series `31`–`34` y `9031`–`9034` ya unificadas |
| `categoria_biodiversidad` | Árbol, arbusto, ave, insecto, planta ornamental |
| `integrante` | 10 filas — pendiente de la lista de correos institucionales |
| `alias_historico` | 5 filas — los alias con titular identificado. Los 2 restantes no se registran (FR-030b) |
| `configuracion` | 1 fila |
| `imagen_base_mapa` | 1 fila — pendiente del inventario de dron |

Cinco de los siete dependen de pendientes que solo el colegio puede aportar. Están enumerados en `plan.md`.

---

## Volumen previsto

| Tabla | Filas al año 1 | Crecimiento anual |
|---|---|---|
| `medicion` | ~635 (135 históricas + ~500) | ~500 |
| `jornada` | ~100 | ~80 |
| `ficha_biodiversidad` | ~60 | ~40 |
| `foto_ficha` | ~120 | ~80 |
| `vista_inmersiva` | ~20 | ~10 |

Volumen mínimo. Ningún índice más allá de las claves y la clave natural de deduplicación tiene justificación a esta escala; añadir más sería optimizar contra un problema que no existe.
