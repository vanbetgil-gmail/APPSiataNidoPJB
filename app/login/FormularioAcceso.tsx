'use client'

import { useActionState } from 'react'
import { solicitarEnlace, type EstadoFormulario } from './acciones'

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
        className="rounded-[--radius-tarjeta] border border-[color:var(--color-marca)] bg-[color:var(--color-marca-suave)] p-6"
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
          className="w-full rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
        />
        <p className="text-sm text-[color:var(--color-texto-suave)]">
          Solo pueden entrar los integrantes del proyecto. No hay registro abierto.
        </p>
      </div>

      {(estado.tipo === 'rechazado' || estado.tipo === 'error') && (
        <p
          id="mensaje-acceso"
          role="alert"
          className={`rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed ${
            estado.tipo === 'rechazado' && estado.motivo === 'no_autorizado'
              ? 'border-[color:var(--color-borde)] bg-[color:var(--color-fondo)]'
              : 'border-[color:var(--color-ica-sensibles)] bg-orange-50 text-orange-950'
          }`}
        >
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-full bg-[color:var(--color-marca)] px-5 py-3 font-medium text-white disabled:opacity-60"
      >
        {enviando ? 'Enviando…' : 'Enviar enlace de acceso'}
      </button>
    </form>
  )
}
