# Contrato de API — NIDO PJB

**Feature**: 001-plataforma-ambiental-pjb · **Fase 1**

La mayor parte del acceso a datos ocurre **directamente desde el cliente contra Supabase**, gobernado por las políticas RLS de [db-schema.sql](./db-schema.sql). No se construye una capa de API que se limite a reenviar consultas: sería código sin valor que mantener.

Solo existen rutas de servidor donde hay lógica que **no puede vivir en el cliente**: idempotencia de la sincronización, procesamiento de archivos y generación de exportaciones.

---

## Principio de autorización

| Superficie | Autenticación |
|---|---|
| Lectura de fichas publicadas, categorías, puntos, vistas inmersivas, contenido didáctico | **Ninguna** (FR-005) |
| Todo lo demás | Sesión de integrante activo |
| Administración, aprobación de fichas, marcado de puntos destacados | Sesión de responsable |

La autorización **no se comprueba en la ruta**: la comprueba PostgreSQL mediante RLS. Las rutas de servidor actúan con el token del usuario, nunca con la clave de servicio, salvo en la migración única del histórico. Esto significa que un fallo en el código de una ruta no puede saltarse los permisos.

---

## `POST /api/sincronizar`

Recibe la cola de mediciones registradas sin conexión (FR-027, SC-011).

**Autenticación**: integrante activo.

**Cuerpo**:

```jsonc
{
  "jornadas": [
    {
      "id": "uuid-generado-en-el-cliente",
      "fecha": "2026-08-28",
      "lugar_id": "uuid",
      "medidor_id": "uuid",
      "cerrada": true
    }
  ],
  "mediciones": [
    {
      "id": "uuid-generado-en-el-cliente",
      "jornada_id": "uuid",
      "numero": 1,
      "hora": "12:00",
      "pm1": 10, "pm25": 12, "pm10": 13,
      "hcho": null, "tvoc": 0,
      "humedad_relativa": 57, "temperatura": 26,
      "particulas_litro": 40, "co2": 402,
      "aqi_medidor": 19
    }
  ]
}
```

**Respuesta 200**:

```jsonc
{
  "aceptadas": 7,
  "ya_existian": 0,
  "rechazadas": [],
  "sincronizado_en": "2026-08-28T18:12:04Z"
}
```

**Contrato de idempotencia** — es la garantía central de esta ruta:

- El `id` lo genera el **cliente**, antes de guardar en IndexedDB.
- El servidor inserta con `on conflict (id) do nothing`.
- Reenviar la misma cola **nunca** duplica: las repetidas se cuentan en `ya_existian`.
- Si la respuesta se pierde por corte de red, el cliente reintenta sin riesgo.

Esto satisface SC-011 («sincronización al 100 %, sin duplicados ni pérdidas») incluso si la aplicación se cerró o el teléfono se reinició entre medio.

**`hcho: null` significa no medido; `tvoc: 0` significa medido en cero** (FR-025). El contrato distingue ambos y el cliente debe respetarlo: nunca enviar `0` para rellenar un hueco.

**Errores**:

| Código | Caso |
|---|---|
| `401` | Sin sesión |
| `403` | Integrante inactivo, o jornada de otra persona |
| `422` | Valor no numérico en campo numérico (FR-018), o lugar/medidor inexistente |

---

## `POST /api/importar/previsualizar`

Primer paso obligatorio de toda importación (FR-031b). **No escribe nada.**

**Autenticación**: responsable.

**Cuerpo**: `multipart/form-data` con el archivo `.xlsx`.

**Respuesta 200**:

```jsonc
{
  "token_lote": "uuid",
  "resumen": { "aceptados": 128, "corregidos": 5, "rechazados": 2, "duplicados": 0 },
  "corregidos": [
    { "fila": 14, "campo": "temperatura", "original": "27°", "corregido": 27,
      "motivo": "Símbolo eliminado y convertido a número" },
    { "fila": 22, "campo": "lugar", "original": "Artes  graficas ",
      "corregido": "Artes Gráficas", "motivo": "Normalizado contra el catálogo" }
  ],
  "rechazados": [
    { "fila": 31, "motivo": "Lugar 'Op' no está resuelto en el catálogo" }
  ],
  "duplicados": []
}
```

El `token_lote` caduca a los 30 minutos. La previsualización es obligatoria: no existe forma de confirmar una importación sin haberla generado antes.

