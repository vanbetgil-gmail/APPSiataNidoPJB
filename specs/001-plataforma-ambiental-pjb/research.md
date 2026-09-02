# Phase 0 — Investigación: NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb
**Fecha**: 2026-08-28
**Propósito**: resolver las incógnitas técnicas de la especificación antes de diseñar. Cada apartado registra la decisión, su justificación y las alternativas descartadas.

---

## R-001. Cómo representar un mapa que no es geográfico

**Incógnita**: la spec (FR-006, FR-006a, A-010) exige un mapa basado en una toma aérea de dron, con puntos marcados a mano y sin coordenadas geográficas ni GPS. Las librerías de mapas asumen coordenadas del mundo real.

**Decisión**: **Leaflet con `L.CRS.Simple`** y la ortofoto de dron como capa de imagen.

`CRS.Simple` sustituye el sistema de coordenadas geográficas por un plano cartesiano en píxeles. Las posiciones se guardan como pares `(x, y)` referidos a la imagen, exactamente el modelo que pide FR-006a. Se conservan gratis el acercamiento, el desplazamiento, los marcadores, los grupos y los gestos táctiles.

**Justificación**:

- Es el caso de uso para el que existe `CRS.Simple`: planos de edificios, mapas de videojuegos, imágenes escaneadas.
- No hay proveedor de mapas, ni clave de API, ni cuota, ni costo — coherente con A-010.
- Leaflet pesa ~40 KB comprimido y no depende de nada más.
- Al ser coordenadas relativas a la imagen, FR-006c (reemplazar la imagen sin descolocar los puntos) se resuelve versionando la imagen base y guardando la posición como fracción del ancho y alto, no como píxel absoluto.

**Alternativas descartadas**:

| Alternativa | Por qué no |
|---|---|
| Google Maps / Mapbox con la ortofoto georreferenciada encima | Exige georreferenciar el vuelo de dron, clave de API, cuota y costos. Contradice A-010 y añade dependencia externa a un proyecto escolar. |
| `<div>` con la imagen y posicionamiento CSS absoluto | Hay que reimplementar a mano acercamiento, desplazamiento, gestos táctiles y agrupación de marcadores. Termina siendo más código y peor. |
| SVG con los puntos como elementos | Funciona para un plano dibujado, no para una ortofoto de decenas de megapíxeles: no hay carga progresiva. |
| OpenLayers | Capaz y soporta el caso, pero es bastante más pesado y complejo que Leaflet para lo que aquí se necesita. |

---

## R-002. Servir una ortofoto de dron sin romper el tiempo de carga

**Incógnita**: FR-006e y SC-002 exigen que el mapa esté utilizable en menos de 3 segundos en una conexión móvil escolar, con una imagen de dron que puede pesar cientos de megabytes.

**Decisión**: **pre-generar pirámide de teselas (tiles) con `gdal2tiles` en modo `raster`** y servirlas como archivos estáticos.

El proceso se ejecuta una sola vez, fuera de la aplicación: la ortofoto se corta en teselas de 256×256 px por cada nivel de acercamiento. Leaflet solicita únicamente las teselas del área y el nivel que el visitante está mirando.

**Justificación**:

- Una vista inicial completa son ~4–8 teselas de unos 20 KB: bastan ~150 KB para tener el mapa utilizable, frente a los cientos de megabytes del original.
- Las teselas son archivos estáticos: se sirven desde la CDN del alojamiento sin costo de cómputo ni de base de datos.
- `gdal2tiles` en modo `raster` trabaja sobre imágenes sin georreferenciar, que es exactamente el caso.
- Encaja con `CRS.Simple`: Leaflet consume la pirámide igual que cualquier capa de teselas.

**Consecuencia operativa**: generar las teselas es un paso previo al desarrollo del mapa, no parte de la aplicación. Debe quedar documentado como script reproducible para que el colegio pueda repetirlo cuando vuelva a volar el dron.

**Alternativas descartadas**:

| Alternativa | Por qué no |
|---|---|
| Servir un único JPEG reducido | O pesa demasiado, o pierde el detalle que exige FR-006b (distinguir árboles individuales). |
| Generar teselas en el servidor bajo demanda | Costo de cómputo recurrente e innecesario: la imagen no cambia. |
| Formato IIIF con servidor de imágenes | Sobredimensionado; requiere un servicio adicional que mantener. |

