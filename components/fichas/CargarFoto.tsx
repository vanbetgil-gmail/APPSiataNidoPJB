'use client'

import { useRef, useState } from 'react'

/**
 * Captura o carga de fotografía (T092) — FR-040.
 *
 * `capture="environment"` hace que en el celular se abra directamente la
 * cámara trasera, que es lo que hace falta en una salida de campo.
 *
 * ── El redimensionado importa ────────────────────────────────────────────
 *
 * Una foto de celular moderno pesa entre 3 y 8 MB. Subirla tal cual gastaría
 * la cuota de almacenamiento en unas pocas decenas de fichas y dejaría el
 * catálogo lento de cargar. Se reduce a 1600 px de lado mayor y a JPEG de
 * calidad 0,82 ANTES de subir: queda en unos 300 KB sin pérdida perceptible
 * (escenario 7 de la Historia 5).
 */

export interface FotoPendiente {
  archivo: File
  vistaPrevia: string
  pesoOriginal: number
  pesoFinal: number
}

const LADO_MAXIMO = 1600
const CALIDAD = 0.82
const MAXIMO_FOTOS = 3

async function redimensionar(original: File): Promise<FotoPendiente> {
  const bitmap = await createImageBitmap(original)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolver) =>
    lienzo.toBlob(resolver, 'image/jpeg', CALIDAD)
  )
  if (!blob) throw new Error('No se pudo comprimir la imagen.')

  // Reencodificar a JPEG elimina de paso los metadatos EXIF del original,
  // que suelen incluir coordenadas GPS del teléfono. No se necesitan y no
  // conviene publicarlas.
  const archivo = new File([blob], 'foto.jpg', { type: 'image/jpeg' })

  return {
    archivo,
    vistaPrevia: URL.createObjectURL(blob),
    pesoOriginal: original.size,
    pesoFinal: blob.size,
  }
}

export function CargarFoto({
  fotos,
  onCambio,
}: {
  fotos: FotoPendiente[]
  onCambio: (fotos: FotoPendiente[]) => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alElegir(lista: FileList | null) {
    if (!lista?.length) return
    setProcesando(true)
    setError(null)
    try {
      const nuevas: FotoPendiente[] = []
      for (const archivo of Array.from(lista).slice(0, MAXIMO_FOTOS - fotos.length)) {
        if (!archivo.type.startsWith('image/')) {
          setError('Solo se pueden subir imágenes.')
          continue
        }
        nuevas.push(await redimensionar(archivo))
      }
      onCambio([...fotos, ...nuevas])
    } catch {
      setError('No se pudo procesar la imagen. Pruebe con otra.')
    } finally {
      setProcesando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  function quitar(indice: number) {
    URL.revokeObjectURL(fotos[indice].vistaPrevia)
    onCambio(fotos.filter((_, i) => i !== indice))
  }

  return (
    <div className="flex flex-col gap-3">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto, i) => (
            <li key={foto.vistaPrevia} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.vistaPrevia}
                alt={`Fotografía ${i + 1}`}
                className="aspect-square w-full rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] object-cover"
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar fotografía ${i + 1}`}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
              >
                Quitar
              </button>
              <p className="mt-1 text-xs text-[color:var(--color-texto-suave)]">
                {(foto.pesoOriginal / 1e6).toFixed(1)} MB → {(foto.pesoFinal / 1024).toFixed(0)} KB
              </p>
            </li>
          ))}
        </ul>
      )}

      {fotos.length < MAXIMO_FOTOS && (
        <>
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => alElegir(e.target.files)}
            className="sr-only"
            id="entrada-foto"
          />
          <label
            htmlFor="entrada-foto"
            className="flex cursor-pointer items-center justify-center rounded-[--radius-tarjeta] border-2 border-dashed border-[color:var(--color-borde)] px-4 py-8 text-center text-sm"
          >
            {procesando ? (
              'Procesando la imagen…'
            ) : (
              <span>
                <strong className="text-[color:var(--color-marca)]">Tomar una foto</strong> o elegir
                una del dispositivo
                <br />
                <span className="text-[color:var(--color-texto-suave)]">
                  Hasta {MAXIMO_FOTOS}. Se reducen automáticamente antes de subirlas.
                </span>
              </span>
            )}
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
          {error}
        </p>
      )}
    </div>
  )
}
