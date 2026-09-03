'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { solicitarRecuperacion, type EstadoRecuperacion } from '@/lib/auth/acciones'

const INICIAL: EstadoRecuperacion = { tipo: 'inicial' }

export function FormularioRecuperacion() {
  const [estado, accion, enviando] = useActionState(solicitarRecuperacion, INICIAL)

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
          Enviamos un enlace a <strong>{estado.correo}</strong>. Ábralo y podrá escribir una
          contraseña nueva.
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
          El enlace sirve una sola vez y caduca en una hora. Si no llega en unos minutos, mire en
          la carpeta de correo no deseado.
        </p>

        {/*
          La salida alternativa se ofrece AQUÍ, no solo cuando algo falla.
          El correo puede tardar, caer en no deseado o no llegar nunca, y en
          ese caso la persona ya cerró esta pantalla. Decírselo mientras
          espera evita que se quede sin saber qué hacer.
        */}
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          ¿No llega? El docente responsable puede restablecérsela en el momento, sin depender del
          correo.
        </p>

        <Link
          href="/login"
          className="mt-5 inline-block rounded-full px-4 py-2 text-sm no-underline"
          style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
        >
          Volver al acceso
        </Link>
      </div>
    )
  }

  const hayFallo = estado.tipo === 'rechazado' || estado.tipo === 'error'

  return (
    <form action={accion} className="flex flex-col gap-4">
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
          aria-describedby={hayFallo ? 'mensaje-recuperacion' : undefined}
          aria-invalid={hayFallo}
          className="w-full rounded-[--radius-tarjeta] border px-4 py-3.5 text-base"
          style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
        />
        <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          El mismo con el que entra a la aplicación.
        </p>
      </div>

      {hayFallo && (
        <p
          id="mensaje-recuperacion"
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
        className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 font-medium text-white transition disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-bosque)' }}
      >
        {enviando ? 'Enviando…' : 'Enviarme el enlace'}
      </button>

      <Link
        href="/login"
        className="flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm no-underline"
        style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
      >
        Volver al acceso
      </Link>
    </form>
  )
}