---

## R-003. Visor de las vistas inmersivas con formato aún por decidir

**Incógnita**: FR-010b exige admitir tres formatos (panorámica 360°, foto de alto detalle, video) porque el equipo aún no ha inventariado su material de dron (A-010c).

**Decisión**: **contrato de datos común con visor conmutado por tipo**. Cada punto declara su `tipo_medio` y la aplicación monta el visor correspondiente:

| Tipo | Visor | Peso típico |
|---|---|---|
| `panorama_360` | Photo Sphere Viewer (sobre Three.js) | 5–15 MB por panorámica |
| `foto_detalle` | Leaflet con `CRS.Simple` y su propia pirámide de teselas (mismo mecanismo que R-002) | ~200 KB de carga inicial |
| `video` | Elemento `<video>` nativo del navegador con MP4/H.264 | 10–50 MB |

**Justificación**:

- Permite escribir hoy el modelo de datos y la interfaz sin conocer el inventario, y decidir el formato punto por punto cuando el material esté revisado.
- Ningún formato queda excluido, y añadir uno cuarto más adelante solo agrega una rama.
- Reutiliza en `foto_detalle` la misma técnica de teselado ya construida para el mapa base: cero tecnología nueva.
- Photo Sphere Viewer es la opción estándar y mantenida para panorámicas equirectangulares; Pannellum es la alternativa más ligera si Three.js resulta excesivo.

**Hallazgo importante para el equipo**: la mayoría de drones de consumo (DJI y similares) generan panorámicas esféricas **solo si se activa el modo panorámico durante el vuelo**. Si las tomas existentes son foto o video convencional, la opción `panorama_360` no puede reconstruirse a posteriori y exigiría volver a volar. El inventario del material (pendiente 4 de la spec) debe verificar esto antes que nada.

---

## R-004. Umbrales del ICA colombiano y un problema metodológico

**Incógnita**: FR-035 exige clasificar según el ICA de la **Resolución 2254 de 2017** del Ministerio de Ambiente, sobre PM2.5 y PM10 (FR-035b).

**Decisión sobre la escala**: seis categorías, aplicadas con los colores del logo (FR-035a):

| Categoría | Rango ICA | Color |
|---|---|---|
| Buena | 0–50 | Verde |
| Aceptable | 51–100 | Amarillo |
| Dañina a grupos sensibles | 101–150 | Naranja |
| Dañina a la salud | 151–200 | Rojo |
| Muy dañina a la salud | 201–300 | Morado |
| Peligrosa | 301–500 | Marrón / morado oscuro |

La estructura de seis categorías y sus rangos de índice son estables y coinciden con la escala de la que deriva la norma colombiana.

> **A verificar antes de implementar**: los **puntos de corte en µg/m³** que traducen cada concentración a valor de índice deben tomarse del texto oficial de la Resolución 2254 de 2017, no de memoria ni de fuentes secundarias. Etiquetar mal el aire de un colegio es un error que no se puede cometer. Esta verificación es una tarea explícita de implementación con la norma a la vista.

**Problema metodológico detectado — requiere decisión del equipo**:

El ICA está definido sobre **promedios de 24 horas** para material particulado. Las mediciones del proyecto son **lecturas puntuales de unos 10 minutos**, tomadas entre las 12:00 p.m. y las 3:00 p.m. Aplicar los puntos de corte de 24 horas a una lectura instantánea es incorrecto desde el punto de vista técnico: sobreestima o subestima la categoría según el momento del día.

Opciones para tratarlo, todas compatibles con la spec:

1. **Mostrar la categoría con la advertencia explícita** de que corresponde a una lectura puntual y no a un promedio de 24 horas, tal como exige el espíritu de FR-035c y FR-035e. *(Recomendada: es honesta, es pedagógica y no descarta el dato.)*
2. Promediar todas las lecturas de una jornada y clasificar solo ese promedio, indicando que no cubre 24 horas.
3. No clasificar las lecturas puntuales y reservar el ICA para comparar contra los datos publicados por SIATA.

