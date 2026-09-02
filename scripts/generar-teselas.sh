#!/usr/bin/env bash
#
# NIDO PJB — genera la pirámide de teselas del mapa a partir de la ortofoto.
#
# Convierte una imagen grande de dron en miles de teselas de 256×256 px, una
# por nivel de acercamiento. Leaflet solo descarga las del área que se está
# mirando: por eso el mapa carga en menos de 3 segundos aunque la ortofoto
# original pese cientos de megabytes (research.md R-002, SC-002).
#
# Se usa `--profile=raster` porque la ortofoto NO está georreferenciada:
# el mapa de NIDO PJB no es geográfico, sus coordenadas son píxeles de la
# imagen (FR-006a).
#
# ESTE SCRIPT DEBE PODER EJECUTARLO EL COLEGIO sin ayuda técnica cada vez que
# vuelva a volar el dron. Ver docs/actualizar-mapa.md.
#
# Uso:
#   ./scripts/generar-teselas.sh <ortofoto> [destino]
#
# Requisito: GDAL 3.x  (Ubuntu/Debian: sudo apt install gdal-bin)
#                      (Windows: conda install -c conda-forge gdal, u OSGeo4W)

set -euo pipefail

ORIGEN="${1:-}"
DESTINO="${2:-public/mapa/tiles}"
ZOOM_MAX="${ZOOM_MAX:-5}"

if [[ -z "$ORIGEN" ]]; then
  echo "Uso: $0 <ortofoto> [destino]" >&2
  exit 1
fi

if [[ ! -f "$ORIGEN" ]]; then
  echo "Error: no se encuentra la ortofoto '$ORIGEN'" >&2
  exit 1
fi

if ! command -v gdal2tiles.py >/dev/null 2>&1 && ! command -v gdal2tiles >/dev/null 2>&1; then
  echo "Error: GDAL no está instalado. Instale gdal-bin y vuelva a intentarlo." >&2
  exit 1
fi

GDAL2TILES="$(command -v gdal2tiles.py || command -v gdal2tiles)"

echo "Ortofoto : $ORIGEN"
echo "Destino  : $DESTINO"
echo "Zoom max : $ZOOM_MAX"
echo

# Dimensiones de la imagen: hacen falta para la fila de imagen_base_mapa,
# porque las posiciones se guardan como fracción del ancho y el alto.
if command -v gdalinfo >/dev/null 2>&1; then
  DIMENSIONES="$(gdalinfo "$ORIGEN" | grep -m1 'Size is' | sed 's/Size is //')"
  echo "Dimensiones detectadas: $DIMENSIONES"
fi

mkdir -p "$DESTINO"

"$GDAL2TILES" \
  --profile=raster \
  --zoom="0-${ZOOM_MAX}" \
  --resampling=average \
  --webviewer=none \
  --xyz \
  "$ORIGEN" "$DESTINO"

echo
echo "Listo. Teselas en: $DESTINO"
echo
echo "Siguiente paso — registrar esta imagen en la base de datos:"
echo
echo "  insert into imagen_base_mapa"
echo "    (ruta_teselas, ancho_px, alto_px, zoom_maximo, vigente, capturada_en)"
echo "  values ('/mapa/tiles', <ancho>, <alto>, ${ZOOM_MAX}, true, '<fecha del vuelo>');"
echo
echo "Los puntos ya marcados NO se desplazan: se guardan en coordenadas"
echo "relativas 0-1, no en píxeles (FR-006c)."
