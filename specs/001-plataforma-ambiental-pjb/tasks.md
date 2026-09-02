---
description: "Task list for NIDO PJB implementation"
---

# Tasks: NIDO PJB

**Input**: Documentos de diseño en `/specs/001-plataforma-ambiental-pjb/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: La especificación no pide TDD, así que **no** se genera una suite completa a priori. Sí se incluyen las **cuatro comprobaciones críticas** que `quickstart.md` nombra explícitamente —fugas de datos privados, exposición de correos, idempotencia de sincronización y protección de menores— porque fallar en ellas significa incumplir una promesa de seguridad de la aplicación, no solo tener un error.

**Organization**: agrupadas por historia de usuario, para que cada una se implemente, se pruebe y se entregue por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1…US6)
- Cada tarea indica su ruta de archivo exacta

## Path Conventions

Base de código única en Next.js, según la decisión de estructura de `plan.md`: `app/`, `components/`, `lib/`, `supabase/`, `public/`, `scripts/`, `tests/` en la raíz del repositorio.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicialización del proyecto y andamiaje básico.

- [X] T001 Crear la estructura de carpetas de `plan.md` (`app/`, `components/`, `lib/`, `supabase/`, `public/`, `scripts/`, `tests/`) en la raíz del repositorio
- [X] T002 Inicializar Next.js 15 con App Router, React 19 y TypeScript 5 en `package.json`, `tsconfig.json` y `next.config.ts`
- [X] T003 [P] Configurar Tailwind CSS 4 y declarar la paleta del logo (verde, amarillo, naranja, rojo, morado) como variables de diseño en `app/globals.css`
- [X] T004 [P] Configurar ESLint y Prettier en `eslint.config.mjs` y `.prettierrc`
- [X] T005 [P] Configurar Vitest para pruebas unitarias en `vitest.config.ts`
- [X] T006 [P] Configurar Playwright para pruebas de extremo a extremo en `playwright.config.ts`
- [X] T007 [P] Configurar `axe-core` para verificación WCAG 2.1 AA en `tests/a11y/configuracion.ts`
- [X] T008 Inicializar el proyecto Supabase local en `supabase/config.toml` y documentar las variables en `.env.example`
- [X] T009 [P] Fijar `lang="es"` y los metadatos base del sitio en `app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestructura que TODAS las historias necesitan.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta que esta fase esté completa.

- [X] T010 Crear la migración del esquema (tipos enumerados, 16 tablas, restricciones) a partir de `contracts/db-schema.sql` en `supabase/migrations/0001_esquema_inicial.sql`
- [X] T011 Crear la migración de disparadores —verificación de dominio, responsable activo obligatorio, autorización de autor, primera aprobación— en `supabase/migrations/0002_disparadores.sql`
- [X] T012 Crear la migración de políticas RLS y vistas públicas (`ficha_publica`, `punto_destacado_publico`) en `supabase/migrations/0003_rls_y_vistas.sql`
- [X] T013 [P] Sembrar catálogos —5 lugares, 4 medidores con series ya unificadas, categorías de biodiversidad, fila de configuración— en `supabase/seed/catalogos.sql`
- [X] T014 [P] Sembrar una ortofoto de prueba con sus teselas y su fila en `imagen_base_mapa` en `supabase/seed/imagen_prueba.sql`
- [X] T015 Implementar el cliente Supabase de navegador en `lib/supabase/cliente.ts`
- [X] T016 Implementar el cliente Supabase de servidor con propagación del token del usuario en `lib/supabase/servidor.ts`
- [X] T017 [P] Generar los tipos TypeScript del esquema en `lib/supabase/tipos.ts`
- [X] T018 [P] Implementar los umbrales del ICA en `lib/ica/umbrales.ts`, **con nota de verificación obligatoria contra el texto oficial de la Resolución 2254 de 2017** (riesgo 3 de `research.md`)
- [X] T019 [P] Implementar la función pura `calcularICA` en `lib/ica/calcular.ts`, devolviendo `categoria: null` cuando falten PM2.5 y PM10 — nunca «buena»
- [X] T020 [P] Implementar los rangos plausibles por variable en `lib/validacion/rangos.ts`
- [X] T021 [P] Implementar los componentes base del sistema de diseño (tipografía, espaciado, escala cromática del ICA) en `components/ui/`
- [X] T022 Crear los grupos de rutas `app/(publico)/layout.tsx` y `app/(privado)/layout.tsx`, con la separación pública/privada visible en el árbol de archivos

