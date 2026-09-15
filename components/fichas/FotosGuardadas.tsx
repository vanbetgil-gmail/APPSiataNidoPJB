'use client'

import { useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { urlFoto } from '@/lib/sitio'

/**
 * Las fotografías que la ficha ya tiene guardadas.
 *
 * ── Por qué hace falta poder quitarlas ───────────────────────────────────
 *
 * Porque el tope son tres. Sin forma de retirar una, la tercera fotografía
 * es definitiva: quien suba tres y descubra que la segunda salió movida se
 * queda con ella para siempre.
 *
 * Y hay un motivo más serio. Estas fotos las toman estudiantes en un patio
 * lleno de gente: si en una aparece un menor de forma reconocible, hay que
 * poder retirarla el mismo día, sin esperar a nadie.
 *
 * ── El orden de las dos operaciones ──────────────────────────────────────
 *
 * Primero se borra la FILA y después el archivo. Al revés —archivo primero—
 * un fallo a mitad dejaría la ficha apuntando a una imagen que ya no existe:
 * un hueco roto en la página pública.
 *
 * Así, el peor caso es un archivo huérfano en el almacenamiento, que no se
 * ve en ninguna parte y no rompe nada.
 */

export interface FotoGuardada {
  id: string
  ruta_storage: string
  orden: number
}

export function FotosGuardadas({
  fotos,
  nombreEspecie,
  onQuitada,
}: {
  fotos: FotoGuardada[]
  nombreEspecie: string
  onQuitada: (id: string) => void
}) {
  const [quitando, setQuitando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (fotos.length === 0) return null

  async function quitar(foto: FotoGuardada) {
    setQuitando(foto.id)
    setError(null)
    const supabase = crearClienteNavegador()

    const { error: errorFila } = await supabase.from('foto_ficha').delete().eq('id', foto.id)

    if (errorFila) {
      setQuitando(null)
      setError('No se pudo quitar la fotografía. Puede que no tenga permiso: solo quien la subió o la docente responsable pueden hacerlo.')
      return
    }

    // El archivo, después. Si esto falla, queda un archivo que nadie ve;
    // la ficha ya está correcta y no hay nada roto que mostrar.
    await supabase.storage.from('fotos-fichas').remove([foto.ruta_storage])

    setQuitando(null)
    onQuitada(foto.id)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Ya guardadas</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((foto, i) => (
          <li key={foto.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFoto(foto.ruta_storage)}
              alt={`Fotografía ${i + 1} de ${nombreEspecie}`}
              loading="lazy"
              className="aspect-square w-full rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] object-cover"
            />
            <button
              type="button"
              onClick={() => quitar(foto)}
              disabled={quitando !== null}
              aria-label={`Quitar la fotografía ${i + 1}`}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              {quitando === foto.id ? 'Quitando…' : 'Quitar'}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
          {error}
        </p>
      )}
    </div>
  )
}
