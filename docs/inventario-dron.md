# Inventario del material de dron

**Fecha del análisis**: 2026-08-31
**Ruta**: `TomasDRON/` · 6 archivos · 2,8 GB · ~14 minutos

Cierra el pendiente 4 de la especificación. Se analizaron los seis videos
fotograma a fotograma (420 fotogramas muestreados, uno cada 2 segundos).

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|---|---|
| ¿Sirve como imagen base del mapa? | **No.** Hay que volver a volar |
| ¿Sirve para vistas inmersivas? | **Sí**, y muy bien |
| ¿Hay tomas cenitales? | **Ninguna**, en ninguno de los seis |
| ¿Hay video 360°? | **No.** Sin metadatos esféricos, gran angular normal |
| ¿Se puede publicar tal cual? | **No.** Rostros de menores identificables |
| ¿Hay material de los talleres? | **Sí**, de Mecánica Industrial. De los otros tres, no |

---

## Ficha de cada archivo

Los seis son **1920×1080, H.264**. No hay máster en 4K, así que no hay margen
para reencuadrar ni ampliar.

| Archivo | Duración | Peso | Tipo de captura |
|---|---|---|---|
| `Toma1.MP4` | 2:16 | 676 MB | Dron. Evento de preescolar y vuelo sobre cubiertas |
| `Toma2.MP4` | 6:25 | 1,9 GB | Dron. Vuelo aéreo y luego evento a ras de suelo |
| `TomaPiscina.mp4` | 0:38 | 48 MB | Cámara en mano. Piscina |
| `TomaRecorrido.mp4` | 1:48 | 135 MB | Mixto. Recorrido y vuelo final |
| `TomaRecorrido2.mp4` | 2:10 | 162 MB | Mixto. Cubiertas y paneles solares |
| `TomaTalleres.mp4` | 0:43 | 54 MB | **Dron FPV que entra al taller** |

---

## Hallazgo 1 — El dron sí entró al taller

`TomaTalleres.mp4` es un vuelo FPV que **recorre por dentro** la nave del
Taller de Mecánica Industrial (t≈11–31 s): pasillo central, filas de tornos,
banco de trabajo, cabina acristalada y cartelería de seguridad.

**Esto contradice un supuesto de la especificación.** `A-010b` daba por hecho
que los talleres, al ser interiores, no podían documentarse con dron y que
habría que grabarlos con celular. No hace falta: ya está grabado, y con mejor
calidad de la que daría un teléfono.

Es además el material más valioso del conjunto, porque el Taller de Mecánica
Industrial es el lugar con **más mediciones del histórico (34 de 135)**.

---

## Hallazgo 2 — Ninguna toma sirve como base del mapa

No hay un solo fotograma cenital, y ninguno cubre el colegio completo. Los más
amplios (`Toma1` t≈50–60 s) tienen cerca de la mitad del encuadre ocupada por
cielo y por el valle de Medellín.

### Por qué esto importa más de lo que parece

**La imagen base no es decoración: es el sistema de coordenadas del proyecto.**

Los puntos de biodiversidad se guardan como fracciones de la imagen. Eso
sobrevive a un cambio de resolución, pero **no a un cambio de punto de vista**.
Si los estudiantes marcan 200 árboles sobre un fotograma oblicuo y después se
sustituye por una ortofoto cenital, esos 200 puntos quedan en sitios
arbitrarios y hay que recolocarlos a mano, uno por uno.

**Conclusión: hay que fijar la imagen base definitiva ANTES de que nadie marque
el primer punto.** Es la decisión menos reversible del proyecto.

Una vista oblicua también tiene un problema propio: la **oclusión**. Lo que
queda detrás de un edificio o de una copa grande sencillamente no aparece, y
no hay dónde marcarlo.

### Qué hacer

**Opción A — volver a volar (recomendada).** El dron ya está, así que cuesta
cero. Unos 20 minutos de vuelo. Instrucciones para quien pilote:

- **Cuándo**: sábado, domingo o festivo, con el campus **vacío**. Esto resuelve
  de paso todo el problema de privacidad.
- **Hora**: entre las 10:00 y las 14:00, para que las sombras sean cortas. Un
  día ligeramente nublado es mejor que sol pleno: no quema las zonas claras ni
  esconde el sotobosque bajo sombras duras.
- **Gimbal**: **−90°, mirando en vertical hacia abajo.** Es lo único
  innegociable.
- **Altura**: la mínima desde la que el colegio completo quepa en un encuadre.
- **Lo más simple que funciona**: **una sola foto** cenital con todo el predio
  dentro. Entra directamente en `scripts/generar-teselas.py` y no hace falta
  ortomosaico ni software de fotogrametría.
- Si se quiere más detalle, hacer una cuadrícula con 70–80 % de solape y unirla
  con WebODM, pero es bastante más trabajo.

**Opción B — ortofoto pública.** GeoMedellín, la infraestructura de datos
espaciales del Distrito, publica ortofotos descargables sin costo. Ventaja:
cenital de verdad y sin volar. Desventaja: puede ser anterior a la obra con
malla verde y al bloque de aulas nuevo que aparecen en `Toma1`.

---

## Hallazgo 3 — El material actual no es publicable tal cual