**Checkpoint**: base lista. Las historias pueden comenzar.

---

## Phase 3: User Story 1 - Explorar el mapa de biodiversidad sin cuenta (Priority: P1) 🎯 MVP

**Goal**: cualquier persona abre la aplicación y recorre el mapa del colegio con los puntos de biodiversidad, sin registrarse ni iniciar sesión.

**Independent Test**: en ventana de navegación privada, abrir la portada, recorrer el mapa, abrir tres fichas distintas y aplicar un filtro, sin que aparezca nunca una pantalla de inicio de sesión (escenario V-1 de `quickstart.md`).

### Comprobaciones críticas de seguridad ⚠️

> Estas tres van primero: comprueban que lo privado no se filtra por lo público. Deben fallar antes de existir la implementación.

- [X] T023 [P] [US1] Prueba: un cliente anónimo obtiene cero filas de `medicion` y `jornada` (no un error) en `tests/integration/rls-anonimo.test.ts`
- [X] T024 [P] [US1] Prueba: ninguna respuesta de ruta pública contiene una arroba, recorriendo todas las rutas de `app/(publico)/`, en `tests/integration/sin-correos-publicos.test.ts`
- [X] T025 [P] [US1] Prueba de extremo a extremo: la portada carga el mapa sin solicitar credenciales en `tests/e2e/mapa-publico.spec.ts`

### Implementation for User Story 1

- [X] T026 [US1] Escribir el script reproducible de generación de teselas en `scripts/generar-teselas.py` (Python puro, SIN GDAL — probado) y `scripts/generar-teselas.sh` (variante GDAL)
- [X] T027 [US1] Implementar el mapa Leaflet con `CRS.Simple` y capa de teselas en `components/mapa/MapaBase.tsx`
- [X] T028 [US1] Implementar la conversión entre coordenadas relativas (0–1) y píxeles de la imagen vigente en `lib/mapa/coordenadas.ts`
- [X] T029 [US1] Implementar la capa de marcadores que lee de la vista `ficha_publica` en `components/mapa/CapaPuntos.tsx`
- [X] T030 [P] [US1] Implementar el filtro por categoría de organismo, con actualización del conteo visible, en `components/mapa/FiltroCategorias.tsx`
- [X] T031 [P] [US1] Implementar la búsqueda por nombre común y científico, con centrado en el primer resultado, en `components/mapa/BuscadorEspecies.tsx`
- [X] T032 [P] [US1] Implementar el estado inicial explicativo para inventario vacío en `components/mapa/EstadoVacio.tsx`
- [X] T033 [US1] Implementar la página de portada con el mapa en `app/(publico)/page.tsx`
- [X] T034 [US1] Implementar la ficha pública direccionable, con identificador permanente, en `app/(publico)/especie/[id]/page.tsx`
- [X] T035 [P] [US1] Implementar la página de créditos del equipo, sujeta a autorización, en `app/(publico)/creditos/page.tsx`
- [X] T036 [US1] Implementar la carga progresiva de teselas por área y nivel de acercamiento en `components/mapa/MapaBase.tsx`, verificando carga inicial menor de 200 KB
- [X] T037 [P] [US1] Implementar gestos táctiles y diseño adaptable sin desplazamiento horizontal a 360 px en `components/mapa/MapaBase.tsx` y `app/globals.css`
- [X] T038 [P] [US1] Añadir el manifiesto web instalable en `public/manifest.json` y el ícono derivado del logo en `public/iconos/` (más `scripts/generar-iconos.py`, reproducible)

**Checkpoint**: el mapa público funciona por sí solo. **Es entregable y demostrable en una feria escolar sin ninguna otra historia.**

### Estado de verificación del MVP — 2026-08-28

Las 38 tareas de las fases 1 a 3 están escritas. Lo que se ha comprobado de verdad y lo que no:

| Comprobación | Estado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `eslint .` | ✅ 0 errores |
| `next build` | ✅ compila y genera 4 rutas; portada en 109 kB de JS inicial |
| Pruebas unitarias del ICA | ✅ 13 pasan |
| Sintaxis del script de teselas | ✅ `bash -n` limpio |
| Íconos generados desde el logo | ✅ 3 tamaños, con script reproducible |
| **Migraciones aplicadas** | ✅ **Aplicadas el 2026-09-01** en el proyecto alojado (sin Docker) |
| **Pruebas de RLS (T023) y de correos (T024)** | ✅ **EJECUTADAS Y SUPERADAS** contra la base real |
| **Prueba de extremo a extremo (T025)** | ✅ **Ejecutada** contra la aplicación en marcha |
| **Teselas del mapa generadas** | ❌ **no ejecutadas** — falta GDAL |

