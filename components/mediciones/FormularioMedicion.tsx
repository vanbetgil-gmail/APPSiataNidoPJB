'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { guardarMedicion } from '@/lib/mediciones/acciones'
import { RANGOS, validarValor } from '@/lib/validacion/rangos'
import { horaActual } from '@/lib/mediciones/ritmo'

/**
 * Una medición: las diez variables del medidor.
 *
 * ── Cómo se usa esto de verdad ───────────────────────────────────────────
 *
 * De pie, en un taller, con el medidor en una mano y el teléfono en la otra,
 * copiando números de una pantalla pequeña a otra. Eso manda sobre el diseño:
 *
 *  · `inputMode="decimal"` abre el teclado numérico. Buscar las cifras en el
 *    teclado normal, diez veces seguidas, cuesta más que la medición.
 *  · Un campo por renglón, con la unidad al lado. En dos columnas se pierde
 *    la fila y se escribe el CO₂ en la casilla de la humedad.
 *  · Vacío significa NO MEDIDO y se guarda como tal. Un cero de relleno
 *    diría que se midió y dio cero, que es otra cosa (FR-025).
 *
 * ── Lo que se escribe no se pierde ───────────────────────────────────────
 *
 * Cada tecla se guarda en el propio navegador. Si la señal se cae al pulsar
 * guardar, si el teléfono se bloquea o si alguien cierra sin querer, los
 * números siguen ahí al volver.
 *
 * No es todavía el funcionamiento sin conexión de la Historia 3 —para eso
 * hace falta que la página cargue sin red—, pero cubre el caso que más duele:
 * haber tecleado ocho lecturas y perderlas.
 *
 * ── Advertir sin impedir ─────────────────────────────────────────────────
 *
 * Un valor fuera de lo habitual pinta un aviso y pide confirmación. No
 * bloquea. Si un taller de soldadura marca de verdad 900 µg/m³, ese es
 * justamente el dato que el proyecto busca (FR-024).
 */

function claveDelBorrador(jornadaId: string, numero: number): string {
  return `siata-medicion:${jornadaId}:${numero}`
}

interface Borrador {
  valores: Record<string, string>
  nota: string
}

function leerBorrador(clave: string): Borrador {
  try {
    const guardado = window.localStorage.getItem(clave)
    if (!guardado) return { valores: {}, nota: '' }
    const datos = JSON.parse(guardado) as Partial<Borrador>
    return { valores: datos.valores ?? {}, nota: datos.nota ?? '' }
  } catch {
    // Un borrador ilegible no es motivo para dejar de funcionar.
    return { valores: {}, nota: '' }
  }
}

/**
 * ¿Estamos ya en el navegador?
 *
 * ── Por qué hace falta saberlo ───────────────────────────────────────────
 *
 * Porque el borrador vive en `localStorage`, que no existe en el servidor.
 * Leerlo al renderizar haría que el servidor pintara casillas vacías y el
 * navegador las pintara llenas, y React se quejaría de la discrepancia.
 *
 * Recuperarlo desde un efecto tampoco vale: llamar a `setState` dentro de un
 * efecto provoca renderizados en cascada, y la regla `set-state-in-effect`
 * lo prohíbe con razón.
 *
 * La salida es montar el formulario de verdad solo cuando ya hay navegador.
 * Entonces el borrador se lee en el inicializador de `useState` —una sola
 * vez, sin efecto y sin discrepancia— porque en ese momento `localStorage`
 * existe con seguridad.
 */
const sinSuscripcion = () => () => {}

function useEnElNavegador(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false
  )
}

export function FormularioMedicion(props: {
  jornadaId: string
  numero: number
  /** Cierto mientras la jornada esté cerrada. */
  bloqueado?: boolean
}) {
  const enElNavegador = useEnElNavegador()

  // Un hueco de la altura aproximada del formulario: sin él, la pantalla da
  // un salto al aparecer los diez campos de golpe.
  if (!enElNavegador) return <div className="h-[32rem]" aria-hidden />

  // La clave cambia al guardar una medición, y con ella el borrador que hay
  // que cargar. Remontar el componente es la forma limpia de releerlo.
  return <Formulario key={`${props.jornadaId}:${props.numero}`} {...props} />
}