En los videos aparecen **decenas de menores con el rostro reconocible**. El
tramo más comprometido es `Toma1` t=15–44 s: el dron se queda frente a la
ventana de un inflable filmando de cerca a niños de preescolar, y en t=30 uno
mira de frente a la cámara.

El **Artículo 7 de la Ley 1581 de 2012** prohíbe el tratamiento de datos de
niños, niñas y adolescentes salvo los de naturaleza pública, y la imagen facial
es dato sensible. Publicarla en abierto exige autorización específica del
acudiente; **la cláusula genérica de matrícula no sirve**, porque el Decreto
1377 de 2013 obliga a pedir autorización nueva cuando cambia la finalidad.

Las sanciones del Art. 23 llegan a 2.000 SMLMV, son sucesivas mientras persista
el incumplimiento y pueden recaer sobre el responsable a título personal.

**Criterio adoptado**: se publican únicamente tramos **sin personas**. Recortar
es jurídicamente más sólido que difuminar, y no deja lugar a interpretación.

---

## Tramos verificados sin personas

Cada uno comprobado fotograma a fotograma.

| Video | Tramo | Contenido |
|---|---|---|
| `Toma1` | 45–72 s | Vuelo sobre cubiertas, con el valle al fondo |
| `Toma1` | 97–103 s | Cancha polideportiva vacía |
| `Toma1` | 116–136 s | **Bosque del lindero.** El mejor material de arbolado |
| `Toma2` | 0–14 s | Cancha de césped y juegos infantiles |
| `Toma2` | 149–169 s | Picado sobre las piscinas y edificio de ladrillo |
| `Toma2` | 335–343 s | Panorámica alta del dosel arbóreo |
| `TomaTalleres` | 5–13 s | Portón azul y señalización de EPP |
| `TomaTalleres` | 17–27 s | **Interior de la nave de tornos** |
| `TomaTalleres` | 33–40 s | Patio cubierto con sombrillas |
| `TomaPiscina` | 0–11 s | Piscina completa |
| `TomaRecorrido` | 12–30 s | Senderos arbolados y avenida de palmas |
| `TomaRecorrido` | 39–48 s | Jardín «I ♥ PJB» |
| `TomaRecorrido` | 94–106 s | Panorámica del campus sobre Medellín |
| `TomaRecorrido2` | 33–43 s | Paneles solares en cubierta |

### Tramos que NO se pueden publicar

| Video | Tramo | Motivo |
|---|---|---|
| `Toma1` | 0–44 s | Preescolar e inflable. Rostro de frente en t=30 |
| `Toma1` | 80–97 s | Clase de educación física, rostros distinguibles |
| `Toma2` | 190–321 s | Evento con decenas de menores a pocos metros |
| `Toma2` | 364–385 s | Ídem |
| `TomaTalleres` | 41–43 s | Tres adultos en primer plano |
| `TomaPiscina` | 33–38 s | Personas identificables |
| `TomaRecorrido` | 52–68 s | Personas identificables |
| `TomaRecorrido2` | 108–130 s | Personas identificables |

---

## Clips generados

10 clips en `public/inmersivas/`, **27 MB en total**, ninguno mayor de 5,1 MB.
Todos a 720p, sin audio y con imagen de respaldo (FR-010h).

Se regeneran con:

```powershell
uv run --with imageio-ffmpeg python scripts/extraer-clips.py
```

| Clip | Duración | Peso | Zona |
|---|---|---|---|
| `taller-mecanica-industrial` | 10 s | 1,9 MB | Taller de Mecánica Industrial |
| `taller-acceso` | 8 s | 1,4 MB | Taller de Mecánica Industrial |
| `patio-cubierto` | 7 s | 1,8 MB | Patio cubierto |
| `bosque-lindero` | 18 s | 5,0 MB | Bosque del lindero |
| `jardin-central` | 9 s | 2,7 MB | Jardín central |
| `senderos-arbolados` | 18 s | 5,1 MB | Senderos |
| `panoramica-campus` | 12 s | 1,7 MB | Panorámica |
| `paneles-solares` | 10 s | 2,1 MB | Cubiertas |
| `cubiertas-vuelo-alto` | 20 s | 2,3 MB | Cubiertas |
| `piscina` | 11 s | 2,6 MB | Piscina |

**El audio se elimina siempre** (`-an`). Cuatro de los seis originales traen
pista de audio, y publicarla difundiría conversaciones grabadas dentro del
colegio.

> ⚠️ **No alargues un clip sin volver a comprobar el tramo ampliado.** Varios
> límites están puestos justo antes de que entre alguien en cuadro. Los
> comentarios de `scripts/extraer-clips.py` dicen dónde.

---

## Lo que falta por grabar

**Tres de los cuatro puntos de medición no tienen ningún material**: Taller de
Mecánica Automotriz, Ebanistería y Artes Gráficas. Solo Mecánica Industrial
está cubierto.

Si el mapa muestra vista inmersiva en un punto de contaminación y en los otros
tres no, la diferencia se nota. Grabarlos es sencillo: un recorrido de 30
segundos por dentro de cada taller, **sin gente**, incluso con celular.

Lista de lo pendiente, por orden de utilidad:

1. **Ortofoto cenital del colegio completo** — bloquea el mapa entero
2. Interior del Taller de Mecánica Automotriz
3. Interior de Ebanistería
4. Interior de Artes Gráficas
5. El lugar hoy anotado como `Op`, cuando se sepa cuál es
