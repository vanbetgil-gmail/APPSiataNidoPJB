# NIDO PJB — Paso a paso

Guía de lo que hay que hacer para poner el proyecto en marcha, en orden.

> Para el detalle del dominio y de dónde se guardan los datos, ver
> **[DOMINIO-Y-DATOS.md](./DOMINIO-Y-DATOS.md)**: incluye los pasos exactos en
> cPanel, en Vercel y en Supabase, y qué registros DNS **no** hay que tocar
> para no dejar al colegio sin correo.

## Dónde vas — 1 de septiembre de 2026

| Bloque | Estado |
|---|---|
| 1 · Base de datos | ✅ **Hecho.** Las 5 migraciones corrieron, `pnpm verificar` sale limpio |
| 2 · Mapa | ⏳ Bloqueado: falta la ortofoto cenital |
| 3 · Datos del colegio | ⏳ Pendiente del equipo |
| 4 · Publicar | 👉 **Aquí vas.** No depende de nada pendiente |
| 5 · Seguridad | ✅ **Hecho.** Las 3 comprobaciones críticas pasan contra la base real |
| 6 · Resto | 69 tareas |

**Código: 64 de 133 tareas. 82 pruebas pasan, ninguna omitida.**

Ya funcionan el mapa público, el acceso con correo institucional, la
subpestaña Biodiversidad PJB y la gestión de fichas con revisión.

**Lo único que falta para publicar es desplegar.** El SMTP y la ortofoto se
pueden resolver después, con el sitio ya en línea.

Cada bloque dice cuánto toma y qué se consigue. Si el tiempo aprieta, los
bloques 1 a 4 ya dan algo que se puede mostrar en una feria de ciencias.

---

## Antes de nada: la decisión que te ahorra un dolor de cabeza

**No instales Docker.** El proyecto se puede desarrollar entero contra un
proyecto Supabase alojado gratuito, sin Docker en tu máquina.

Esto importa especialmente en tu equipo: tienes Windows 11 Home Single
Language build 26200, y hay un fallo conocido y **sin resolver** de WSL2 en esa
familia de builds (`WSL2 is not supported with your current machine
configuration`). Podrías pasar una tarde peleando con eso sin necesidad.

| | Supabase alojado | Supabase local (Docker) |
|---|---|---|
| Docker | **No hace falta** | Obligatorio |
| Migraciones | `supabase db push` | `supabase db reset` |
| Tipos | `gen types --project-id` | `gen types --local` |
| Base compartida por el equipo | Sí | No, cada quien la suya |
| Riesgo en tu máquina | Ninguno | Fallo conocido de WSL2 |

Para un proyecto escolar con 10 personas, el alojado gana: todos ven los mismos
datos y nadie instala nada pesado.

---

## ✅ Bloque 1 — Poner la base de datos en línea  ·  HECHO

**~30 minutos.** Al terminar, la aplicación tiene dónde guardar los datos.

### 1.1 Crear el proyecto en Supabase

