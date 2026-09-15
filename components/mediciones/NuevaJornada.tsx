'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearJornada } from '@/lib/mediciones/acciones'
import {
  desdeISO,
  esDiaDeMedicion,
  fechaLegible,
  nombreDelDia,
  ultimosDiasDeMedicion,
} from '@/lib/mediciones/ritmo'
import type { LugarMedicion, Medidor } from '@/lib/supabase/tipos'

/**
 * Abrir una jornada: qué día, dónde y con qué medidor.
 *
 * ── Por qué el día se elige de una lista ─────────────────────────────────
 *
 * Porque se mide los miércoles y los viernes. Un calendario abierto obliga a
 * buscar la fecha entre treinta que no sirven, y deja escribir «12 de
 * agosto» cuando se quería «12 de septiembre»: un error de un dígito que
 * nadie detecta hasta que el tablero muestra una medición en un mes donde no
 * hubo clase.
 *
 * La lista ofrece los últimos seis días de medición, del más reciente al más
 * antiguo. En la práctica se registra el mismo día o, como mucho, se pasa a
 * limpio la jornada anterior.
 *
 * ── Y por qué se deja igualmente elegir otra ─────────────────────────────
 *
 * Porque una salida extraordinaria produce datos igual de reales, y negarse
 * a guardarlos obligaría a poner una fecha falsa —que es mucho peor que una
 * fecha inusual—. Se avisa y se deja seguir, que es el mismo criterio que
 * esta aplicación aplica a los valores fuera de rango (FR-024).
 */
export function NuevaJornada({
  lugares,
  medidores,
  hoyISO,
}: {
  lugares: LugarMedicion[]
  medidores: Medidor[]
  /**
   * Hoy, calculado en el servidor.
   *
   * Se recibe como propiedad en vez de leer `new Date()` al renderizar: eso
   * es impuro, lo marca `react-hooks/purity`, y además haría que el servidor
   * y el navegador pintaran fechas distintas si se cruza la medianoche.
   */
  hoyISO: string
}) {
  const router = useRouter()

  const sugeridos = ultimosDiasDeMedicion(desdeISO(hoyISO), 6)
  const [fecha, setFecha] = useState(sugeridos[0] ?? hoyISO)
  const [otraFecha, setOtraFecha] = useState(false)
  const [lugarId, setLugarId] = useState('')
  const [medidorId, setMedidorId] = useState(medidores.length === 1 ? medidores[0].id : '')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const diaInusual = fecha !== '' && !esDiaDeMedicion(fecha)

  async function empezar() {
    setCreando(true)
    setError(null)

    const id = crypto.randomUUID()
    const resultado = await crearJornada({ id, fecha, lugarId, medidorId })

    if (!resultado.ok) {
      setError(resultado.mensaje)
      setCreando(false)
      return
    }

    router.push(`/jornadas/${resultado.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha" className="text-sm font-medium">
          Día de la jornada
        </label>

        {otraFecha ? (
          <input
            id="fecha"
            type="date"
            value={fecha}
            max={hoyISO}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          />
        ) : (
          <select
            id="fecha"
            value={fecha}
            onChange={(e) => {
              if (e.target.value === '__otra') {
                setOtraFecha(true)
                return
              }
              setFecha(e.target.value)
            }}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          >
            {sugeridos.map((iso) => (
              <option key={iso} value={iso}>
                {fechaLegible(iso)}
                {iso === hoyISO ? ' — hoy' : ''}
              </option>
            ))}
            <option value="__otra">Otra fecha…</option>
          </select>
        )}

        {otraFecha && (
          <button
            type="button"
            onClick={() => {
              setOtraFecha(false)
              setFecha(sugeridos[0] ?? hoyISO)
            }}
            className="self-start text-sm text-[color:var(--color-marca)]"
          >
            ← Volver a los miércoles y viernes
          </button>
        )}

        {diaInusual && (
          <p
            className="rounded-[--radius-tarjeta] border px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: 'var(--color-ica-sensibles)', backgroundColor: '#fff8ef' }}
          >
            Ese día es <strong>{nombreDelDia(fecha)}</strong>, y el equipo mide los miércoles y los
            viernes. Puede guardarla igual si fue una salida especial.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lugar" className="text-sm font-medium">
          Lugar
        </label>
        <select
          id="lugar"
          value={lugarId}
          onChange={(e) => setLugarId(e.target.value)}
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
        >
          <option value="">Elija uno…</option>
          {lugares.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="medidor" className="text-sm font-medium">
          Medidor
        </label>
        <select
          id="medidor"
          value={medidorId}
          onChange={(e) => setMedidorId(e.target.value)}
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
        >
          <option value="">Elija uno…</option>
          {medidores.map((m) => (
            <option key={m.id} value={m.id}>
              {m.etiqueta ?? `Medidor ${m.numero_serie}`}
            </option>
          ))}
        </select>
        <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Anotar cuál se usó permite comparar después si dos medidores leen distinto en el mismo
          sitio.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-daniña)] bg-red-50 px-4 py-3 text-sm text-red-950"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={empezar}
        disabled={creando || !lugarId || !medidorId || !fecha}
        className="self-start rounded-full px-5 py-3 font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-marca)' }}
      >
        {creando ? 'Abriendo…' : 'Empezar la jornada'}
      </button>
    </div>
  )
}
