# Cómo actualizar el mapa tras un vuelo de dron

Esta guía es para el equipo del colegio. No hace falta saber programar: son
tres pasos y dos comandos.

Se repite cada vez que se vuele el dron y se quiera actualizar la imagen aérea
del mapa —por ejemplo, tras una temporada de lluvias, una siembra nueva o una
obra en el colegio.

---

## Antes de empezar

Se necesita:

- La ortofoto del vuelo, en un solo archivo (`.jpg`, `.png` o `.tif`).
- Python instalado. Comprobar con `python --version` en PowerShell.

**Importante sobre la ortofoto**: debe ser **una sola imagen del colegio
completo**, no las fotos sueltas del vuelo. Si el dron entregó decenas de fotos
individuales, hay que unirlas antes con el programa de vuelo (DJI Terra,
Pix4D, WebODM u otro). Ese paso se llama *ortomosaico*.

Cuanto mayor sea la resolución, mejor: FR-006b pide que se distingan árboles
individuales al máximo acercamiento.

---

## Paso 1 — Generar las teselas

Una imagen de dron pesa cientos de megabytes. Servirla entera dejaría el mapa
inutilizable en el celular. El script la corta en miles de piezas pequeñas y
Leaflet descarga solo las que se están mirando.

En PowerShell, dentro de la carpeta del proyecto:

```powershell
uv run --with pillow python scripts/generar-teselas.py "C:\ruta\a\ortofoto.tif"
```

Si no se usa `uv`:

```powershell
pip install pillow
python scripts/generar-teselas.py "C:\ruta\a\ortofoto.tif"
```

Tarda entre uno y varios minutos según el tamaño. Al terminar imprime cuántas
teselas generó y **el SQL exacto** del paso siguiente. Conviene copiarlo.

> Existe también `scripts/generar-teselas.sh`, que hace lo mismo con GDAL.
> Solo tiene sentido si ya se usa GDAL para otras cosas: instalar GDAL en
> Windows es bastante más trabajo que instalar Pillow.

---

## Paso 2 — Registrar la imagen en la base de datos

La aplicación necesita saber el tamaño de la nueva ortofoto para colocar bien
los puntos.

Abrir el panel de Supabase → **SQL Editor** → pegar el SQL que imprimió el
script. Tiene esta forma:

```sql
update imagen_base_mapa set vigente = false;

insert into imagen_base_mapa
  (ruta_teselas, ancho_px, alto_px, zoom_maximo, vigente, capturada_en)
values ('/mapa/tiles', 4096, 3072, 4, true, '2026-03-15');

update configuracion set imagen_base_version_vigente =
  (select version from imagen_base_mapa where vigente);
```

Cambiar la fecha por la del vuelo.

### ⚠️ Cuándo se mueven los puntos y cuándo no — léelo antes de sustituir nada

Esto es lo más importante de esta guía. **La imagen base no es decoración: es
el sistema de coordenadas del proyecto.**

Los puntos se guardan como fracciones de la imagen (0 a 1), no en píxeles. Eso
protege frente a **un cambio de resolución**, pero **NO frente a un cambio de
encuadre, de altura o de ángulo**:

| Qué cambia en la ortofoto nueva | ¿Se mueven los puntos? |
|---|---|
| Solo la resolución — misma foto, más o menos píxeles | **No.** Siguen sobre el mismo árbol |
| Mismo vuelo, mismo encuadre, otra fecha | **No**, si el encuadre coincide |
| Otra altura, otro ángulo u otro encuadre | **SÍ. Todos, y a sitios arbitrarios** |
| Se pasa de una toma oblicua a una cenital | **SÍ. Hay que recolocarlos uno a uno** |

Si los estudiantes marcan 200 árboles sobre una imagen y después se cambia el
punto de vista, esos 200 puntos hay que volver a ubicarlos a mano. No hay forma
automática de convertirlos: la aplicación no sabe qué había debajo de cada uno.

**Consecuencia práctica**: elige bien la imagen base **antes** de que nadie
marque el primer punto. Es la decisión más difícil de deshacer del proyecto.

Si hay que cambiar de encuadre de todos modos, hazlo **antes** de empezar a
documentar especies, o asume que habrá que recolocar todo a mano.

---

## Paso 3 — Publicar

```powershell
git add public/mapa/tiles
git commit -m "Actualizar ortofoto del mapa"
git push
```

El despliegue es automático. En un par de minutos el mapa nuevo está en línea.

---

## Cosas que conviene vigilar

### El peso del repositorio

Las teselas se versionan a propósito: son archivos estáticos y el alojamiento
las sirve gratis desde su CDN (research.md R-008). La contrapartida es que
**cada vuelo suma su tamaño al historial de Git para siempre**.

Una pirámide típica ronda los 100–200 MB. Tras tres o cuatro vuelos el
repositorio empieza a ser incómodo de clonar.

Cuando eso ocurra, hay dos salidas:

1. **Git LFS** — almacena los binarios aparte. GitHub da 1 GB gratis.
2. **Alojar las teselas fuera** (Cloudflare R2, Backblaze B2) y cambiar
   `ruta_teselas` a esa URL.

Lo que **no** hay que hacer es excluir `public/mapa/tiles/` del `.gitignore`:
la aplicación se desplegaría con el mapa en blanco.

### El relleno del lienzo

El script rellena la ortofoto hasta un cuadrado y la ancla **arriba a la
izquierda**. `lib/mapa/coordenadas.ts` descuenta ese relleno al colocar los
puntos.

Si alguien cambia la forma de rellenar en el script, **debe cambiarlo también
en `coordenadas.ts`**. Si no, todos los puntos quedan desplazados y nada falla
de forma visible: el mapa se ve bien, pero los árboles no están donde son.

Hay pruebas que cubren esto en `tests/unit/coordenadas.test.ts`. Ejecutar
`pnpm test` después de tocar cualquiera de los dos archivos.

### Comprobar antes de dar por bueno

Tras publicar, abrir el mapa y verificar que **al menos tres puntos conocidos**
caen donde deben. Si están todos desplazados en la misma dirección, el problema
es el relleno del lienzo, no las fichas.
