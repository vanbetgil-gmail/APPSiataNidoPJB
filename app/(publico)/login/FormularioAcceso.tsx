'use client'

import { useActionState } from 'react'
import { solicitarEnlace, type EstadoFormulario } from '@/lib/auth/acciones'

const INICIAL: EstadoFormulario = { tipo: 'inicial' }

/**
 * Formulario de acceso (T042) — FR-011, FR-012.
 *
 * Los tres motivos de rechazo se muestran con mensajes DISTINTOS y con tono
 * distinto: el dominio ajeno es un error de quien escribe; no estar en la
 * lista no lo es, y el mensaje no debe hacer sentir a nadie que se equivocó.
 */
export function FormularioAcceso({ rutaSolicitada }: { rutaSolicitada: string }) {
  const [estado, accion, enviando] = useActionState(solicitarEnlace, INICIAL)

  if (estado.tipo === 'enviado') {
    return (
      <div
        role="status"
        className="rounded-[--radius-suave] border p-6"
        style={{
          borderColor: 'var(--color-salvia)',
          backgroundColor: 'var(--color-salvia-clara)',
        }}
      >
        <h2 className="text-lg font-semibold">Revise su correo</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Enviamos un enlace de acceso a <strong>{estado.correo}</strong>. Ábralo desde este mismo
          dispositivo y entrará directamente, sin contraseña.
        </p>
        <p className="mt-3 text-sm text-[color:var(--color-texto-suave)]">
          El enlace sirve una sola vez y caduca en una hora. Si no llega en unos minutos, revise la
          carpeta de correo no deseado.
        </p>
      </div>
    )
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="rutaSolicitada" value={rutaSolicitada} />

      <div className="flex flex-col gap-2">
        <label htmlFor="correo" className="text-sm font-medium">
          Correo institucional
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@colegio.edu.co"
          aria-describedby={estado.tipo !== 'inicial' ? 'mensaje-acceso' : undefined}
          aria-invalid={estado.tipo === 'rechazado' || estado.tipo === 'error'}
          className="w-full rounded-[--radius-tarjeta] border px-4 py-3.5 text-base transition"
          style={{
            borderColor: 'var(--color-borde)',
            backgroundColor: 'var(--color-superficie)',
          }}
        />
        <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Le enviaremos un enlace de un solo uso. Sin contraseñas que recordar.
        </p>
      </div>

      {(estado.tipo === 'rechazado' || estado.tipo === 'error') && (
        <p
          id="mensaje-acceso"
          role="alert"
          className="rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed"
          style={
            estado.tipo === 'rechazado' && estado.motivo === 'no_autorizado'
              ? { borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-fondo)' }
              : {
                  borderColor: 'var(--color-ica-sensibles)',
                  backgroundColor: 'var(--color-crema-clara)',
                  color: 'var(--color-texto)',
                }
          }
        >
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 font-medium text-white transition disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-bosque)' }}
      >
        {enviando ? 'Enviando…' : 'Entrar al observatorio'}
        {!enviando && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
