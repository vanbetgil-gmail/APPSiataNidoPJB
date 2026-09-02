#!/usr/bin/env python3
"""
NIDO PJB — genera los íconos de la aplicación a partir del logo.

Recorta el ave del logo (el elemento reconocible de la marca, FR-002) y
produce los tres tamaños que necesita el manifiesto web.

El recorte es automático: localiza la barra cromática, la excluye del análisis
de columnas para encontrar dónde termina el texto, y descarta los fragmentos
sueltos quedándose con el componente conexo más grande. Así el script sigue
funcionando aunque el logo se retoque.

Uso:  uv run --with pillow python scripts/generar-iconos.py [ruta-del-logo]

Requisito: Pillow
"""
import os
import sys
from collections import deque

from PIL import Image

LOGO = sys.argv[1] if len(sys.argv) > 1 else 'LogoActual.png'
DESTINO = 'public/iconos'
FONDO = (251, 251, 249, 255)  # --color-fondo del sistema de diseño
UMBRAL_BLANCO = 240


def recortar_ave(ruta: str) -> Image.Image:
    src = Image.open(ruta).convert('RGB')
    w, h = src.size
    px = src.load()

    def proporcion_con_tinta(y: int) -> float:
        return sum(1 for x in range(w) if sum(px[x, y]) / 3 < 235) / w

    # La barra cromática ocupa casi todo el ancho: se excluye para poder
    # encontrar el hueco entre el texto y el ave.
    barra = {y for y in range(h) if proporcion_con_tinta(y) > 0.80}

    def columna_con_tinta(x: int) -> bool:
        return any(sum(px[x, y]) / 3 < 235 for y in range(h) if y not in barra)

    perfil = [columna_con_tinta(x) for x in range(w)]
    huecos, x = [], w // 2
    while x < w:
        if not perfil[x]:
            ini = x
            while x < w and not perfil[x]:
                x += 1
            huecos.append((ini, x, x - ini))
        else:
            x += 1

    utiles = [hu for hu in huecos if hu[2] >= 5 and hu[1] < w - 5]
    inicio = utiles[-1][1] if utiles else int(w * 0.75)

    region = src.crop((inicio, 0, w, h)).convert('RGBA')
    rp = region.load()
    for y in range(region.height):
        for x in range(region.width):
            r, g, b, _ = rp[x, y]
            if r > UMBRAL_BLANCO and g > UMBRAL_BLANCO and b > UMBRAL_BLANCO:
                rp[x, y] = (r, g, b, 0)

    # Conservar solo el componente conexo mayor: descarta restos de la barra.
    visto = [[False] * region.width for _ in range(region.height)]
    componentes = []
    for y0 in range(region.height):
        for x0 in range(region.width):
            if visto[y0][x0] or rp[x0, y0][3] == 0:
                continue
            cola, comp = deque([(x0, y0)]), []
            visto[y0][x0] = True
            while cola:
                cx, cy = cola.popleft()
                comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if (
                            0 <= nx < region.width
                            and 0 <= ny < region.height
                            and not visto[ny][nx]
                            and rp[nx, ny][3] > 0
                        ):
                            visto[ny][nx] = True
                            cola.append((nx, ny))
            componentes.append(comp)

    componentes.sort(key=len, reverse=True)
    for comp in componentes[1:]:
        for cx, cy in comp:
            rp[cx, cy] = (0, 0, 0, 0)

    xs = [c[0] for c in componentes[0]]
    ys = [c[1] for c in componentes[0]]
    return region.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))


def escribir(ave: Image.Image, lado: int, margen: int, nombre: str) -> None:
    lienzo = Image.new('RGBA', (lado, lado), FONDO)
    disponible = lado - 2 * margen
    escala = min(disponible / ave.width, disponible / ave.height)
    nuevo = ave.resize(
        (max(1, int(ave.width * escala)), max(1, int(ave.height * escala))), Image.LANCZOS
    )
    lienzo.paste(nuevo, ((lado - nuevo.width) // 2, (lado - nuevo.height) // 2), nuevo)
    ruta = os.path.join(DESTINO, nombre)
    lienzo.convert('RGB').save(ruta, 'PNG', optimize=True)
    print(f'{ruta}  {lado}x{lado}  {os.path.getsize(ruta)} bytes')


if __name__ == '__main__':
    os.makedirs(DESTINO, exist_ok=True)
    ave = recortar_ave(LOGO)
    print(f'Ave recortada: {ave.size[0]}x{ave.size[1]} px')
    escribir(ave, 192, 14, 'icono-192.png')
    escribir(ave, 512, 38, 'icono-512.png')
    # 'maskable': Android puede recortar hasta un 20% del borde, así que el
    # dibujo necesita más margen para no quedar cortado.
    escribir(ave, 512, 100, 'icono-maskable-512.png')
