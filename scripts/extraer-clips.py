#!/usr/bin/env python3
"""
NIDO PJB — recorta clips de vista inmersiva a partir del material de dron.

Toma los videos largos de `TomasDRON/` y produce clips cortos, ligeros y
optimizados para web en `public/inmersivas/`, listos para asociarlos a un
punto del mapa (tabla `vista_inmersiva`, tipo_medio = 'video').

── Por qué recortar y no servir el video entero ─────────────────────────────

Los originales pesan entre 48 MB y 1,9 GB. Nadie que toque un punto del mapa
en su celular va a esperar eso. Un clip de 12 segundos a 1280×720 pesa unos
2–3 MB y abre en un par de segundos, que es lo que exige SC-002b.

── Privacidad ───────────────────────────────────────────────────────────────

⚠️ Los tramos que elijas NO deben contener rostros reconocibles de menores
mientras el colegio no tenga autorización de los acudientes (FR-052).
Este script no lo comprueba: la responsabilidad es de quien escoge los tramos.
Ver docs/inventario-dron.md.

Uso:
  uv run --with imageio-ffmpeg python scripts/extraer-clips.py
  uv run --with imageio-ffmpeg python scripts/extraer-clips.py --listar
  uv run --with imageio-ffmpeg python scripts/extraer-clips.py --solo piscina
"""

import os
import subprocess
import sys

try:
    import imageio_ffmpeg
except ImportError:
    print('Falta imageio-ffmpeg. Ejecute:', file=sys.stderr)
    print('  uv run --with imageio-ffmpeg python scripts/extraer-clips.py', file=sys.stderr)
    raise SystemExit(1)

ORIGEN = 'TomasDRON'
DESTINO = os.path.join('public', 'inmersivas')

# Altura de salida. 720p basta de sobra para un visor incrustado en el mapa.
#
# Publicar el original de 1080p sería además un riesgo de privacidad: el
# criterio legal de la Ley 1581 es que la persona sea «determinable», no
# «reconocible a simple vista». Cuanta menos resolución, menos posibilidad de
# reidentificar a alguien ampliando la imagen.
ALTURA_SALIDA = 720

# Tasa máxima. Sin este tope, el material de bosque —lleno de detalle fino—
# se dispara a 11 MB por clip y rompe el objetivo de SC-002b (abrir en < 5 s).
TASA_MAXIMA = '2200k'


class Clip:
    """Un tramo a recortar. `segundos` es (inicio, duración)."""

    def __init__(self, nombre, video, inicio, duracion, zona, nota=''):
        self.nombre = nombre
        self.video = video
        self.inicio = inicio
        self.duracion = duracion
        self.zona = zona
        self.nota = nota


# ---------------------------------------------------------------------------
# Catálogo de clips.
#
# ⚠️ CADA TRAMO ESTÁ VERIFICADO FOTOGRAMA A FOTOGRAMA COMO LIBRE DE PERSONAS
# IDENTIFICABLES. Ver docs/inventario-dron.md.
#
# NO alargues un clip sin volver a comprobar el tramo ampliado: varios de estos
# límites están puestos justo antes de que entre alguien en cuadro, y los
# comentarios dicen dónde. Publicar el rostro de un menor sin autorización de
# su acudiente incumple el Art. 7 de la Ley 1581 de 2012.
# ---------------------------------------------------------------------------
CLIPS = [
    # ── Talleres: los puntos donde se mide la contaminación ──────────────
    # Sorpresa del inventario: el dron SÍ entró al taller. Contradice el
    # supuesto A-010b de la spec, que daba por imposible documentarlos.
    Clip('taller-mecanica-industrial', 'TomaTalleres.mp4', 17, 10, 'Taller de Mecánica Industrial',
         'Pasillo central de la nave, filas de tornos, cabina acristalada. '
         'NO estirar: hay un operario con rostro visible en t=14-15 y t=28-30'),
    Clip('taller-acceso', 'TomaTalleres.mp4', 5, 8, 'Taller de Mecánica Industrial',
         'Portón azul y señalización de EPP. Explica POR QUÉ se mide aquí: '
         'espacio cerrado, máquinas, poca ventilación'),
    Clip('patio-cubierto', 'TomaTalleres.mp4', 33, 7, 'Patio cubierto',
         'Sombrillas de colores y letrero «San José, Patrono del Trabajo». '
         'CORTAR EN 40 s: de 41 a 43 entran tres adultos en primer plano'),

    # ── Zonas verdes y biodiversidad ─────────────────────────────────────
    Clip('bosque-lindero', 'Toma1.MP4', 116, 18, 'Bosque del lindero',
         'Copas de eucaliptos y urapanes desde arriba. El mejor material '
         'del proyecto para los puntos de arbolado'),
    Clip('jardin-central', 'TomaRecorrido.mp4', 39, 9, 'Jardín central',
         'Palmas, setos y el letrero «I ♥ PJB». NO empezar antes de t=38: '
         'en t=36 hay un menor mirando a cámara'),
    Clip('senderos-arbolados', 'TomaRecorrido.mp4', 12, 18, 'Senderos',
         'Sendero perimetral arbolado y avenida interna de palmas'),

    # ── Contexto general ─────────────────────────────────────────────────
    Clip('panoramica-campus', 'TomaRecorrido.mp4', 94, 12, 'Panorámica',
         'El campus con el valle de Medellín al fondo. Buena cabecera'),
    Clip('paneles-solares', 'TomaRecorrido2.mp4', 33, 10, 'Cubiertas',
         'Sobrevuelo del arreglo fotovoltaico'),
    Clip('cubiertas-vuelo-alto', 'Toma1.MP4', 45, 20, 'Cubiertas',
         'Ascenso sobre los tejados con la ciudad al fondo'),
    Clip('piscina', 'TomaPiscina.mp4', 0, 11, 'Piscina',
         'Recorrido frontal sobre la piscina. CORTAR EN 11 s'),
]