1. Entrar a [supabase.com](https://supabase.com) y crear una cuenta.
2. **New project**. Nombre: `nido-pjb`. Región: **South America (São Paulo)**,
   la más cercana a Colombia.
3. Guardar la contraseña de la base de datos en un lugar seguro. **No se puede
   recuperar después.**
4. Esperar unos dos minutos a que termine de crearse.

### 1.2 Crear las tablas

En el panel de Supabase, abrir **SQL Editor** y ejecutar, **en este orden**,
el contenido de estos cinco archivos. Se copia y se pega uno por uno:

1. `supabase/migrations/0001_esquema_inicial.sql` — las 15 tablas
2. `supabase/migrations/0002_disparadores.sql` — las reglas de integridad
3. `supabase/migrations/0003_rls_y_vistas.sql` — los permisos
4. `supabase/migrations/0004_vista_integrantes_y_storage.sql` — vista pública
   del equipo, almacenamiento de fotos y comprobación de acceso
5. `supabase/seed/catalogos.sql` — lugares, medidores y categorías

> **El orden importa.** `catalogos.sql` va al final porque crea la fila de
> configuración con el dominio institucional, y los disparadores la consultan.

### 1.2b Dar de alta a las personas

No hay autorregistro: nadie puede crearse una cuenta. Por cada integrante:

1. **Authentication → Users → Invite user** con su correo institucional.
2. **Table Editor → integrante**: crear la fila con el mismo `id` del usuario
   recién creado, su nombre, su rol (`integrante` o `responsable`) y si es
   menor de edad.

Debe haber **al menos un `responsable`**: la base de datos impide quedarse sin
ninguno. Es quien aprueba la primera publicación de cada ficha.

Estos pasos se hacen en el panel a propósito. Crear cuentas desde la propia
aplicación exigiría darle la clave de servicio de Supabase, que sortea todos
los permisos de la base de datos: un fallo en el código dejaría de estar
contenido.

### 1.3 Conectar el proyecto local

En el panel: **Project Settings → API**. Copiar `Project URL` y la clave
`anon public`.

Crear el archivo `.env.local` en la carpeta del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_URL_SITIO=http://localhost:3000
```

> `.env.local` está en `.gitignore`. **Nunca** se sube al repositorio.

### 1.4 Comprobar que arranca

Primero, la verificación automática:

```powershell
pnpm verificar
```

Comprueba las 15 tablas, las 3 vistas, los catálogos, el almacenamiento y —lo
más importante— que los permisos protejan de verdad lo que deben proteger.

> Si sale `ERR_PNPM_IGNORED_BUILDS`, es que faltan autorizar los scripts de
> instalación de `esbuild` y `unrs-resolver`. Ya están autorizados en
> `pnpm-workspace.yaml`; si reaparece, ejecute `pnpm install` una vez más.

Después, arrancar la aplicación:

```powershell
pnpm dev
```

Abrir `http://localhost:3000`. Debe verse la marca NIDO PJB y un mensaje
diciendo que el mapa aún no está disponible — correcto, todavía no hay
ortofoto.

---

## ⏳ Bloque 2 — El mapa  ·  BLOQUEADO (falta la ortofoto)

**~1 hora,** más lo que tarde el ortomosaico del dron.

### 2.1 Conseguir la ortofoto

Necesitas **una sola imagen cenital del colegio completo** —mirando en vertical
hacia abajo—, no fotos oblicuas ni los videos del dron. Hay tres caminos:

**Opción A — GeoMedellín (la más rápida y es gratis).**
El Distrito publica ortofotos descargables en [GeoMedellín](https://www.medellin.gov.co/geomedellin),
su infraestructura de datos espaciales, incluida una imagen aérea nueva de alta
resolución. Se recorta el área del colegio y se guarda como imagen. Es cenital
de verdad: corregida geométricamente, sin distorsión de perspectiva.

*Contrapartida*: puede ser anterior a la obra con malla verde y al bloque de
aulas nuevo que aparecen en `Toma1`.

**Opción B — volar el dron otra vez.** Cuesta cero porque el dron ya está. Las
instrucciones exactas —altura, ángulo de gimbal, hora del día— están en
[inventario-dron.md](./inventario-dron.md). Lo más simple que funciona es
**una sola foto** con el gimbal a −90° desde la altura mínima donde quepa todo
el predio.

**Opción C — ortomosaico.** Si el dron entregó decenas de fotos con solape, se
unen con DJI Terra, Pix4D o WebODM. Es la opción más frágil para alguien sin
experiencia.

> ### ⚠️ Google Maps y My Maps NO sirven
>
> Ni técnica ni legalmente:
>
> - **My Maps no exporta la imagen satelital.** Solo exporta tus capas de
>   puntos y líneas en KML, no el fondo.
> - **La imagen satelital de Google tiene derechos.** Usarla como fondo de una
>   aplicación publicada incumple sus términos, incluso mediante captura de
>   pantalla. Este proyecto va en un dominio del colegio e indexado en
>   buscadores: no es un uso privado.

> **Esto es lo que más urge del proyecto.** Sin ortofoto no hay mapa, y el mapa
> es el corazón de la aplicación. Si va a tardar, sigue con el bloque 3
> mientras tanto.

### 2.2 Generar las teselas

Una imagen de dron pesa cientos de megabytes y dejaría el mapa inutilizable en
el celular. El script la corta en piezas pequeñas.

```powershell
uv run --with pillow python scripts/generar-teselas.py "C:\ruta\a\ortofoto.tif"
```

No necesitas GDAL. Probé este script y funciona con solo Pillow.

Al terminar imprime **el SQL exacto** del paso siguiente. Cópialo.

### 2.3 Registrar la imagen

Pegar ese SQL en el **SQL Editor** de Supabase. Tiene esta forma:

```sql
update imagen_base_mapa set vigente = false;
insert into imagen_base_mapa
  (ruta_teselas, ancho_px, alto_px, zoom_maximo, vigente, capturada_en)
values ('/mapa/tiles', 4096, 3072, 4, true, '2026-03-15');
update configuracion set imagen_base_version_vigente =
  (select version from imagen_base_mapa where vigente);
```

Recargar `http://localhost:3000`: ya debe verse el colegio desde el aire.

---

## ⏳ Bloque 3 — Los datos que solo tiene el colegio  ·  PENDIENTE DEL EQUIPO

**Depende del equipo, no de la programación.** Conviene empezar ya.

Son seis cosas, y dos ya están resueltas. Ninguna la puedo resolver yo:

| # | Qué falta | Para qué | Estado |
|---|---|---|---|
| 1 | Los **10 correos institucionales** | Que los integrantes puedan entrar | ✅ Entregados el 2026-09-02 |
| 2 | Qué alias corresponde a cada persona | Atribuir las mediciones históricas | ✅ Resuelto el 2026-09-02 |
| 3 | El nombre real del lugar **`Op`** | 12 registros lo tienen | ⏳ Pendiente |
| 4 | ¿Los medidores son 4 u 8? | Ver abajo | ⏳ Pendiente |
| 5 | Permiso para señalar talleres | Ver abajo | ⏳ Pendiente |
| 6 | Dónde midió David el 22 de octubre | Recuperar 6 mediciones | ⏳ Ver abajo |

**Sobre el punto 2**: de los 8 alias del archivo, 5 quedaron vinculados a su
titular. Dos no se pudieron identificar y sus 19 mediciones se importarán sin
autor, por decisión del equipo. El octavo era un correo externo de la
Universidad de Antioquia que aparece en la hoja en bruto y que la importación
no lee; no corresponde a ningún estudiante.

**Sobre el punto 6** — este apareció al revisar el archivo. Seis mediciones del
**22 de octubre a las 12:50**, firmadas por **David García Toro**, vienen sin
lugar y sin número de serie, así que no se pueden importar: una medición de
aire sin lugar no se puede comparar ni ubicar en el mapa.

A diferencia de las otras 31 filas incompletas, estas sí son recuperables,
porque su autor sigue en el proyecto. Si David recuerda dónde midió ese día y
con qué equipo, se completan esas dos columnas en el archivo y se reimporta.
Ese mismo día hay otra jornada en el **Taller de Mecánica Automotriz con el
equipo 32**, por si le sirve de referencia.

**Sobre el punto 4** — importante: el archivo trae las series `31`–`34` y
también `9031`–`9034`. Asumí que son **cuatro** medidores y que el `90` es un
error de digitación. **Si en realidad fueran ocho aparatos distintos**, la
migración mezclaría lecturas de equipos diferentes y el histórico quedaría
dañado sin que nada avise. Hay que confirmarlo antes de migrar.

**Sobre el punto 5**: el mapa público puede señalar talleres del colegio como
puntos de alta contaminación. Eso tiene lecturas institucionales que no me
corresponde decidir. Conviene que alguien del colegio lo apruebe antes de
publicar.

---

## 👉 Bloque 4 — Publicar  ·  AQUÍ VAS

**~1 hora.** Al terminar, cualquiera puede ver el mapa desde internet.

### 4.1 Subir el código a GitHub

El proyecto todavía no es un repositorio git:

```powershell
git init
git add .
git commit -m "NIDO PJB: mapa público de biodiversidad"
```

Crear un repositorio en [github.com](https://github.com) y seguir las
instrucciones que da para subirlo.

> Revisa que `.env.local` **no** aparezca en `git status`. Si aparece, para y
> avisa: llevaría tus claves a un repositorio público.

### 4.2 Desplegar

1. Entrar a [vercel.com](https://vercel.com) con la cuenta de GitHub.
2. **Add New → Project** y elegir el repositorio.
3. En **Environment Variables**, añadir las mismas tres de `.env.local`,
   cambiando `NEXT_PUBLIC_URL_SITIO` por la dirección definitiva.
4. **Deploy**.

Las teselas del mapa no son problema: el límite de 100 MB de Vercel aplica solo
a despliegues por línea de comandos, no a los que vienen de GitHub.

### 4.3 El dominio: institutopedrojustoberrio.com

La aplicación va en el **dominio raíz**, no en un subdominio.

**En Vercel** → Settings → Domains → añadir los dos:

| Dominio | Qué hace |
|---|---|
| `institutopedrojustoberrio.com` | El sitio. Es la dirección canónica |
| `www.institutopedrojustoberrio.com` | Redirige al anterior |

**En el proveedor del dominio** (donde se compró), crear estos registros DNS:

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | 3600 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 3600 |

El `@` significa el dominio raíz. Algunos proveedores lo escriben en blanco o
como el propio dominio; es lo mismo.

Vercel muestra los valores exactos en su pantalla de Domains al añadir el
dominio: **si difieren de la tabla, haga caso a Vercel**, que a veces asigna
direcciones distintas.

Los cambios de DNS tardan entre unos minutos y unas horas. Vercel emite el
certificado HTTPS solo, sin costo, en cuanto detecta los registros.

**El correo institucional no se toca.** Cambiar los registros `A` y `CNAME` no
afecta a los `MX`, que son los que manejan el correo. Si el colegio recibe
correo en ese dominio, seguirá funcionando igual.

**Una sola dirección, siempre.** La aplicación redirige `www` al dominio raíz
de forma permanente, conservando la ruta. Un enlace de especie compartido con
`www` lleva a la misma ficha. Esto evita que los buscadores indexen dos copias
del mapa compitiendo entre sí.

### 4.4 ⚠️ El paso que rompe el acceso si se olvida

**Este es el fallo más silencioso de todo el despliegue.**

El enlace de acceso que llega por correo apunta a donde diga la configuración
de Supabase. Si se queda en `localhost`, el correo llega bien, el enlace
parece correcto, y al abrirlo desde el celular **no lleva a ninguna parte**.
Nadie puede entrar y no aparece ningún error que lo explique.

Hay que configurarlo en **dos sitios**:

**1. En Vercel** → Settings → Environment Variables:

```
NEXT_PUBLIC_URL_SITIO = https://institutopedrojustoberrio.com
```

Sin barra final. De esta variable dependen además las vistas previas al
compartir, el sitemap y las URL canónicas (ver `lib/sitio.ts`).

> La aplicación tiene una red de seguridad: en un despliegue de producción
> asume `institutopedrojustoberrio.com` aunque falte esta variable. Aun así,
> configúrela — la red de seguridad existe porque este fallo es silencioso,
> no para depender de ella.

**2. En Supabase** → Authentication → URL Configuration:

| Campo | Valor |
|---|---|
| Site URL | `https://institutopedrojustoberrio.com` |
| Redirect URLs | `https://institutopedrojustoberrio.com/**` |
| | `https://*.vercel.app/**` |
| | `http://localhost:3000/**` |

Los dos comodines adicionales permiten seguir probando desde despliegues de
prueba y desde el computador, sin tener que cambiar nada cada vez.

**Compruébelo así**: pida un enlace de acceso desde el dominio real y mire la
dirección del botón del correo. Debe empezar por
`https://institutopedrojustoberrio.com/auth/callback`. Si empieza por
`http://localhost`, falta uno de los dos pasos.

### 4.5 Lo que el dominio habilita

Con el dominio configurado funcionan tres cosas que antes no:

- **Compartir por WhatsApp.** El enlace de una especie muestra su fotografía y
  su nombre, no un cuadro genérico. Es la forma real en que este mapa va a
  circular entre las familias.
- **Aparecer en buscadores.** Cada ficha entra en el `sitemap.xml`, así que
  alguien que busque «guayacán Medellín colegio» puede llegar al trabajo de
  los estudiantes. Los despliegues de prueba quedan excluidos a propósito,
  para que no compitan con el sitio real.
- **Instalarse en el celular** con el ícono del ave del logo.

---

## ✅ Bloque 5 — Comprobar la seguridad  ·  HECHO

**~30 minutos. No es opcional.**

Escribí tres pruebas que verifican que lo privado no se filtra por lo público.
**Todavía no se han ejecutado nunca**, porque necesitaban una base de datos en
marcha. Con Supabase ya conectado, ahora sí:

```powershell
pnpm test
```

Deben pasar las tres:

1. Un visitante anónimo **no puede leer** las mediciones ni las jornadas.
2. **Ningún correo** aparece en las páginas públicas.
3. El mapa público se abre **sin pedir cuenta**.

> Si alguna falla, no publiques hasta arreglarla. Son promesas de seguridad
> sobre datos de menores de edad, no detalles técnicos.

---

## Bloque 6 — Lo que sigue

Quedan 93 tareas, todas en `specs/001-plataforma-ambiental-pjb/tasks.md`.
El orden que recomiendo **no** es el de prioridad literal:

**US1 → US3 → US2 → US4 → US5 → US6**

US3 (registrar mediciones) antes que US4 (tableros) porque dejar de usar el
formulario actual **detiene la generación de datos sucios**. Los tableros pueden
esperar; la calidad de los datos, no.

Cada bloque se retoma escribiendo `/speckit-implement` en Claude Code.

---

## Resumen en una tabla

| Bloque | Qué consigues | Tiempo | ¿Bloqueado por algo? |
|---|---|---|---|
| 1 · Base de datos | Dónde guardar | 30 min | No |
| 2 · Mapa | El colegio desde el aire | 1 h | **Sí: la ortofoto** |
| 3 · Datos del colegio | Poder migrar el histórico | — | **Sí: el equipo** |
| 4 · Publicar | Verlo desde internet | 1 h | Bloque 1 |
| 5 · Seguridad | Confianza para publicar | 30 min | Bloque 1 |
| 6 · Resto | La aplicación completa | — | Bloques 1 a 5 |

**Lo que más urge: el ortomosaico del dron.** Todo lo demás puede avanzar en
paralelo; el mapa no.