Esta advertencia convierte una debilidad del proyecto en contenido didáctico: los estudiantes aprenden que un índice tiene una ventana temporal de referencia, que es exactamente el tipo de comprensión que persigue el proyecto.

**Nota adicional**: el `AQI` que ya traen los medidores portátiles suele calcularse con la escala de la EPA estadounidense, distinta de la colombiana. FR-035d ya obliga a mostrarlos por separado; esta investigación confirma que la divergencia es esperable y no un error de los equipos.

---

## R-005. Autenticación con correo institucional y sin autorregistro

**Incógnita**: FR-011 a FR-013a exigen acceso solo para 10 personas de una lista, con dominio institucional configurable y sin que nadie pueda crear cuenta por su cuenta.

**Decisión**: **enlace mágico (OTP por correo) de Supabase Auth** contra una tabla de personas autorizadas, verificada en el disparador de alta y en las políticas de acceso.

El flujo: la persona escribe su correo → si el dominio no coincide con el configurado, se rechaza con un mensaje; si coincide pero no está en la lista de autorizados, se rechaza con otro mensaje distinto (FR-012) → si está, recibe un enlace de un solo uso.

**Justificación**:

- **No hay contraseñas que gestionar**, lo cual importa especialmente tratándose de menores de edad: nada que olvidar, nada que reutilizar, nada que filtrar.
- No depende del proveedor de identidad del colegio, que aún está por confirmar (A-006). Funciona igual si los correos son `@salesianos.edu.co` o `@institutopedrojustoberrio.com`.
- El dominio queda como una fila de configuración, satisfaciendo FR-011 sin cambios de código.
- La lista de autorizados es una tabla que el responsable edita desde la propia aplicación (FR-013).

**Alternativas descartadas**:

| Alternativa | Por qué no |
|---|---|
| Google OAuth con restricción de dominio (`hd`) | Más limpio *si* el colegio usa Google Workspace, pero eso no está confirmado. Queda como mejora posterior de un solo día de trabajo. |
| Usuario y contraseña | Gestión de contraseñas de menores, recuperación, rotación. Trabajo y riesgo innecesarios. |
| Contraseña compartida del equipo | Destruye la autoría por persona que exigen FR-023 y FR-043. |

---

## R-005a. Revisión: se cambia a contraseña

**Fecha**: 2026-09-02. **Revoca la decisión de R-005**, no sus alternativas descartadas.

**Qué pasó**: el enlace mágico no llegó a funcionar. El SMTP institucional (Exim sobre cPanel, `mail.institutopedrojustoberrio.com:465`) responde y autentica, pero el envío seguía fallando, y el equipo pidió no depender del correo.

**La razón de fondo pesa más que el fallo técnico.** El acceso ocurre en clase, con el grupo entero esperando. Depender de que once personas abran su bandeja de entrada en ese momento convierte cada sesión en un problema de logística: si un correo tarda, cae en «no deseado», o el estudiante no recuerda la contraseña de su *correo*, la clase se detiene. Es una dependencia externa en el punto exacto donde menos tolerancia hay.

**Decisión**: **contraseña con Supabase Auth**. El docente responsable reparte contraseñas iniciales generadas por `pnpm asignar-contrasenas`, y cada quien la cambia desde `/cuenta` (FR-014a).

**Lo que esto cuesta, dicho sin adornos**: R-005 tenía razón en que las contraseñas de menores se olvidan, se reutilizan y se comparten. Eso sigue siendo cierto y ahora es un problema real del proyecto. Se mitiga así:

- La recuperación no depende del correo: el responsable restablece la contraseña de una persona con `pnpm asignar-contrasenas <correo>`. Traslada la fragilidad a alguien que está en el salón.
- Las iniciales son de un solo uso en la práctica, y `/cuenta` existe precisamente para que dejen de serlo el primer día.
- La autoría por persona (FR-023, FR-043) sigue intacta: cada quien tiene su cuenta. Lo que se descartó en R-005 fue la contraseña *compartida*, y eso sigue descartado.

**Lo que NO cambia**: la verificación de dominio y de pertenencia sigue ocurriendo en el servidor antes de tocar Supabase, no hay autorregistro (FR-013a), y la barrera real sigue siendo RLS.

