# Quickstart — NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb · **Fase 1**

Cómo poner en marcha el entorno y cómo comprobar que la funcionalidad realmente cumple lo que promete la especificación. No contiene código de implementación: eso corresponde a `tasks.md`.

---

## Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 LTS | Ejecutar la aplicación |
| pnpm | 9+ | Gestión de dependencias |
| Docker Desktop | Actual | Supabase local |
| Supabase CLI | 1.200+ | Migraciones y entorno local |
| GDAL (`gdal2tiles`) | 3.x | Generar las teselas del mapa (una sola vez) |

### Insumos que debe aportar el colegio

Cinco de los siete catálogos iniciales dependen de datos que solo tiene el equipo. Sin ellos se puede desarrollar, pero no validar de extremo a extremo:

| # | Insumo | Sin él no se puede |
|---|---|---|
| 1 | Ortofoto de dron del predio | Generar el mapa base |
| 2 | Inventario del material de dron | Decidir el formato de las vistas inmersivas |
| 3 | Nombre real del lugar `Op` | Importar 12 de los 135 registros |
| 4 | Los 10 correos institucionales | Probar el acceso real |
| 5 | Correspondencia alias → integrante | Atribuir la autoría del histórico |
| 6 | Texto oficial de la Resolución 2254 de 2017 | Fijar los puntos de corte del ICA |

Para desarrollar sin ellos hay datos de siembra ficticios en `supabase/seed/`.

---

## Puesta en marcha

```bash
pnpm install
supabase start                    # PostgreSQL + Auth + Storage locales
supabase db reset                 # Aplica migraciones y datos de siembra
cp .env.example .env.local        # Rellenar con las claves que imprime supabase start
pnpm dev                          # http://localhost:3000
```

### Generar las teselas del mapa (una sola vez por ortofoto)

```bash
./scripts/generar-teselas.sh ruta/a/ortofoto-colegio.tif public/mapa/tiles
```

Usa `gdal2tiles` en modo `raster`, que trabaja sobre imágenes sin georreferenciar (research.md, R-002). El script debe quedar reproducible: cuando el colegio vuelva a volar el dron, esto se repite sin ayuda técnica.

Sin ortofoto real, `supabase/seed/` incluye una imagen de prueba con sus teselas ya generadas.

### Migrar el histórico (una sola vez)

```bash
pnpm tsx scripts/migrar-historico.ts ../../MEDIDORES.xlsx --dry-run   # Previsualiza
pnpm tsx scripts/migrar-historico.ts ../../MEDIDORES.xlsx             # Aplica
```

`--dry-run` es obligatorio la primera vez: imprime aceptados, corregidos y rechazados sin escribir nada.

---

## Escenarios de validación

Cada escenario prueba una historia de usuario completa y es verificable por una persona sin conocimientos técnicos. Los identificadores entre paréntesis remiten a los criterios de éxito de la especificación.

### V-1 · El mapa público no pide cuenta (Historia 1)

1. Abrir una ventana de navegación privada, sin sesión.
2. Ir a `http://localhost:3000`.

**Debe ocurrir**: aparece el mapa sobre la ortofoto con los puntos publicados. **En ningún momento se muestra pantalla de inicio de sesión.**

3. Tocar un punto → se abre la ficha con foto, nombres, categoría y descripción.
4. Filtrar por categoría → solo quedan los puntos de esa categoría y el conteo se actualiza.
5. Copiar el enlace de la ficha y abrirlo en otra ventana privada → abre directo, sin autenticar.

**Falla si**: aparece cualquier solicitud de credenciales (SC-001), o el mapa tarda más de 3 segundos en quedar utilizable (SC-002).

### V-2 · El acceso distingue los tres casos de rechazo (Historia 2)

Probar en orden, comprobando que **cada caso da un mensaje distinto**:

