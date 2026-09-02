# Contrato del archivo de hoja de cálculo — NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb · **Fase 1**

Define qué archivo acepta la importación (FR-031a), cómo se normaliza (FR-029), cómo se evita duplicar (FR-031c) y qué produce la exportación (FR-036).

---

## Origen: el archivo real

`MEDIDORES.xlsx` es una exportación de formulario en línea con dos hojas:

| Hoja | Estructura | Uso |
|---|---|---|
| `Respuestas de formulario 1` | **98 columnas**, con el bloque de 11 variables repetido hasta 8 veces por fila | **No se usa.** Requiere desdoblar bloques repetidos, con alto riesgo de error |
| `LongData` | **16 columnas**, una fila por medición | **Fuente canónica.** Ya está en formato largo |

La importación lee **exclusivamente `LongData`**. Si el archivo no contiene esa hoja, se rechaza completo con un mensaje explícito.

---

## Columnas esperadas en `LongData`

| # | Encabezado en el archivo | Campo destino | Tipo | Obligatorio |
|---|---|---|---|---|
| 1 | `MarcaTemporalEnvio` | `jornada.fecha` | fecha-hora | Sí |
| 2 | `NroMedicion` | `medicion.numero` | entero | Sí |
| 3 | `HoraMedicion` | `medicion.hora` | hora | Sí |
| 4 | `PM1 ( µg/ m³)` | `pm1` | numérico | No |
| 5 | `PM2.5 ( µg/ m³)` | `pm25` | numérico | No |
| 6 | `PM10 ( µg/ m³)` | `pm10` | numérico | No |
| 7 | `Formaldehido HCHO ( µg/ m³)` | `hcho` | numérico | No |
| 8 | `TOVC ( µg/ m³)` | `tvoc` | numérico | No |
| 9 | `Humedad relativa (%)` | `humedad_relativa` | numérico | No |
| 10 | `Temp ( °C)` | `temperatura` | numérico | No |
| 11 | `#partículas por litro (per/L)` | `particulas_litro` | numérico | No |
| 12 | `CO2 (PPM)` | `co2` | numérico | No |
| 13 | `AQI` | `aqi_medidor` | numérico | No |
| 14 | `Lugar de medición` | `jornada.lugar_id` | catálogo | Sí |
| 15 | `Numero de serie` | `jornada.medidor_id` | catálogo | Sí |
| 16 | `Nombre del que midió` | `jornada.integrante_id` | alias | Sí |

**Sobre los encabezados**: en el archivo original la unidad «µg» aparece corrompida por un problema de codificación (se lee `ท่g`). El emparejamiento de columnas **no puede depender del texto exacto del encabezado**. Se hace por posición y por coincidencia laxa del prefijo (`PM2.5`, `Temp`, `CO2`), con la posición como criterio principal.

**Una columna ausente no invalida el archivo** si es opcional: se importa como `NULL` (no medido).

---

## Normalizaciones obligatorias

Cada una responde a un defecto real presente en los 135 registros históricos. Toda corrección aplicada se reporta en la previsualización (FR-031b): nada se corrige en silencio.

### 1. Números capturados como texto (FR-018, SC-006)

| Entrada | Salida | Regla |
|---|---|---|
| `27°` | `27` | Eliminar símbolos no numéricos de cola |
| `0001` | `1` | Interpretar como número; los ceros a la izquierda son artefacto del formulario |
| `0000` | `0` | Cero real, **no** ausencia |
| `0.001` | `0.001` | Decimal válido, sin cambios |
| `` (vacío) | `NULL` | **No medido**, distinto de cero (FR-025) |
| `n/a`, `-`, `--` | `NULL` | Marcas de ausencia |
| `abc` | rechazo de fila | No convertible: no se adivina |

**La distinción entre `0` y `NULL` es la más delicada de la importación.** Convertir un vacío en cero falsearía a la baja todos los promedios de los tableros.

### 2. Nombres de lugar (FR-021, FR-029, SC-008)

Se recortan espacios, se colapsan los internos múltiples, y se resuelve sin distinguir mayúsculas ni acentos contra el catálogo:

| Entrada | Resultado |
|---|---|
| `Taller - Mecánica industrial` | Taller de Mecánica Industrial |
| `Taller - Mecánica Automotriz` | Taller de Mecánica Automotriz |
| `Ebanistería` | Ebanistería |
| `Artes  graficas ` | Artes Gráficas |
| `Op` | **Rechazo** hasta que se resuelva su nombre real |

`Op` afecta a **12 de los 135 registros**. Mientras no se resuelva, esas filas se rechazan o, si el responsable lo prefiere, se importan con `dato_dudoso = true` para excluirlas de los análisis (FR-031). Nunca se adivina a qué lugar corresponde.

### 3. Identidad de los medidores (FR-022, SC-008)

El archivo trae `31`–`34` y también `9031`–`9034`. Son **cuatro equipos**, no ocho: el prefijo `90` es un artefacto de captura.

Regla: si la serie tiene 4 dígitos y comienza por `90`, se normaliza a sus dos últimos dígitos. `9032` → `32`.

Esta regla debe **confirmarse con el equipo antes de ejecutar la migración**. Si en realidad fueran ocho equipos distintos, unificarlos mezclaría lecturas de aparatos diferentes.

### 4. Autoría (FR-030)

La columna trae alias de correo personal (`alias-1`, `alias-2`, …). Se resuelven contra `alias_historico`.

Un alias sin correspondencia registrada **rechaza la fila**: importar una medición sin autor identificable incumpliría SC-016.

### 5. Agrupación en jornadas (FR-019)

`LongData` es plano; el modelo agrupa en jornadas. Regla: todas las filas que comparten `(fecha de MarcaTemporalEnvio, lugar, medidor, autor)` pertenecen a la misma jornada.

Sobre los datos reales, esto produce **22 jornadas** a partir de 135 mediciones, coincidiendo con las 22 marcas temporales distintas del archivo. Es la comprobación de que la regla es correcta.

---

## Deduplicación (FR-031c, SC-015)

**Clave natural**: `(fecha, hora, lugar, medidor)`.

Dos lecturas del mismo medidor, en el mismo sitio y el mismo minuto, son la misma lectura. Al confirmar, las filas cuya clave ya existe se cuentan como `omitidos_por_duplicado` y no se insertan.

**Consecuencia verificable**: importar el mismo archivo dos veces seguidas deja la base de datos idéntica. Es la prueba directa de SC-015.

---

## Formato de exportación

### Mediciones filtradas (FR-036)

Refleja exactamente el filtro de pantalla. Formatos: `.xlsx` y `.csv` (UTF-8 con BOM, para que Excel en español no corrompa los acentos).

Columnas: `fecha`, `hora`, `lugar`, `medidor`, `autor`, las 10 variables, `aqi_medidor`, `ica_calculado`, `categoria_ica`, `dato_dudoso`.

**Dos columnas separadas para el índice** (FR-035d): `aqi_medidor` es lo que reportó el equipo, en escala EPA; `ica_calculado` es el índice colombiano calculado por la aplicación. Mezclarlos produciría un archivo engañoso.

La primera hoja del `.xlsx` incluye una fila de encabezado con la norma aplicada y la advertencia de que las lecturas son puntuales y no promedios de 24 horas (R-004). Quien reciba el archivo debe poder interpretarlo sin haber usado la aplicación.

### Respaldo completo (FR-053)

Un `.xlsx` con una hoja por tabla, más las fotografías en un `.zip` adjunto. Debe bastar para reconstruir el proyecto sin depender del proveedor de alojamiento.

---

## Casos de rechazo del archivo completo

| Caso | Mensaje |
|---|---|
| Falta la hoja `LongData` | «El archivo no contiene la hoja LongData. Use la exportación completa del formulario.» |
| Cero filas con datos | «El archivo no tiene mediciones que importar.» |
| Faltan columnas obligatorias | «Faltan columnas obligatorias: …» |
| Archivo mayor de 10 MB | «El archivo supera el tamaño permitido.» |

En todos los casos **no se escribe nada**: la importación es todo o nada por lote, nunca parcial y a medias.