**Ejecutadas el 2026-09-01 contra el proyecto Supabase real.** 82 pruebas pasan, ninguna omitida.

Para que llegaran a ejecutarse hubo que corregir tres errores propios:

1. **Vitest no cargaba `.env.local`.** Sin credenciales, las pruebas se omitían y `pnpm test` salía en verde: peor que un fallo, porque aparentaba que la seguridad estaba comprobada. Resuelto con `tests/entorno.ts` en `setupFiles`.
2. **`it.skipIf()` se evalúa al RECOLECTAR, antes de `beforeAll`.** La sonda de alcance vivía en un `beforeAll`, así que la bandera siempre valía `false` y estas pruebas se habrían omitido SIEMPRE, hubiera base de datos o no. Resuelto moviendo la sonda al nivel superior del módulo con `await`.
3. **La sonda usaba solo la cabecera `apikey`**, y la API REST de Supabase exige además `Authorization: Bearer`. Devolvía 401 y se interpretaba como «no alcanzable». Resuelto consultando con el propio cliente.

Y un falso positivo: el patrón de búsqueda de correos marcaba los identificadores de paquetes que Next.js incrusta en modo desarrollo (`next@15.5.24_`). Se exigió un dominio de primer nivel alfabético; comprobado contra el HTML real: 2 falsos positivos antes, 0 ahora, y sigue detectando un correo de verdad.

Dos ajustes de dependencias hechos durante la implementación, ambos por fallos reales de compilación:

- `@supabase/ssr` subió de 0.5.2 a 0.12.5. La versión antigua inferí­a `never` en toda consulta con lista de columnas, lo que anulaba por completo la comprobación de tipos contra el esquema.
- `eslint-config-next` subió a 16.x. La 15.x no arranca sobre ESLint 9 con configuración plana.

Un ajuste de diseño en `lib/supabase/tipos.ts`: los tipos de fila se declaran como alias de tipo y no como interfaces. En TypeScript una interfaz no es asignable a `Record<string, unknown>`, que es lo que exige `GenericSchema` de postgrest-js; con interfaces, toda consulta se infiere como `never`.

Queda anotado en `app/(publico)/creditos/page.tsx` que la página de créditos necesitará una vista pública `integrante_publico` al implementar US2. Hoy consulta la tabla `integrante`, que un anónimo no puede leer —correctamente—, así que la lista aparece vacía. **No debe resolverse abriendo la tabla al público**, que sería la salida fácil y expondría los correos.

---

## Phase 4: User Story 2 - Ingresar con correo institucional (Priority: P2)

**Goal**: los 10 integrantes acceden con su correo institucional a una zona privada; nadie más entra y nadie se registra por su cuenta.

**Independent Test**: probar los tres casos —autorizado, institucional no autorizado, dominio ajeno— y comprobar que cada uno da un mensaje distinto (escenario V-2 de `quickstart.md`).

- [ ] T039 [P] [US2] Prueba: los tres casos de acceso devuelven resultados y mensajes distinguibles en `tests/integration/acceso.test.ts` — PENDIENTE: necesita Supabase en marcha
- [X] T040 [US2] Implementar el inicio de sesión por enlace mágico contra la tabla de autorizados en `lib/auth/enlaceMagico.ts`
- [X] T041 [US2] Implementar la verificación de dominio configurable y de pertenencia a la lista, con mensajes diferenciados, en `lib/auth/verificarAcceso.ts`
- [X] T042 [US2] Implementar la página de inicio de sesión en `app/login/page.tsx`
- [X] T043 [US2] Implementar el middleware que protege `app/(privado)/` y conserva la ruta solicitada para volver a ella tras autenticarse, en `middleware.ts`
- [X] T044 [US2] Implementar la persistencia de sesión entre usos y el cierre de sesión explícito en `lib/auth/sesion.ts`
- [X] T045 [P] [US2] Implementar la cabecera de la zona privada con identidad visible y salida de sesión en `components/ui/CabeceraPrivada.tsx`
- [X] T046 [US2] Implementar la administración de integrantes —alta, baja lógica, rol— en `app/(privado)/admin/integrantes/page.tsx`
- [ ] T047 [P] [US2] Implementar la administración de catálogos de lugares y medidores en `app/(privado)/admin/catalogos/page.tsx`