function Formulario({
  jornadaId,
  numero,
  bloqueado,
}: {
  jornadaId: string
  numero: number
  bloqueado?: boolean
}) {
  const router = useRouter()
  const clave = claveDelBorrador(jornadaId, numero)

  const inicial = useState(() => leerBorrador(clave))[0]

  const [valores, setValores] = useState<Record<string, string>>(inicial.valores)
  const [hora, setHora] = useState('')
  const [nota, setNota] = useState(inicial.nota)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmado, setConfirmado] = useState(false)

  useEffect(() => {
    if (Object.keys(valores).length === 0 && !nota) return
    try {
      window.localStorage.setItem(clave, JSON.stringify({ valores, nota }))
    } catch {
      // Modo privado, almacenamiento lleno. Se sigue sin guardar borrador.
    }
  }, [clave, valores, nota])

  function comoNumero(texto: string | undefined): number | null {
    if (texto === undefined) return null
    const limpio = texto.trim().replace(',', '.')
    if (limpio === '') return null
    const n = Number(limpio)
    return Number.isNaN(n) ? Number.NaN : n
  }

  const avisos = RANGOS.map((rango) => {
    const resultado = validarValor(rango.clave, comoNumero(valores[rango.clave]))
    return resultado.estado === 'advertencia' || resultado.estado === 'rechazado'
      ? { clave: rango.clave, ...resultado }
      : null
  }).filter((a): a is NonNullable<typeof a> => a !== null)

  const hayRechazos = avisos.some((a) => a.estado === 'rechazado')
  const hayAdvertencias = avisos.some((a) => a.estado === 'advertencia')
  const algunValor = RANGOS.some((r) => comoNumero(valores[r.clave]) !== null)

  async function guardar() {
    setGuardando(true)
    setError(null)

    const numeros: Record<string, number | null> = {}
    for (const rango of RANGOS) numeros[rango.clave] = comoNumero(valores[rango.clave])

    const resultado = await guardarMedicion({
      // `crypto.randomUUID` en el navegador: el identificador nace aquí para
      // que reenviar sea inofensivo (R-006, FR-027).
      id: crypto.randomUUID(),
      jornadaId,
      numero,
      hora: hora || horaActual(new Date()),
      valores: numeros,
      nota,
    })

    if (!resultado.ok) {
      setError(resultado.mensaje)
      setGuardando(false)
      return
    }

    // Guardada de verdad: el borrador ya no hace falta.
    try {
      window.localStorage.removeItem(clave)
    } catch {
      /* da igual */
    }

    setValores({})
    setNota('')
    setHora('')
    setConfirmado(false)
    setGuardando(false)
    router.refresh()
  }

  if (bloqueado) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="hora" className="text-sm font-medium">
            Hora de la lectura
          </label>
          <input
            id="hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-base"
          />
        </div>
        <p className="pb-2 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Si la deja vacía se guarda la hora actual.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {RANGOS.map((rango) => {
          const aviso = avisos.find((a) => a.clave === rango.clave)
          return (
            <li
              key={rango.clave}
              className="flex items-center gap-3 rounded-[--radius-tarjeta] border px-3 py-2"
              style={{
                borderColor:
                  aviso?.estado === 'rechazado'
                    ? 'var(--color-ica-daniña)'
                    : aviso
                      ? 'var(--color-ica-sensibles)'
                      : 'var(--color-borde)',
                backgroundColor: 'var(--color-superficie)',
              }}
            >
              <label htmlFor={rango.clave} className="min-w-0 flex-1 text-sm">
                {rango.etiqueta}
                {rango.unidad && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
                    ({rango.unidad})
                  </span>
                )}
              </label>

              <input
                id={rango.clave}
                // `text` y no `number`: en `number`, la rueda del ratón
                // cambia el valor al desplazar la página, y el navegador
                // descarta en silencio lo que considera mal escrito.
                type="text"
                inputMode="decimal"
                value={valores[rango.clave] ?? ''}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [rango.clave]: e.target.value }))
                }
                aria-invalid={aviso?.estado === 'rechazado'}
                aria-describedby={aviso ? `${rango.clave}-aviso` : undefined}
                placeholder="—"
                className="w-28 rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-fondo)] px-3 py-2 text-right text-base tabular-nums"
              />
            </li>
          )
        })}
      </ul>

      {avisos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {avisos.map((aviso) => (
            <li
              key={aviso.clave}
              id={`${aviso.clave}-aviso`}
              className="rounded-[--radius-tarjeta] border px-3 py-2 text-sm leading-relaxed"
              style={{
                borderColor:
                  aviso.estado === 'rechazado'
                    ? 'var(--color-ica-daniña)'
                    : 'var(--color-ica-sensibles)',
                backgroundColor: aviso.estado === 'rechazado' ? '#fdf3f3' : '#fff8ef',
              }}
            >
              {aviso.mensaje}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nota" className="text-sm font-medium">
          ¿Pasó algo raro? (opcional)
        </label>
        <input
          id="nota"
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Estaban soldando al lado, el medidor parpadeaba…"
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-base"
        />
        <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Lo que escriba aquí marca la medición como dudosa, y los tableros la
          señalan. Es preferible a descartarla.
        </p>
      </div>

      {hayAdvertencias && !hayRechazos && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            He comprobado el medidor: los valores señalados arriba son los que marca.
          </span>
        </label>
      )}

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
        onClick={guardar}
        disabled={guardando || hayRechazos || !algunValor || (hayAdvertencias && !confirmado)}
        className="rounded-full px-5 py-3 font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-marca)' }}
      >
        {guardando ? 'Guardando…' : `Guardar la medición ${numero}`}
      </button>

      {!algunValor && (
        <p className="text-sm" style={{ color: 'var(--color-texto-suave)' }}>
          Escriba al menos un valor. Las casillas que deje vacías se guardan como «no medido», que
          no es lo mismo que cero.
        </p>
      )}
    </div>
  )
}
