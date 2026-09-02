'use client'

import { useActionState, useState } from 'react'
import { iniciarSesion, type EstadoFormulario } from '@/lib/auth/acciones'

const INICIAL: EstadoFormulario = { tipo: 'inicial' }

/**
 * Formulario de acceso (T042) — FR-011, FR-012.
 *
 * Los motivos de rechazo se muestran con mensajes DISTINTOS y con tono
 * distinto: el dominio ajeno es un error de quien escribe; no estar en la
 * lista no lo es, y el mensaje no debe hacer sentir a nadie que se equivocó.
 */
export function FormularioAcceso({ rutaSolicitada }: { rutaSolicitada: string }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, INICIAL)
  const [visible, setVisible] = useState(false)

  const hayFallo = estado.tipo === 'rechazado' || estado.tipo === 'error'

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
          autoComplete="username"
          inputMode="email"
          placeholder="nombre@colegio.edu.co"
          aria-describedby={hayFallo ? 'mensaje-acceso' : undefined}
          aria-invalid={hayFallo}
          className="w-full rounded-[--radius-tarjeta] border px-4 py-3.5 text-base transition"
          style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contrasena" className="text-sm font-medium">
          Contraseña
        </label>

        <div className="relative">
          <input
            id="contrasena"
            name="contrasena"
            /*
             * El botón del ojo existe por los teclados de celular: en una
             * pantalla táctil, escribir a ciegas una contraseña que le
             * acaban de dictar es la principal fuente de intentos fallidos.
             */
            type={visible ? 'text' : 'password'}
            required
            autoComplete="current-password"
            aria-describedby={hayFallo ? 'mensaje-acceso' : undefined}
            aria-invalid={hayFallo}
            className="w-full rounded-[--radius-tarjeta] border py-3.5 pl-4 pr-12 text-base transition"
            style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs"
            style={{ color: 'var(--color-texto-suave)' }}
          >
            {visible ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          La primera vez use la que le entregó el docente responsable. Después puede cambiarla desde
          su cuenta.
        </p>
      </div>

      {hayFallo && (
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
        {enviando ? 'Entrando…' : 'Entrar al observatorio'}
        {!enviando && <span aria-hidden>→</span>}
      </button>
    </form>
  )
}