**Checkpoint**: la zona privada existe y está protegida. El mapa público sigue abierto.

---

## Phase 5: User Story 3 - Registrar una jornada de mediciones (Priority: P2)

**Goal**: un integrante registra jornadas de hasta 8 mediciones desde el celular, dentro de un taller sin señal, sin perder ni duplicar datos.

**Independent Test**: registrar 7 mediciones en modo avión, cerrar la aplicación, reiniciar el navegador, restablecer la conexión y comprobar que se sincronizan exactamente 7 filas; forzar una segunda sincronización y comprobar que no se crea ninguna (escenario V-3 de `quickstart.md`).

### Comprobación crítica ⚠️

- [ ] T048 [P] [US3] Prueba: enviar la misma cola diez veces seguidas deja el mismo número de filas en `tests/integration/sincronizacion-idempotente.test.ts`

### Implementation for User Story 3

- [ ] T049 [US3] Definir el esquema de la cola local en IndexedDB con Dexie en `lib/offline/baseLocal.ts`
- [ ] T050 [US3] Implementar la generación de identificadores en el cliente **antes** de guardar en local en `lib/offline/identificadores.ts`
- [ ] T051 [US3] Implementar el encolado de jornadas y mediciones, persistente al cierre de la aplicación, en `lib/offline/cola.ts`
- [ ] T052 [US3] Implementar la ruta de sincronización idempotente con `on conflict do nothing` en `app/api/sincronizar/route.ts`
- [ ] T053 [US3] Implementar el disparador de sincronización automática al recuperar conexión en `lib/offline/sincronizar.ts`
- [ ] T054 [P] [US3] Implementar el indicador de estado sin conexión y contador de pendientes en `components/mediciones/IndicadorConexion.tsx`
- [ ] T055 [US3] Implementar el service worker que permite abrir la aplicación sin conexión en `public/sw.js` y su registro en `lib/offline/registrarSW.ts`
- [ ] T056 [US3] Implementar el inicio de jornada con selección obligatoria de lugar y medidor desde catálogo, sin texto libre, en `app/(privado)/jornadas/nueva/page.tsx`
- [ ] T057 [US3] Implementar el formulario de las 11 variables con teclado numérico en móvil en `components/mediciones/FormularioMedicion.tsx`
- [ ] T058 [US3] Implementar la normalización de entrada que rechaza texto en campos numéricos (`27°` → `27`) en `lib/validacion/normalizarNumero.ts`
- [ ] T059 [US3] Implementar la advertencia con confirmación explícita para valores fuera de rango, sin impedir el guardado, en `components/mediciones/AvisoFueraDeRango.tsx`
- [ ] T060 [US3] Implementar la distinción entre variable no medida (`null`) y medida en cero en `components/mediciones/FormularioMedicion.tsx`
- [ ] T061 [US3] Implementar la corrección de mediciones guardadas conservando autor y fecha de modificación en `app/(privado)/jornadas/[id]/editar/page.tsx`
- [ ] T062 [US3] Implementar el cierre de jornada con resumen de conteo, rango horario y promedios en `app/(privado)/jornadas/[id]/page.tsx`
- [ ] T063 [P] [US3] Implementar el aviso de medición fuera del horario habitual (12:00–15:00) en `components/mediciones/FormularioMedicion.tsx`
- [ ] T064 [P] [US3] Implementar el aviso de solapamiento cuando dos integrantes abren jornada para el mismo lugar y medidor en `lib/mediciones/detectarSolapamiento.ts`

**Checkpoint**: se pueden registrar mediciones en campo, con o sin señal.

---

## Phase 6: User Story 4 - Consultar los tableros de resultados (Priority: P3)

**Goal**: el equipo ve la evolución de cada variable, compara lugares y exporta los datos. Incluye traer los 135 registros históricos, sin los cuales los tableros están vacíos.

**Independent Test**: con el histórico migrado, comprobar que el total es exactamente 135, comparar PM2.5 entre dos talleres, cambiar el rango de fechas y exportar, verificando que el archivo coincide con la pantalla (escenario V-4 de `quickstart.md`).

### Migración e importación del histórico