**Pendiente**: el SMTP se deja configurado. Hace falta igualmente para los avisos de revisión de fichas, y si algún día se resuelve, el enlace mágico puede volver como segunda vía sin quitar la contraseña.

---

## R-006. Registro sin conexión y sincronización

**Incógnita**: FR-027, FR-027a, FR-027b y FR-045c exigen registrar mediciones sin conexión en talleres con mala señal, sobrevivir al cierre de la aplicación y sincronizar sin duplicar.

**Decisión**: **cola de escritura en IndexedDB (mediante Dexie) + identificador generado en el cliente**.

Cada medición recibe un `UUID` generado en el dispositivo **antes** de guardarse localmente. Al sincronizar, el servidor inserta con ese identificador; si ya existe, la operación no hace nada. Así la sincronización es idempotente: reintentar nunca duplica, que es la exigencia de FR-027 y SC-011.

**Justificación**:

- IndexedDB persiste en disco: sobrevive a cerrar la pestaña y a reiniciar el teléfono (FR-027b).
- El identificador del cliente elimina de raíz el problema de duplicación, sin necesidad de lógica de deduplicación en el servidor.
- El contador de pendientes que exige FR-027a es una consulta directa a la cola.
- Dexie evita la API cruda de IndexedDB, que es notoriamente incómoda.

**Alcance deliberado**: el modo sin conexión cubre **solo el registro de mediciones**, no la creación de fichas de biodiversidad con fotografía. Guardar imágenes pesadas en la cola complica el almacenamiento local sin resolver una necesidad real: las fichas se elaboran con calma, las mediciones se toman en el taller.

---

## R-007. Importación del histórico y del formato de la hoja de cálculo

**Incógnita**: FR-028 a FR-031c exigen migrar 135 registros y admitir importaciones repetibles, con previsualización y sin duplicar.

**Decisión**: **SheetJS (`xlsx`) en el navegador**, leyendo la hoja `LongData`.

La hoja `LongData` del archivo original ya está en formato largo (una fila por medición), a diferencia de la hoja ancha de 98 columnas. Es la fuente correcta y evita por completo el desdoblamiento de bloques repetidos.

**Normalizaciones obligatorias detectadas en los datos reales**:

| Problema en el archivo | Tratamiento |
|---|---|
| `27°` en columna de temperatura | Quitar el símbolo y convertir a número |
| `0001`, `0000` en HCHO/TVOC | Interpretar como número, no como texto |
| `Artes  graficas ` | Recortar espacios, normalizar mayúsculas, resolver contra el catálogo |
| Series `32` y `9032` | Unificar en una identidad de medidor |
| `Op` | Bloqueante: exige el nombre real (pendiente 3 de la spec) |
| Celdas vacías | Registrar como «no medido», distinto de cero (FR-025) |

**Detección de duplicados (FR-031c)**: clave natural `(fecha, hora, lugar, medidor)`. Dos lecturas del mismo medidor, en el mismo sitio y minuto, son la misma lectura.

**Formato**: importación desde `.xlsx` (es lo que produce el formulario actual) y exportación en `.xlsx` y `.csv`. Esto resuelve el punto pendiente de bajo impacto que dejó la fase de clarificación.

---

## R-008. Pila tecnológica y alojamiento

**Incógnita**: la spec no fija tecnología. A-012 exige que el resultado sea mantenible por estudiantes y docentes tras la entrega.

**Decisión**: **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase**, desplegado en Vercel bajo el dominio `institutopedrojustoberrio.com`.

**Justificación**:

- Una sola base de código sirve el sitio público y la zona privada, cumpliendo FR-045 («no deben existir versiones separadas»).
- Supabase aporta en un solo servicio base de datos PostgreSQL, autenticación, almacenamiento de archivos y seguridad a nivel de fila. Para un equipo escolar, un servicio en lugar de cuatro es la diferencia entre mantenible y abandonado.
- La seguridad a nivel de fila (RLS) permite expresar «el mapa es público, los tableros no» como reglas de la base de datos, y no como condicionales dispersos por el código. Es más difícil equivocarse.
- PostgreSQL relacional encaja con el dominio, que es netamente relacional (jornadas, mediciones, lugares, medidores).
- Ambos tienen capa gratuita suficiente para el volumen previsto (A-011) y documentación abundante en español.

