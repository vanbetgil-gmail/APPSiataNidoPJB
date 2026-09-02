'use client'

import { useActionState, useState } from 'react'
import { cambiarContrasena, type EstadoContrasena } from '@/lib/auth/acciones'
import { LARGO_MINIMO_CONTRASENA } from '@/lib/auth/reglas'

const INICIAL: EstadoContrasena = { tipo: 'inicial' }

export function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState(cambiarContrasena, INICIAL)
  const [visible, setVisible] = useState(false)

  if (estado.tipo === 'cambiada') {
    return (
      <div
        role="status"
        className="rounded-[--radius-suave] border p-6"
        style={{
          borderColor: 'var(--color-salvia)',
          backgroundColor: 'var(--color-salvia-clara)',
        }}
      >
        <h2 className="text-lg font-semibold">Contraseña cambiada</h2>
        <p className="mt-2 text-sm leading-relaxed">
          La próxima vez que entre, use la nueva. La anterior ya no sirve.
        </p>
      </div>
    )
  }

  const hayFallo = estado.tipo === 'error'

  return (
    <form action={accion} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="nueva" className="text-sm font-medium">
          Contraseña nueva
        </label>
        <div className="relative">
          <input
            id="nueva"
            name="nueva"
            type={visible ? 'text' : 'password'}
            required
            minLength={LARGO_MINIMO_CONTRASENA}
            autoComplete="new-password"
            aria-describedby="pista-contrasena"
            aria-invalid={hayFallo}
            className="w-full rounded-[--radius-tarjeta] border py-3.5 pl-4 pr-12 text-base"
            style={{
              borderColor: 'var(--color-borde)',
              backgroundColor: 'var(--color-superficie)',
            }}
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
        <p id="pista-contrasena" className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Al menos {LARGO_MINIMO_CONTRASENA} caracteres. No use la misma de su correo ni la de otra
          página.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="repetida" className="text-sm font-medium">
          Repítala
        </label>
        <input
          id="repetida"
          name="repetida"
          type={visible ? 'text' : 'password'}
          required
          minLength={LARGO_MINIMO_CONTRASENA}
          autoComplete="new-password"
          aria-invalid={hayFallo}
          className="w-full rounded-[--radius-tarjeta] border px-4 py-3.5 text-base"
          style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
        />
      </div>

      {hayFallo && (
        <p
          role="alert"
          className="rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed"
          style={{
            borderColor: 'var(--color-ica-sensibles)',
            backgroundColor: 'var(--color-crema-clara)',
            color: 'var(--color-texto)',
          }}
        >
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex w-full items-center justify-center rounded-full px-5 py-3.5 font-medium text-white transition disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-bosque)' }}
      >
        {enviando ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