---

## `POST /api/importar/confirmar`

Aplica un lote previamente previsualizado.

**Autenticación**: responsable.

**Cuerpo**: `{ "token_lote": "uuid", "incluir_corregidos": true }`

**Respuesta 200**: `{ "insertados": 133, "omitidos_por_duplicado": 0 }`

Los registros rechazados nunca se insertan. Los corregidos se insertan solo si `incluir_corregidos` es `true`: el responsable ve exactamente qué se cambió antes de aceptarlo (FR-031b).

Deduplicación por la clave natural `(jornada, hora)` derivada de `(fecha, lugar, medidor)` — reimportar el mismo archivo produce cero filas nuevas (FR-031c, SC-015).

---

## `GET /api/exportar`

Descarga de datos filtrados (FR-036) y respaldo completo (FR-053).

**Autenticación**: integrante activo. Respaldo completo: responsable.

**Parámetros**:

| Parámetro | Valores |
|---|---|
| `formato` | `xlsx` \| `csv` |
| `desde` / `hasta` | Fecha ISO |
| `lugares` | Lista de identificadores, separados por coma |
| `alcance` | `mediciones` (por omisión) \| `completo` |

**Respuesta**: archivo con `Content-Disposition: attachment`.

El export refleja **exactamente el filtro aplicado en pantalla** (FR-036): lo que el usuario ve es lo que descarga. Incluye una columna con la categoría ICA calculada y otra con la advertencia de ventana temporal (R-004), para que quien reciba el archivo no interprete mal las lecturas puntuales.

---

## Operaciones directas contra Supabase

Estas **no** pasan por rutas de servidor. Se listan porque forman parte del contrato de la aplicación.

| Operación | Tabla / vista | Quién |
|---|---|---|
| Leer puntos del mapa público | `ficha_publica`, `punto_destacado_publico`, `vista_inmersiva` | Anónimo |
| Leer una ficha pública | `ficha_publica` | Anónimo |
| Registrar jornada y mediciones en línea | `jornada`, `medicion` | Integrante |
| Consultar histórico para tableros | `medicion` con `join` | Integrante |
| Crear y editar ficha | `ficha_biodiversidad` | Integrante (la suya) |
| Enviar ficha a revisión | `ficha_biodiversidad.estado` | Autor |
| Aprobar o rechazar ficha | `ficha_biodiversidad.estado` | Responsable |
| Activar visibilidad de autor | `ficha_biodiversidad.mostrar_autor` | Autor, si hay autorización |
| Marcar punto de alta contaminación | `punto_destacado` | Responsable |
| Alta y baja de integrantes | `integrante` | Responsable |
| Subir foto de ficha | Supabase Storage, bucket `fotos-fichas` | Integrante |

### Contrato de almacenamiento

| Bucket / ruta | Contenido | Acceso |
|---|---|---|
| `fotos-fichas` (Supabase Storage) | Fotografías subidas por estudiantes | Lectura pública; escritura de integrantes |
| `/mapa/tiles/**` (CDN estática) | Pirámide de teselas de la ortofoto | Lectura pública |
| `/inmersivas/**` (CDN estática) | Panorámicas, fotos teseladas, videos | Lectura pública |

La separación es deliberada (R-008): el contenido pesado y estático no consume cuota de almacenamiento medido, que es lo que mantiene el proyecto dentro de capas gratuitas.

---

## Cálculo del ICA

No es una ruta: es una función pura en `lib/ica/`, compartida por cliente y servidor, para que mapa, tableros, fichas y exportación **no puedan discrepar** (FR-035a).

```text
calcularICA(pm25: number | null, pm10: number | null): {
  valor: number | null,
  categoria: 'buena' | 'aceptable' | 'dañina_sensibles'
           | 'dañina' | 'muy_dañina' | 'peligrosa' | null,
  color: string,
  advertencia: string        // R-004: lectura puntual, no promedio de 24 h
}
```

**Contrato**: si tanto `pm25` como `pm10` son `null`, devuelve `categoria: null` — **nunca** `'buena'`. Asumir aire limpio ante la ausencia de dato sería el peor error posible en una aplicación sobre calidad del aire.

Los puntos de corte se cargan desde una tabla de constantes en un único archivo, verificada contra el texto oficial de la Resolución 2254 de 2017 antes de implementar (riesgo 3 de research.md).