- [ ] T065 [US4] Implementar el lector de la hoja `LongData` con SheetJS, emparejando columnas por posición y prefijo laxo, en `lib/importar/leerLongData.ts`
- [ ] T066 [P] [US4] Implementar los normalizadores de valores —símbolos, ceros a la izquierda, vacío distinto de cero— en `lib/importar/normalizarValores.ts`
- [ ] T067 [P] [US4] Implementar la normalización de nombres de lugar contra el catálogo, sin distinguir acentos ni mayúsculas, en `lib/importar/normalizarLugar.ts`
- [ ] T068 [P] [US4] Implementar la unificación de series de medidor (`9032` → `32`) en `lib/importar/normalizarMedidor.ts`
- [ ] T069 [P] [US4] Implementar la resolución de alias históricos contra `alias_historico`, rechazando los no correspondidos, en `lib/importar/resolverAutor.ts`
- [ ] T070 [US4] Implementar la agrupación de filas planas en jornadas por `(fecha, lugar, medidor, autor)` en `lib/importar/agruparJornadas.ts`
- [ ] T071 [US4] Implementar la deduplicación por clave natural `(fecha, hora, lugar, medidor)` en `lib/importar/deduplicar.ts`
- [ ] T072 [US4] Implementar la ruta de previsualización que no escribe nada en `app/api/importar/previsualizar/route.ts`
- [ ] T073 [US4] Implementar la ruta de confirmación de lote en `app/api/importar/confirmar/route.ts`
- [ ] T074 [US4] Implementar la interfaz de importación con resumen de aceptados, corregidos y rechazados en `app/(privado)/admin/importar/page.tsx`
- [ ] T075 [US4] Implementar el script de migración única del histórico, con modo `--dry-run` obligatorio, en `scripts/migrar-historico.ts`
- [ ] T076 [P] [US4] Implementar el marcado de `dato_dudoso` para registros no normalizables con certeza en `lib/importar/marcarDudoso.ts`

### Tableros

- [ ] T077 [US4] Implementar las consultas agregadas por variable, lugar y rango de fechas en `lib/tableros/consultas.ts`
- [ ] T078 [US4] Implementar la gráfica de serie temporal por variable con Recharts en `components/tableros/SerieTemporal.tsx`
- [ ] T079 [P] [US4] Implementar la comparación de una variable entre lugares en `components/tableros/ComparacionLugares.tsx`
- [ ] T080 [US4] Implementar los filtros de fecha, lugar y variable aplicados de forma consistente a todo el tablero en `components/tableros/Filtros.tsx`
- [ ] T081 [US4] Mostrar la categoría ICA junto a cada valor, con su color y **solo** para PM2.5 y PM10, en `components/tableros/EtiquetaICA.tsx`
- [ ] T082 [US4] Mostrar por separado y etiquetados el `aqi_medidor` y el ICA calculado en `components/tableros/ComparacionIndices.tsx`
- [ ] T083 [US4] Mostrar la advertencia de que son lecturas puntuales y no promedios de 24 horas en `components/tableros/AvisoVentanaTemporal.tsx`
- [ ] T084 [P] [US4] Implementar el mensaje explícito de ausencia de datos en un rango en `components/tableros/SinDatos.tsx`
- [ ] T085 [US4] Implementar la página de tableros en `app/(privado)/tableros/page.tsx`
- [ ] T086 [US4] Implementar la ruta de exportación filtrada en `.xlsx` y `.csv` con BOM en `app/api/exportar/route.ts`
- [ ] T087 [P] [US4] Implementar el respaldo completo del proyecto, con fotografías adjuntas, en `app/api/exportar/completo/route.ts`
- [ ] T088 [P] [US4] Implementar el desplazamiento interno de tablas anchas sin romper el ancho de página en `components/tableros/TablaDesplazable.tsx`
- [ ] T089 [P] [US4] Pruebas unitarias del cálculo del ICA, con al menos un valor por cada una de las seis categorías, en `tests/unit/ica.test.ts`

**Checkpoint**: el histórico está dentro y los tableros lo explican.

---

## Phase 7: User Story 5 - Documentar una especie en el inventario (Priority: P3)

**Goal**: los estudiantes documentan especies con foto y ubicación; el responsable aprueba la primera publicación; después el estudiante edita libremente.

**Independent Test**: crear una ficha, enviarla a revisión, comprobar que **no** aparece en el mapa público, rechazarla con motivo, reenviarla, aprobarla, verla en el mapa, y editarla comprobando que el cambio sale sin nueva aprobación (escenario V-5 de `quickstart.md`).