**Decisión de almacenamiento en dos vías — importante para el costo**:

| Tipo de contenido | Dónde | Por qué |
|---|---|---|
| Teselas del mapa, panorámicas 360°, videos de dron | **Archivos estáticos** en el repositorio, servidos por la CDN del alojamiento | Se generan una vez y no cambian. En CDN son gratuitos; en almacenamiento medido consumirían la cuota entera. |
| Fotografías de fichas subidas por estudiantes | **Supabase Storage** | Son dinámicas, las sube gente autenticada y necesitan permisos. |

Separarlas evita el riesgo real de que las tomas de dron —el contenido más pesado del proyecto— agoten la capa gratuita del almacenamiento y obliguen a pagar una suscripción que un colegio difícilmente sostiene año tras año.

**Alternativas descartadas**:

| Alternativa | Por qué no |
|---|---|
| PHP + MySQL en alojamiento compartido | Familiar en el ámbito escolar, pero exige construir a mano autenticación, permisos, almacenamiento y modo sin conexión. |
| Firebase | Firestore no relacional complica los tableros por rango de fechas y lugar; su modelo de costos es menos predecible. |
| Aplicación nativa (React Native, Flutter) | Excluido por la spec (fuera de alcance) y multiplicaría el mantenimiento. |
| Sitio estático sin servidor | Imposible: hay escritura autenticada, permisos y datos compartidos. |

---

## R-009. Gráficas de los tableros

**Decisión**: **Recharts**.

**Justificación**: componentes declarativos, adaptables al ancho del contenedor —lo que FR-047 y SC-013 exigen—, con soporte nativo para series temporales y ejes categóricos. Su curva de aprendizaje es la más suave para quien retome el proyecto.

**Alternativas descartadas**: D3 puro (demasiado bajo nivel para el mantenimiento previsto); Chart.js (basado en canvas, peor accesibilidad y adaptación); Plotly (excesivamente pesado para seis variables).

---

## R-010. Puntos pendientes de bajo impacto, ahora resueltos

Estos quedaron marcados como diferidos al final de la fase de clarificación y se resuelven aquí:

| Punto | Decisión |
|---|---|
| Estándar de accesibilidad (FR-049) | **WCAG 2.1 nivel AA**: contraste mínimo 4.5:1 en texto normal, objetivos táctiles de 44×44 px. Verificable automáticamente con `axe-core` en las pruebas. |
| Formato de importación y exportación | Importar `.xlsx`; exportar `.xlsx` y `.csv` (ver R-007). |
| Respaldo y disponibilidad | Respaldo diario automático de Supabase, más la exportación completa que ya exige FR-053 como respaldo independiente del proveedor. Sin compromiso formal de disponibilidad: es un proyecto escolar, no un servicio crítico. |

---

## Riesgos abiertos que la investigación no puede cerrar

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | El material de dron podría no incluir panorámicas 360° | Alto — cambia el producto que el equipo imagina | Inventariar el material **antes** de construir el visor (R-003) |
| 2 | Los talleres son interiores y el dron no los capta (A-010b) | Medio | FR-010c ya permite puntos sin vista inmersiva; capturar interiores con celular |
| 3 | Puntos de corte del ICA tomados de fuente incorrecta | Alto — etiquetaría mal el aire de un colegio | Verificación obligatoria contra el texto oficial (R-004) |
| 4 | Aplicar umbrales de 24 h a lecturas de 10 minutos | Medio — compromete la validez pedagógica | Advertencia explícita en la interfaz (R-004, opción 1) |
| 5 | El lugar `Op` sigue sin identificar | Medio — bloquea 12 de 135 registros | FR-031 los marca como dato dudoso mientras tanto |
| 6 | Dominio de correo institucional sin confirmar | Bajo | FR-011 lo deja configurable |
| 7 | El peso de videos de dron podría exceder la capa gratuita | Medio | Separación estática/dinámica del almacenamiento (R-008) |
