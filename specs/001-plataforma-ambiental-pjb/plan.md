# Implementation Plan: NIDO PJB

**Branch**: `001-plataforma-ambiental-pjb` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-plataforma-ambiental-pjb/spec.md`

---

## Summary

**NIDO PJB** —*Nodo de Investigación y Datos Observados del Instituto Pedro Justo Berrío*— es una aplicación web única que sirve dos públicos distintos desde la misma base de código:

- **Cualquier visitante, sin cuenta**: recorre un mapa de biodiversidad montado sobre una ortofoto de dron del colegio, abre la ficha de cada especie con su foto y su detalle, entra a vistas inmersivas en puntos seleccionados y conoce la estación meteorológica y los instrumentos didácticos.
- **Los 10 integrantes, con correo institucional**: registran jornadas de medición de calidad del aire —incluso sin conexión, dentro de los talleres—, consultan tableros con el histórico y documentan nuevas especies.

El enfoque técnico se apoya en tres decisiones que atraviesan todo el diseño:

1. **El mapa no es geográfico.** Leaflet con `CRS.Simple` sobre una pirámide de teselas pre-generada a partir de la ortofoto de dron. Sin proveedor de mapas, sin claves de API, sin costos, sin GPS.
2. **Lo pesado es estático; lo dinámico es poco.** Teselas, panorámicas y videos viven como archivos en la CDN; solo las fotos que suben los estudiantes van a almacenamiento medido. Esto mantiene el proyecto dentro de capas gratuitas.
3. **Los permisos viven en la base de datos.** Row Level Security de PostgreSQL expresa «el mapa es público, los tableros no» como reglas declarativas, no como condicionales repartidos por el código.

Todo el detalle y las alternativas descartadas están en [research.md](./research.md).

---

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS

**Primary Dependencies**:

| Área | Elección | Requisitos que cubre |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 | FR-045, FR-045a, FR-045d |
| Estilos | Tailwind CSS 4 | FR-003, FR-004, FR-047 |
| Mapa | Leaflet 1.9 con `CRS.Simple` | FR-006, FR-006a, FR-006c |
| Vistas inmersivas | Photo Sphere Viewer (360°), Leaflet teselado (foto), `<video>` nativo | FR-010b |
| Backend | Supabase — PostgreSQL 15, Auth, Storage, RLS | FR-011 a FR-016, FR-050 a FR-053 |
| Sin conexión | Dexie sobre IndexedDB + Service Worker | FR-027, FR-027a, FR-027b, FR-045b, FR-045c |
| Gráficas | Recharts | FR-032 a FR-037 |
| Hoja de cálculo | SheetJS (`xlsx`) | FR-028 a FR-031c, FR-036 |

**Storage**: PostgreSQL (Supabase) para datos relacionales · Supabase Storage para fotos de fichas · archivos estáticos en CDN para teselas y material inmersivo

**Testing**: Vitest (unitario) · Playwright (extremo a extremo, incluido modo sin conexión) · `axe-core` (accesibilidad, WCAG 2.1 AA)

**Target Platform**: navegadores modernos de escritorio y móvil. Instalable en el celular con un manifiesto web y un service worker (FR-045b). Sin aplicaciones de tienda — explícitamente fuera de alcance.

**Project Type**: aplicación web con backend gestionado. Base de código única.

**Performance Goals**:

- Mapa utilizable en < 3 s en conexión móvil escolar (SC-002), con carga inicial < 200 KB de teselas
- Vista inmersiva abierta y navegable en < 5 s (SC-002b)
- Registro de una medición de 11 variables en < 60 s (SC-004)

**Constraints**:

- El mapa público **nunca** debe exigir autenticación (FR-005, SC-001)
- El registro de mediciones debe funcionar sin conexión y sobrevivir al reinicio del dispositivo (FR-027b)
- Ningún valor numérico puede almacenarse como texto (FR-018, SC-006)
- Ningún correo institucional puede aparecer en vistas públicas, sin excepción configurable (FR-051)
- Ningún nombre de menor visible sin autorización registrada (FR-051d, SC-010b)
- Interfaz íntegramente en español (FR-048)
- Sin desplazamiento horizontal de página a 360 px de ancho (FR-047, SC-013)

**Scale/Scope**: 10 integrantes · ~135 mediciones históricas más ~500 anuales · decenas de fichas de biodiversidad · ~20 puntos con vista inmersiva · visitantes públicos con picos puntuales en ferias escolares · aproximadamente 15 pantallas

---

## Constitution Check

*GATE: debe pasar antes de la investigación de Fase 0 y volver a revisarse tras el diseño de Fase 1.*

**Estado: NO EVALUABLE — sin incumplimientos, pero tampoco sin verificación real.**

El archivo `.specify/memory/constitution.md` sigue siendo la plantilla original de Spec Kit: sus 12 marcadores (`[PRINCIPLE_1_NAME]`, `[SECTION_2_NAME]`, `[GOVERNANCE_RULES]`, `[CONSTITUTION_VERSION]`, entre otros) están intactos. **No existen principios definidos contra los cuales evaluar este plan.**

Se reporta así deliberadamente en vez de declarar la compuerta «superada», que sería engañoso: nada se ha comprobado porque no hay nada contra qué comprobar.

**Recomendación**: ejecutar `/speckit-constitution` antes de `/speckit-implement`. Para este proyecto en concreto valdría la pena consagrar como principios al menos:

1. **Datos limpios en el origen** — ningún valor numérico se almacena como texto; ninguna entidad admite texto libre donde exista catálogo. Es la lección directa del `MEDIDORES.xlsx` actual.
2. **Lo público no exige cuenta** — ninguna ruta pública puede depender de sesión iniciada.
3. **Protección de menores por omisión** — cualquier exposición de identidad de un integrante está desactivada por defecto y condicionada a autorización registrada.
4. **Mantenible por el colegio** — se prefiere la opción que un estudiante de grado 11 pueda retomar, aunque no sea la más elegante.
5. **Honestidad del dato** — la aplicación nunca presenta un valor con más certeza de la que tiene; los límites metodológicos se muestran, no se ocultan.

**Re-evaluación tras Fase 1**: sin cambios. El diseño no puede incumplir principios inexistentes. Los cinco principios propuestos, de adoptarse, se cumplirían con el diseño tal como está: el modelo de datos tipa todos los valores numéricos, las políticas RLS hacen público el mapa sin sesión, `mostrar_autor` nace en `false`, la pila elegida es la más común y documentada, y R-004 obliga a advertir sobre la ventana temporal del ICA.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-plataforma-ambiental-pjb/
├── plan.md              # Este archivo
├── spec.md              # Especificación (100 FR, 26 SC)
├── research.md          # Fase 0 — 10 decisiones técnicas
├── data-model.md        # Fase 1 — entidades, relaciones, estados
├── quickstart.md        # Fase 1 — guía de puesta en marcha y validación
├── contracts/           # Fase 1
│   ├── README.md
│   ├── db-schema.sql        # Tablas, restricciones y políticas RLS
│   ├── api.md               # Rutas del servidor y operaciones de datos
│   └── import-export.md     # Contrato del archivo de hoja de cálculo
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 — lo genera /speckit-tasks, NO este comando
```