### Comprobación crítica ⚠️

- [ ] T090 [P] [US5] Prueba: activar `mostrar_autor` de un menor sin autorización se rechaza **atacando directamente la base de datos**, saltándose la interfaz, en `tests/integration/proteccion-menores.test.ts`

### Implementation for User Story 5

- [X] T091 [US5] Implementar el formulario de ficha con nombres, categoría y descripción en `app/(privado)/fichas/nueva/page.tsx`
- [X] T092 [US5] Implementar la captura o carga de fotografía con redimensionado en el cliente antes de subir en `components/fichas/CargarFoto.tsx`
- [X] T093 [US5] Implementar la subida a Supabase Storage en el bucket `fotos-fichas` en `lib/storage/subirFoto.ts`
- [X] T094 [US5] Implementar la ubicación del registro tocando la ortofoto, guardada en coordenadas relativas, en `components/fichas/SelectorUbicacion.tsx`
- [X] T095 [US5] Implementar el bloqueo de publicación con campos incompletos, indicando cuáles faltan, en `lib/fichas/validarCompletitud.ts`
- [X] T096 [US5] Implementar las transiciones de estado borrador → en revisión → publicado → despublicado en `lib/fichas/transiciones.ts`
- [X] T097 [US5] Implementar la bandeja de pendientes del responsable, con antigüedad y destacado de las olvidadas, en `app/(privado)/revision/page.tsx`
- [X] T098 [US5] Implementar la aprobación, que marca `aprobada_alguna_vez`, en `lib/fichas/aprobar.ts`
- [X] T099 [US5] Implementar el rechazo con motivo obligatorio y retorno a borrador en `lib/fichas/rechazar.ts`
- [ ] T100 [US5] Implementar la edición directa sin nueva aprobación para fichas ya aprobadas en `app/(privado)/fichas/[id]/editar/page.tsx`
- [X] T101 [US5] Implementar la vista de estado de las fichas propias para el autor en `app/(privado)/fichas/page.tsx`
- [X] T102 [US5] Implementar el ajuste `mostrar_autor` por ficha, desactivado por omisión, en `components/fichas/VisibilidadAutor.tsx`
- [X] T103 [US5] Implementar el registro de autorizaciones de acudiente por el responsable en `app/(privado)/admin/autorizaciones/page.tsx`
- [X] T104 [P] [US5] Implementar la atribución al equipo cuando `mostrar_autor` está desactivado en `components/fichas/Atribucion.tsx`
- [X] T105 [P] [US5] Implementar la advertencia sobre personas identificables al publicar una foto en `components/fichas/AvisoPersonas.tsx`
- [X] T106 [P] [US5] Implementar el despublicado conservando el historial para el equipo en `lib/fichas/despublicar.ts`

**Checkpoint**: el inventario crece solo, con filtro de calidad y protección de menores.

---

## Phase 8: User Story 1 (extensión) - Vistas inmersivas y puntos destacados

**Goal**: navegación inmersiva en los puntos con biodiversidad o alta contaminación, y marcado manual de esos puntos por el responsable.

> **⚠️ BLOQUEADA en el inventario del material de dron** (pendiente 4 de `spec.md`). El formato de las vistas no puede decidirse hasta saber qué material existe. Se separa en su propia fase precisamente para que **no bloquee la entrega del MVP ni de ninguna otra historia**.

**Independent Test**: comprobar que los puntos con vista inmersiva se distinguen antes de abrirlos, que nada inmersivo se descarga hasta abrir uno, y que un punto sin material funciona con normalidad (escenario V-6 de `quickstart.md`).