def ruta_ffmpeg() -> str:
    return imageio_ffmpeg.get_ffmpeg_exe()


def recortar(ff: str, clip: Clip) -> bool:
    entrada = os.path.join(ORIGEN, clip.video)
    if not os.path.isfile(entrada):
        print(f'  ⚠️  no se encuentra {entrada}')
        return False

    salida = os.path.join(DESTINO, f'{clip.nombre}.mp4')
    poster = os.path.join(DESTINO, f'{clip.nombre}.jpg')

    orden = [
        ff, '-hide_banner', '-loglevel', 'error',
        # -ss antes de -i hace la búsqueda rápida sobre el archivo original
        '-ss', str(clip.inicio),
        '-t', str(clip.duracion),
        '-i', entrada,
        '-vf', f'scale=-2:{ALTURA_SALIDA},fps=24',
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-preset', 'slow',
        # CRF 28 con tope de tasa: el CRF solo no acota el peso en escenas
        # de mucho detalle, como el dosel del bosque.
        '-crf', '28',
        '-maxrate', TASA_MAXIMA,
        '-bufsize', '4400k',
        # faststart mueve el índice al principio: el video empieza a
        # reproducirse sin esperar a descargarlo entero
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        # Sin audio: no aporta nada en un visor de mapa y ahorra peso.
        # Además evita publicar voces de menores sin querer.
        '-an',
        '-y', salida,
    ]
    subprocess.run(orden, check=True, capture_output=True)

    # Imagen de respaldo, para `ruta_respaldo` (FR-010h): si el navegador no
    # reproduce el video, se muestra esto en lugar de un error.
    subprocess.run(
        [ff, '-hide_banner', '-loglevel', 'error',
         '-ss', str(clip.inicio + clip.duracion // 2), '-i', entrada,
         '-frames:v', '1', '-vf', f'scale=-2:{ALTURA_SALIDA}', '-q:v', '4',
         '-y', poster],
        check=True, capture_output=True,
    )

    mb = os.path.getsize(salida) / 1e6
    kb = os.path.getsize(poster) / 1024
    print(f'  ✓ {clip.nombre:24s} {clip.duracion:3d}s  {mb:5.1f} MB  (respaldo {kb:.0f} KB)  [{clip.zona}]')
    return True


def main() -> None:
    if '--listar' in sys.argv:
        print('Clips definidos:\n')
        for c in CLIPS:
            print(f'  {c.nombre:24s} {c.video:20s} t={c.inicio}s +{c.duracion}s  [{c.zona}]')
            if c.nota:
                print(f'  {"":24s} {c.nota}')
        return

    solo = None
    if '--solo' in sys.argv:
        solo = sys.argv[sys.argv.index('--solo') + 1]

    os.makedirs(DESTINO, exist_ok=True)
    ff = ruta_ffmpeg()

    print(f'ffmpeg  : {ff}')
    print(f'origen  : {os.path.abspath(ORIGEN)}')
    print(f'destino : {os.path.abspath(DESTINO)}\n')

    hechos = 0
    for clip in CLIPS:
        if solo and solo not in clip.nombre:
            continue
        if recortar(ff, clip):
            hechos += 1

    print(f'\n{hechos} clips generados.\n')
    print('SIGUIENTE PASO — asociar cada clip a un punto del mapa.')
    print('En el editor SQL de Supabase, por cada clip:\n')
    print("  insert into vista_inmersiva")
    print("    (punto_mapa_id, tipo_medio, origen, ruta, ruta_respaldo, orden)")
    print("  values (")
    print("    '<id del punto>', 'video', 'dron',")
    print("    '/inmersivas/piscina.mp4', '/inmersivas/piscina.jpg', 0")
    print("  );\n")
    print("Para los talleres, `origen` es 'movil' y no 'dron': se grabaron a pie.")


if __name__ == '__main__':
    main()
