#!/usr/bin/env python3
"""
NIDO PJB — genera la pirámide de teselas del mapa a partir de la ortofoto.

Convierte una imagen grande de dron en teselas de 256×256 px, una por nivel de
acercamiento. Leaflet solo descarga las del área que se está mirando: por eso
el mapa carga en menos de 3 segundos aunque la ortofoto original pese cientos
de megabytes (research.md R-002, SC-002).

── Por qué este script y no GDAL ────────────────────────────────────────────

`gdal2tiles.py --profile=raster` hace lo mismo, pero instalar GDAL en Windows
es un obstáculo serio para un colegio. Este script usa solo Pillow, que se
instala con una línea, y produce exactamente la misma estructura {z}/{x}/{y}.png.

── El relleno del lienzo, que importa más de lo que parece ──────────────────

El teselado exige un lienzo CUADRADO de lado 256·2^n. Una ortofoto de 4096×3072
se rellena hasta 4096×4096: la foto queda arriba a la izquierda y abajo sobra
una franja vacía.

`lib/mapa/coordenadas.ts` descuenta ese relleno al convertir posiciones. Si
alguien cambia aquí la forma de rellenar, DEBE cambiarlo también allí, o todos
los puntos del mapa quedarán desplazados en vertical sin que nada falle de
forma visible.

Uso:
  uv run --with pillow python scripts/generar-teselas.py <ortofoto> [destino]

  Sin uv:
  pip install pillow
  python scripts/generar-teselas.py <ortofoto> [destino]
"""

import math
import os
import shutil
import sys

from PIL import Image

# Las ortofotos de dron superan el límite antibombas de Pillow. Es material
# propio y de confianza, así que se levanta.
Image.MAX_IMAGE_PIXELS = None

LADO_TESELA = 256
DESTINO_POR_OMISION = 'public/mapa/tiles'


def calcular_zoom_maximo(ancho: int, alto: int) -> int:
    """Nivel en el que la foto se ve a resolución nativa, sin ampliar."""
    return max(0, math.ceil(math.log2(max(ancho, alto) / LADO_TESELA)))


def generar(ruta_origen: str, destino: str) -> dict:
    original = Image.open(ruta_origen)
    original = original.convert('RGB')
    ancho, alto = original.size

    zoom_maximo = calcular_zoom_maximo(ancho, alto)
    lado_lienzo = LADO_TESELA * (2**zoom_maximo)

    print(f'Ortofoto : {ruta_origen}  ({ancho}×{alto} px)')
    print(f'Lienzo   : {lado_lienzo}×{lado_lienzo} px (cuadrado, con relleno)')
    print(f'Zoom     : 0 a {zoom_maximo}')
    print(f'Destino  : {destino}')
    print()

    # Relleno hasta lienzo cuadrado. La foto se ancla ARRIBA A LA IZQUIERDA:
    # es lo que asume ocupacionDelLienzo() en lib/mapa/coordenadas.ts.
    lienzo = Image.new('RGB', (lado_lienzo, lado_lienzo), (255, 255, 255))
    lienzo.paste(original, (0, 0))

    shutil.rmtree(destino, ignore_errors=True)

    total = 0
    for z in range(zoom_maximo + 1):
        n = 2**z
        nivel = lienzo.resize((LADO_TESELA * n, LADO_TESELA * n), Image.LANCZOS)
        for x in range(n):
            carpeta = os.path.join(destino, str(z), str(x))
            os.makedirs(carpeta, exist_ok=True)
            for y in range(n):
                recorte = nivel.crop(
                    (
                        x * LADO_TESELA,
                        y * LADO_TESELA,
                        (x + 1) * LADO_TESELA,
                        (y + 1) * LADO_TESELA,
                    )
                )
                recorte.save(os.path.join(carpeta, f'{y}.png'), 'PNG', optimize=True)
                total += 1
        print(f'  z={z}: {n * n} teselas')

    peso = sum(
        os.path.getsize(os.path.join(raiz, f))
        for raiz, _, archivos in os.walk(destino)
        for f in archivos
    )

    return {
        'ancho': ancho,
        'alto': alto,
        'zoom_maximo': zoom_maximo,
        'total': total,
        'peso_mb': peso / (1024 * 1024),
    }


def main() -> None:
    if len(sys.argv) < 2:
        print('Uso: python scripts/generar-teselas.py <ortofoto> [destino]', file=sys.stderr)
        raise SystemExit(1)

    origen = sys.argv[1]
    destino = sys.argv[2] if len(sys.argv) > 2 else DESTINO_POR_OMISION

    if not os.path.isfile(origen):
        print(f'Error: no se encuentra la ortofoto «{origen}»', file=sys.stderr)
        raise SystemExit(1)

    info = generar(origen, destino)

    print()
    print(f'Listo: {info["total"]} teselas, {info["peso_mb"]:.1f} MB en total.')
    print()
    print('SIGUIENTE PASO — registrar la imagen en la base de datos.')
    print('Ejecute este SQL en el editor SQL de Supabase:')
    print()
    print('  update imagen_base_mapa set vigente = false;')
    print('  insert into imagen_base_mapa')
    print('    (ruta_teselas, ancho_px, alto_px, zoom_maximo, vigente, capturada_en)')
    print(
        f"  values ('/mapa/tiles', {info['ancho']}, {info['alto']}, "
        f"{info['zoom_maximo']}, true, '2026-01-01');"
    )
    print()
    print('  update configuracion set imagen_base_version_vigente =')
    print('    (select version from imagen_base_mapa where vigente);')
    print()
    print('Cambie la fecha por la del vuelo del dron.')
    print()
    print('Los puntos ya marcados NO se desplazan al cambiar de ortofoto:')
    print('se guardan en coordenadas relativas 0-1, no en píxeles (FR-006c).')


if __name__ == '__main__':
    main()