- [X] T107 [US1] Inventariado el material de dron: 6 videos, 420 fotogramas analizados. **Ninguna toma cenital** → no sirve como base del mapa. Formato = `video` (no hay 360°). 14 tramos verificados sin personas y 8 impublicables por rostros de menores. 10 clips generados en `public/inmersivas/` (27 MB). Ver `docs/inventario-dron.md`
- [ ] T108 [US1] Implementar el visor de panorámicas 360° con Photo Sphere Viewer en `components/inmersiva/VisorPanorama.tsx`
- [ ] T109 [P] [US1] Implementar el visor de foto de alto detalle reutilizando el teselado de Leaflet en `components/inmersiva/VisorFotoDetalle.tsx`
- [ ] T110 [P] [US1] Implementar el visor de video con elemento nativo en `components/inmersiva/VisorVideo.tsx`
- [ ] T111 [US1] Implementar el conmutador que elige visor según `tipo_medio` en `components/inmersiva/Visor.tsx`
- [ ] T112 [US1] Implementar el respaldo visual cuando el medio no puede reproducirse, sin mostrar error técnico, en `components/inmersiva/Respaldo.tsx`
- [ ] T113 [US1] Implementar la página del visor inmersivo, accesible sin cuenta, en `app/(publico)/inmersiva/[puntoId]/page.tsx`
- [ ] T114 [US1] Implementar el retorno al mapa conservando posición y nivel de acercamiento en `lib/mapa/estadoNavegacion.ts`
- [ ] T115 [US1] Implementar la señalización en el mapa de qué puntos tienen vista inmersiva en `components/mapa/CapaPuntos.tsx`
- [ ] T116 [US1] Implementar la carga diferida: nada inmersivo se descarga hasta abrir una vista, en `components/inmersiva/Visor.tsx`
- [ ] T117 [US1] Implementar el marcado manual de puntos de alta contaminación por el responsable en `app/(privado)/admin/destacados/page.tsx`
- [ ] T118 [US1] Mostrar al responsable el resumen de PM2.5, PM10 y categoría ICA **antes** de confirmar el marcado en `components/destacados/ResumenLugar.tsx`
- [ ] T119 [US1] Implementar el aviso al responsable cuando los datos dejan de respaldar una marca, **sin retirarla automáticamente**, en `lib/destacados/revisarVigencia.ts`
- [ ] T120 [P] [US1] Mostrar al público la categoría cualitativa de un punto destacado, sin valores detallados ni acceso a tableros, en `app/(publico)/page.tsx`

**Checkpoint**: el mapa gana profundidad sin haber retrasado nada.

---

## Phase 9: User Story 6 - Conocer la estación fija y los instrumentos (Priority: P4)

**Goal**: el visitante entiende de dónde salen los datos y qué mide cada instrumento didáctico.

**Independent Test**: abrir el punto de la estación desde una sesión anónima y recorrer la sección de instrumentos, comprobando que cada uno tiene foto, variable y explicación.

- [ ] T121 [P] [US6] Sembrar los puntos de interés didáctico —estación fija e instrumentos— en `supabase/seed/didacticos.sql`
- [ ] T122 [US6] Implementar la página de la estación meteorológica fija del parque San José en `app/(publico)/estacion/page.tsx`
- [ ] T123 [P] [US6] Implementar la ficha de cada instrumento con foto, variable y explicación escolar en `components/didactico/FichaInstrumento.tsx`
- [ ] T124 [P] [US6] Implementar la sección explicativa de la red SIATA y su relación con las mediciones del colegio en `components/didactico/SobreSIATA.tsx`
- [ ] T125 [US6] Enlazar el punto de la estación desde el mapa público en `components/mapa/CapaPuntos.tsx`

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T126 **Verificado**: puntos de corte del ICA contrastados contra la Tabla 6 del Art. 20 de la Resolución 2254 de 2017 (imagen nativa del texto oficial + PDF del INS + Corponor + IDEAM), con 3 refutaciones independientes que no lograron desmentirlos. Se CORRIGIÓ PM2.5 —la tabla colombiana usa enteros (13–37, 38–55, 56–150), no los decimales de la EPA que estaban puestos—, se fijó la regla de redondeo y se añadió `superaLimiteNormativo()` porque el ICA de PM10 no está calibrado contra la norma colombiana
- [ ] T127 [P] Ejecutar la auditoría de accesibilidad WCAG 2.1 AA sobre todas las pantallas en `tests/a11y/todas-las-pantallas.test.ts`
- [ ] T128 [P] Verificar la ausencia de desplazamiento horizontal a 360 px en todas las pantallas en `tests/e2e/responsive.spec.ts`
- [ ] T129 [P] Medir y ajustar el tiempo de carga del mapa contra el objetivo de 3 segundos en `tests/e2e/rendimiento.spec.ts`
- [ ] T130 [P] Documentar el proceso de despliegue y el traspaso al colegio en `docs/mantenimiento.md` (parcialmente cubierto por `docs/PASO-A-PASO.md`)
- [X] T131 [P] Documentar cómo regenerar las teselas tras un nuevo vuelo de dron en `docs/actualizar-mapa.md`
- [X] T132 Configurar el dominio `institutopedrojustoberrio.com` y el despliegue en `vercel.json`
- [ ] T133 Ejecutar la validación completa de `quickstart.md`, escenarios V-1 a V-7

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias
- **Foundational (Fase 2)**: depende de Setup — **BLOQUEA todas las historias**
- **US1 core (Fase 3)**: depende de Fase 2. Sin dependencias de otras historias
- **US2 (Fase 4)**: depende de Fase 2
- **US3 (Fase 5)**: depende de US2 — necesita saber quién mide
- **US4 (Fase 6)**: depende de Fase 2. Los tableros ganan sentido con US3 o con el histórico migrado
- **US5 (Fase 7)**: depende de US2 (autoría) y de US1 (el mapa donde ubicar)
- **US1 extensión (Fase 8)**: depende de US1 core, de US2 para el marcado, y **del inventario de dron**
- **US6 (Fase 9)**: depende de US1 core
- **Polish (Fase 10)**: depende de las historias que se decidan entregar

