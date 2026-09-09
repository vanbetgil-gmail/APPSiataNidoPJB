/**
 * Aviso del registro fotográfico compartido (FR-039).
 *
 * ── Por qué el enlace llega por propiedad y no está escrito aquí ─────────
 *
 * El repositorio de este proyecto es PÚBLICO. Un enlace de SharePoint lleva
 * dentro un token de compartición, y escribirlo en el código sería
 * publicarlo: cualquiera que abra el repositorio en GitHub —o que lo
 * encuentre en un buscador— tendría la misma llave que el equipo.
 *
 * La carpeta va a contener fotografías tomadas por estudiantes dentro del
 * colegio. Eso no puede quedar accesible desde un archivo de código.
 *
 * Por eso el valor viene de `CARPETA_FOTOS_URL`, una variable de entorno SIN
 * el prefijo `NEXT_PUBLIC_`. La diferencia importa: con ese prefijo, Next.js
 * incrusta el valor en el paquete de JavaScript que descarga cualquier
 * visitante. Sin él, la variable solo existe en el servidor, y el enlace
 * únicamente se pinta dentro de una página que exige sesión iniciada.
 *
 * ── Por qué propone nombrar los archivos ─────────────────────────────────
 *
 * Porque dentro de unas semanas habrá cientos de fotos y dieciséis fichas
 * que las esperan. Sin una convención, emparejarlas será abrir una por una
 * y adivinar. `IMG_20260903_101245.jpg` no dice nada; `guayacan-hall-01.jpg`
 * lo dice todo. Cuesta lo mismo escribirlo al subir que descifrarlo después.
 */
export function AvisoRegistroFotografico({ url }: { url: string | null }) {
  return (
    <section
      className="rounded-[--radius-suave] border p-6"
      style={{
        borderColor: 'var(--color-salvia)',
        backgroundColor: 'var(--color-salvia-clara)',
      }}
      aria-labelledby="titulo-registro-fotografico"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="antetitulo">— Mientras se toman las fotos</p>

          <h2 id="titulo-registro-fotografico" className="mt-2 text-2xl">
            Registro fotográfico de las especies PJB
          </h2>

          <p className="mt-3 max-w-prose text-sm leading-relaxed">
            Las fichas de abajo todavía muestran una ilustración porque ninguna especie tiene
            fotografía. Suban las suyas a la carpeta compartida del proyecto y desde ahí las vamos
            asociando a cada ficha.
          </p>

          <div className="mt-4">
            <p className="text-sm font-medium">Al subir una foto, nómbrenla así:</p>
            <p
              className="mt-1.5 inline-block rounded-[--radius-tarjeta] px-3 py-1.5 font-mono text-sm"
              style={{ backgroundColor: 'var(--color-superficie)' }}
            >
              nombre-comun-lugar-numero.jpg
            </p>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
              Por ejemplo <strong>guayacan-fraternidad-01.jpg</strong> o{' '}
              <strong>pomarrosa-antiguo-restaurante-02.jpg</strong>. Sin tildes y sin espacios.
            </p>
          </div>

          <p
            className="mt-4 max-w-prose text-sm leading-relaxed"
            style={{ color: 'var(--color-texto-suave)' }}
          >
            <strong>Que salga la planta o el animal, no las personas.</strong> Si alguien aparece
            de fondo, tomen la foto otra vez: publicar la imagen de un menor exige autorización
            firmada de su acudiente, y una foto sin gente no necesita ninguna.
          </p>
        </div>

        {url ? (
          <a
            href={url}
            target="_blank"
            /*
             * `noopener` no es opcional al abrir en pestaña nueva: sin él, la
             * página de destino recibe una referencia a esta ventana y puede
             * cambiarle la dirección. `noreferrer` evita además filtrar de
             * qué página se venía.
             */
            rel="noopener noreferrer"
            className="shrink-0 rounded-full px-5 py-3 text-sm font-medium text-white no-underline"
            style={{ backgroundColor: 'var(--color-bosque)' }}
          >
            Abrir la carpeta compartida ↗
          </a>
        ) : (
          <p
            className="shrink-0 rounded-[--radius-tarjeta] border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--color-borde)',
              backgroundColor: 'var(--color-superficie)',
              color: 'var(--color-texto-suave)',
              maxWidth: '18rem',
            }}
          >
            La carpeta compartida todavía no está configurada. Añada{' '}
            <code>CARPETA_FOTOS_URL</code> a las variables de entorno.
          </p>
        )}
      </div>
    </section>
  )
}