### Source Code (repository root)

```text
app/
├── (publico)/                    # Sin autenticación — FR-005
│   ├── page.tsx                  # Mapa de biodiversidad (portada)
│   ├── especie/[id]/page.tsx     # Ficha pública — FR-009
│   ├── inmersiva/[puntoId]/       # Visor inmersivo — FR-010a a FR-010i
│   ├── estacion/page.tsx         # Estación fija e instrumentos — FR-010
│   └── creditos/page.tsx         # Equipo del proyecto — FR-051g
├── (privado)/                    # Requiere sesión — FR-015
│   ├── jornadas/                 # Registro de mediciones — FR-017 a FR-027b
│   ├── tableros/                 # Resultados — FR-032 a FR-037
│   ├── fichas/                   # Inventario de biodiversidad — FR-038 a FR-044
│   ├── revision/                 # Bandeja de aprobación — FR-038f
│   └── admin/                    # Integrantes, lugares, medidores — FR-013, FR-021, FR-022
├── api/
│   ├── sincronizar/              # Recepción idempotente de la cola — FR-027
│   ├── importar/                 # Previsualización y confirmación — FR-031a a FR-031c
│   └── exportar/                 # Descarga xlsx/csv — FR-036, FR-053
├── login/page.tsx
└── layout.tsx

components/
├── mapa/                         # Leaflet CRS.Simple, marcadores, filtros
├── inmersiva/                    # Visores conmutados por tipo de medio
├── mediciones/                   # Formulario de 11 variables, indicador sin conexión
├── tableros/                     # Gráficas Recharts, selector de rango
└── ui/                           # Sistema de diseño: paleta del logo, tipografía

lib/
├── supabase/                     # Clientes de navegador y servidor
├── offline/                      # Cola Dexie, sincronización idempotente
├── ica/                          # Cálculo del ICA — FR-035 a FR-035e
├── importar/                     # Lectura y normalización de xlsx — R-007
└── validacion/                   # Rangos plausibles por variable — FR-024

supabase/
├── migrations/                   # Esquema versionado
└── seed/                         # Catálogos: lugares, medidores, categorías

public/
├── mapa/tiles/                   # Pirámide de teselas de la ortofoto — R-002
├── inmersivas/                   # Panorámicas, fotos teseladas, videos — R-003
├── manifest.json                 # Instalable en el celular — FR-045b
└── sw.js                         # Service worker

scripts/
├── generar-teselas.sh            # gdal2tiles, reproducible por el colegio
└── migrar-historico.ts           # Carga única de los 135 registros — FR-028

tests/
├── unit/                         # Cálculo ICA, normalizadores, validadores
├── integration/                  # Políticas RLS, sincronización idempotente
└── e2e/                          # Playwright: recorrido público, registro sin conexión
```