| Correo | Resultado esperado |
|---|---|
| Uno de la lista de autorizados | Entra y ve su nombre en la interfaz |
| Del dominio institucional, pero fuera de la lista | Rechazo: «no autorizada para el proyecto» |
| De un dominio ajeno (`@gmail.com`) | Rechazo: «solo se admiten correos institucionales» |

Luego, con sesión abierta, pedir directamente `/tableros` desde una ventana sin sesión: debe redirigir a inicio de sesión y, tras autenticarse, llegar a `/tableros` y no a la portada (SC-003).

### V-3 · Registrar una jornada completa sin conexión (Historia 3)

Es el escenario más importante: reproduce el uso real dentro de un taller sin señal.

1. Iniciar sesión como integrante y abrir el registro de mediciones.
2. **Activar el modo avión** del dispositivo, o cortar la red en las herramientas del navegador.
3. Iniciar jornada: elegir lugar y medidor de las listas. Comprobar que **no se puede escribir texto libre** en ninguno de los dos.
4. Registrar 7 mediciones con las 11 variables.
5. Comprobar que la pantalla indica que se trabaja sin conexión y cuántas mediciones quedan pendientes (FR-027a).
6. **Cerrar la aplicación por completo y reiniciar el navegador.** Volver a abrir: las 7 mediciones siguen ahí (FR-027b).
7. Restablecer la conexión.

**Debe ocurrir**: las 7 se sincronizan solas. En la base de datos hay exactamente 7 filas nuevas.

8. Forzar una segunda sincronización de la misma cola.

**Debe ocurrir**: cero filas nuevas (SC-011, SC-011b).

**Durante el paso 4, comprobar también**:

- Escribir `27°` en temperatura → se rechaza o se normaliza a `27`. Nunca se guarda como texto (SC-006).
- Escribir un valor absurdo, como 900 °C → advertencia con confirmación explícita, **pero permite guardar** (FR-024).
- Dejar una variable vacía → se guarda como «no medido», distinto de cero (FR-025).

### V-4 · Los tableros no mienten (Historia 4)

1. Con el histórico migrado, abrir tableros.
2. Comprobar que el total de mediciones es **exactamente 98** más lo registrado en pruebas, repartidas en **15 jornadas**, y que el informe de la migración enumera las **37 rechazadas** por venir sin lugar ni medidor (SC-007). 98 + 37 = 135, el conteo del archivo de origen.
3. Comparar PM2.5 entre Taller de Mecánica Industrial y Ebanistería.
4. Ajustar el rango de fechas: **todas** las gráficas deben cambiar a la vez.
5. Seleccionar un rango sin datos → mensaje explícito de ausencia, no una gráfica vacía (FR-037).
6. Exportar y abrir el archivo: las filas deben coincidir con lo mostrado en pantalla.

**Comprobación crítica del ICA** (research.md, R-004):

- Un valor de PM2.5 debe mostrar la misma categoría que la tabla oficial de la Resolución 2254 de 2017. Verificar al menos un valor por cada una de las seis categorías (SC-012a).
- Una medición **sin** `pm25` ni `pm10` debe mostrar «categoría no disponible». **Nunca «buena».**
- `CO₂`, `HCHO`, `TVOC`, `PM1`, temperatura y humedad **no** deben mostrar ninguna categoría de calidad del aire (SC-012b).
- El `AQI` del medidor y el ICA calculado deben aparecer **por separado y etiquetados** (FR-035d).
- Debe verse la advertencia de que son lecturas puntuales y no promedios de 24 horas.

### V-5 · Revisión y autoría de fichas (Historia 5)

1. Como integrante, crear una ficha con foto y ubicación tocando la ortofoto.
2. Intentar publicarla con un campo vacío → se impide, indicando qué falta (FR-041).
3. Completarla y enviarla a revisión.
4. **Desde una ventana sin sesión, comprobar que el punto NO aparece** en el mapa.
5. Como responsable, abrir la bandeja de pendientes: la ficha está ahí.
6. Rechazarla con un motivo → vuelve a borrador y el autor ve el motivo (FR-038d).
7. Reenviarla y aprobarla → aparece en el mapa público de inmediato.
8. Como autor, editar el texto de la ficha ya aprobada → **el cambio sale directo, sin nueva aprobación** (FR-038c).