### Ruta crítica del MVP

```text
Fase 1 (Setup) → Fase 2 (Foundational) → Fase 3 (US1) → ENTREGABLE
```

**El MVP no depende de ningún pendiente del colegio** salvo la ortofoto, y para eso hay imagen de prueba sembrada en T014.

### Parallel Opportunities

- **Fase 1**: T003 a T007 y T009 en paralelo
- **Fase 2**: T013, T014, T017, T018, T019, T020, T021 en paralelo tras las migraciones
- **Fase 3**: las tres comprobaciones críticas T023–T025 en paralelo; después T030, T031, T032, T035, T037, T038
- **Fase 5**: T054, T063, T064 en paralelo
- **Fase 6**: los normalizadores T066–T069 en paralelo entre sí
- **Fase 7**: T104, T105, T106 en paralelo
- **Con varias personas**: tras la Fase 2, una puede tomar US1 y otra US2 → US3 sin pisarse

---

## Parallel Example: User Story 1

```bash
# Las tres comprobaciones críticas de seguridad, juntas:
Tarea: "Prueba RLS de lectura anónima en tests/integration/rls-anonimo.test.ts"
Tarea: "Prueba de no exposición de correos en tests/integration/sin-correos-publicos.test.ts"
Tarea: "Prueba E2E del mapa sin login en tests/e2e/mapa-publico.spec.ts"

# Los componentes independientes del mapa, juntos:
Tarea: "Filtro por categoría en components/mapa/FiltroCategorias.tsx"
Tarea: "Buscador de especies en components/mapa/BuscadorEspecies.tsx"
Tarea: "Estado vacío en components/mapa/EstadoVacio.tsx"
```

---

## Implementation Strategy

### MVP primero (solo US1)

1. Fase 1: Setup
2. Fase 2: Foundational — **crítica, bloquea todo**
3. Fase 3: US1
4. **PARAR Y VALIDAR**: escenario V-1 de `quickstart.md`
5. Desplegar. Ya hay algo que enseñar en una feria escolar.

### Entrega incremental

1. Setup + Foundational → base lista
2. US1 → mapa público → **MVP desplegable**
3. US2 → la zona privada existe
4. US3 → se dejan de usar formularios externos
5. US4 → los 135 registros históricos cobran sentido
6. US5 → el inventario crece solo
7. US6 → el proyecto se explica a sí mismo
8. Fase 8 → profundidad visual, cuando llegue el material de dron

### Orden recomendado si hay que recortar

Si el tiempo escolar aprieta, el orden de valor por esfuerzo es **US1 → US3 → US2 → US4**. US3 antes que US4 porque dejar de capturar con el formulario actual detiene la generación de datos sucios; los tableros pueden esperar, la calidad de los datos no.

---

## Notes

- Tareas `[P]` = archivos distintos, sin dependencias pendientes
- Las cuatro comprobaciones críticas (T023, T024, T048, T090) no son opcionales: verifican promesas de seguridad de la aplicación, no comodidades
- **T126 no puede omitirse**: implementar los umbrales del ICA sin verificar la norma oficial etiquetaría mal el aire de un colegio
- Cinco tareas dependen de datos que solo el colegio posee (T013, T075, T107, T121 y el alta real de integrantes en T046); todas tienen datos de siembra para no bloquear el desarrollo
- Confirmar la regla de unificación de medidores (T068) con el equipo **antes** de ejecutar T075: si fueran ocho equipos distintos y no cuatro, la migración mezclaría lecturas de aparatos diferentes