**Structure Decision**: base de código única en Next.js con separación por grupos de rutas entre `(publico)` y `(privado)`. Se descarta la separación en `frontend/` y `backend/` porque FR-045 exige explícitamente que no existan versiones separadas que mantener por aparte, y porque el backend lo aporta Supabase como servicio gestionado. Los grupos de rutas hacen visible en el propio árbol de archivos qué es público y qué no, lo que reduce la probabilidad de exponer por descuido una pantalla que debía estar protegida.

---

## Complexity Tracking

No aplica. El Constitution Check no arrojó incumplimientos porque no hay constitución definida; no hay por tanto desviaciones que justificar.

Se deja constancia de las dos decisiones que **añaden** complejidad de forma deliberada, para que queden a la vista si alguien las cuestiona más adelante:

| Decisión | Por qué se acepta | Alternativa simple descartada porque |
|---|---|---|
| Pirámide de teselas pre-generada en vez de una sola imagen | Sin ella es imposible cumplir a la vez SC-002 (< 3 s) y FR-006b (distinguir árboles individuales) | Un JPEG reducido pierde el detalle; uno completo no carga en una conexión escolar |
| Cola sin conexión con identificador generado en el cliente | FR-027 y SC-011 exigen sincronizar sin duplicados; los talleres tienen mala señal | Registrar solo en línea deja inservible la aplicación justo donde se usa |

---

## Fases ejecutadas

- **Fase 0 — Investigación**: completa. 10 decisiones técnicas resueltas y 7 riesgos abiertos identificados en [research.md](./research.md).
- **Fase 1 — Diseño y contratos**: completa. Modelo de datos en [data-model.md](./data-model.md), contratos en [contracts/](./contracts/), guía de validación en [quickstart.md](./quickstart.md).
- **Fase 2 — Tareas**: pendiente. La genera `/speckit-tasks`.

## Bloqueos previos a implementar

Ninguno impide diseñar ni empezar por el mapa público, pero sí frenan partes concretas:

| # | Pendiente | Qué bloquea |
|---|---|---|
| 1 | Inventario del material de dron | La ortofoto base y el formato de las vistas inmersivas (R-003) |
| 2 | Nombre real del lugar `Op` | 12 de los 135 registros históricos |
| 3 | Lista de 10 correos institucionales | Las pruebas de acceso |
| 4 | Correspondencia alias → integrante | La atribución de autoría del histórico (FR-030) |
| 5 | Texto oficial de la Resolución 2254 de 2017 | Los puntos de corte del ICA (R-004) |
| 6 | Confirmación institucional sobre señalar talleres | La publicación de los puntos de alta contaminación (A-010d) |