**Comprobación de protección de menores** (SC-010b):

9. Con un integrante marcado como menor y **sin** autorización de acudiente, intentar activar la visibilidad de su nombre.

**Debe ocurrir**: se rechaza. Y debe rechazarse también **al intentarlo directamente contra la base de datos**, no solo desde la interfaz — la regla vive en un disparador precisamente para que ningún cliente pueda saltársela.

10. Registrar la autorización desde la cuenta del responsable → ahora sí se puede activar.
11. Desactivarla de nuevo → el nombre desaparece del público al instante y la ficha sigue publicada, atribuida al equipo (FR-051f).

### V-6 · Vistas inmersivas y puntos destacados

1. Abrir el mapa sin sesión y comprobar que se distingue **antes de tocarlos** qué puntos tienen vista inmersiva (FR-010e).
2. Abrir las herramientas de red del navegador y recargar: **no debe descargarse ningún archivo de vista inmersiva** hasta que se abra una (SC-002a).
3. Abrir una vista inmersiva y cerrarla → el mapa vuelve a la misma posición y acercamiento de antes (FR-010g).
4. Abrir un punto **sin** material inmersivo → funciona con normalidad, sin huecos ni errores (FR-010c, SC-002c).
5. Como responsable, marcar un lugar como de alta contaminación: debe mostrarse el resumen de PM2.5 y PM10 de ese lugar **antes** de confirmar (FR-010l).
6. Desde una ventana sin sesión, abrir ese punto: se ve la categoría cualitativa, **no** los valores detallados ni acceso a tableros (A-010d).

### V-7 · Instalación y comportamiento móvil

1. Abrir la aplicación en un teléfono e instalarla desde el navegador.
2. Debe abrirse desde el ícono, a pantalla completa, sin barra de navegador (FR-045b, SC-011a).
3. Comprobar en un ancho de 360 px que **ninguna** pantalla exige desplazamiento horizontal de página; las tablas anchas se desplazan dentro de su propio contenedor (SC-013).
4. En el formulario de mediciones, los campos numéricos deben abrir teclado numérico (FR-046).

---

## Comprobaciones automatizadas

```bash
pnpm test              # Vitest: cálculo del ICA, normalizadores, validadores
pnpm test:e2e          # Playwright: V-1, V-3 y V-5 automatizados
pnpm test:a11y         # axe-core: WCAG 2.1 AA (research.md, R-010)
pnpm test:rls          # Políticas RLS contra la base de datos
```

### Las pruebas que más importan

Cuatro comprobaciones justifican por sí solas la suite, porque fallar en ellas significa fallar en algo que la aplicación promete proteger:

1. **El anónimo no puede leer `medicion` ni `jornada`.** Consultar esas tablas sin sesión debe devolver cero filas, no un error — que devuelva filas sería la fuga más grave posible (FR-015).
2. **`integrante.correo` no aparece en ninguna respuesta pública.** Recorrer todas las rutas públicas y verificar que no hay una sola arroba en la carga útil (FR-051).
3. **La sincronización es idempotente.** Enviar la misma cola diez veces seguidas deja exactamente el mismo número de filas (SC-011).
4. **`mostrar_autor` no puede activarse sin autorización.** Probado directamente contra la base de datos, saltándose la interfaz (FR-051d).

---

## Criterio de aceptación de la Fase 1

El diseño se considera validado cuando los siete escenarios `V-` pasan sobre datos de siembra y las cuatro comprobaciones críticas están automatizadas.

Los escenarios que dependen de insumos del colegio —ortofoto real, histórico completo, correos institucionales— se validan primero con datos ficticios y se repiten cuando lleguen los reales.
