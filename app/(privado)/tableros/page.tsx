import Link from 'next/link'
import { TableroInteractivo } from '@/components/tableros/TableroInteractivo'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { cargarDatosTablero } from '@/lib/tableros/consultas'
import { ADVERTENCIA_VENTANA_TEMPORAL } from '@/lib/ica/umbrales'

export const metadata = { title: 'Tableros' }

/**
 * Tableros de resultados — Historia 4, FR-032 a FR-037.
 *
 * Los datos salen de la base, no del Excel: la migración del histórico ya
 * los cargó (`pnpm migrar:historico`). Toda medición nueva que registre el
 * equipo aparece aquí sin ningún paso adicional.
 */
export default async function PaginaTableros() {
  const integrante = await exigirIntegrante('/tableros')
  const datos = await cargarDatosTablero()

  const { mediciones, lugares, fechas, totalJornadas, dudosas } = datos

  if (mediciones.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {integrante.nombre}</h1>
        <div
          className="mt-6 rounded-[--radius-tarjeta] border px-5 py-4 leading-relaxed"
          style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-fondo)' }}
        >
          <strong>Todavía no hay mediciones.</strong> El histórico se carga con{' '}
          <code>pnpm migrar:historico --escribir</code>, y las nuevas se registran desde{' '}
          <Link href="/jornadas">Mediciones</Link>.
        </div>
      </div>
    )
  }

  const primera = fechas[0]
  const ultima = fechas[fechas.length - 1]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="antetitulo">— Tableros de resultados</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Qué respira el colegio</h1>
      <p
        className="mt-3 max-w-prose text-sm leading-relaxed"
        style={{ color: 'var(--color-texto-suave)' }}
      >
        {mediciones.length} mediciones en {totalJornadas} jornadas, entre el{' '}
        {formatearFecha(primera)} y el {formatearFecha(ultima)}, en {lugares.length} lugares del
        campus.
      </p>

      <div className="mt-8">
        <TableroInteractivo mediciones={mediciones} lugares={lugares} />
      </div>

      {/* ── Las dos advertencias que no pueden faltar ─────────────────── */}
      <div className="mt-10 flex flex-col gap-3">
        <Nota titulo="Estas lecturas son puntuales, no promedios de 24 horas">
          {ADVERTENCIA_VENTANA_TEMPORAL}
        </Nota>

        {dudosas > 0 && (
          <Nota titulo={`${dudosas} mediciones quedan fuera de los promedios`}>
            Vienen del lugar anotado como «Op» en el archivo original, que nadie ha podido
            identificar. Se conservan completas —no se descartaron— pero no se promedian dentro de
            ningún taller, porque atribuirlas al sitio equivocado torcería la comparación entre
            lugares. La casilla «Incluir datos dudosos» las muestra.
          </Nota>
        )}

        <Nota titulo="El AQI del aparato y el ICA de esta aplicación son cosas distintas">
          Los medidores portátiles reportan un AQI calculado con la escala estadounidense de la
          EPA. Los colores y categorías de este tablero usan el ICA colombiano de la Resolución
          2254 de 2017. Para las mismas partículas pueden dar números diferentes, y no es un error
          de ninguno de los dos.
        </Nota>
      </div>
    </div>
  )
}

function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${d} de ${meses[m - 1]} de ${a}`
}

function Nota({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[--radius-tarjeta] border px-5 py-4 text-sm leading-relaxed"
      style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-fondo)' }}
    >
      <strong>{titulo}.</strong>{' '}
      <span style={{ color: 'var(--color-texto-suave)' }}>{children}</span>
    </div>
  )
}
