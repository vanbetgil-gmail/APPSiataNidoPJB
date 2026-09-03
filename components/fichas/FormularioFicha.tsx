'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { validarCompletitud, type CampoFicha } from '@/lib/fichas/validarCompletitud'
import type { CategoriaBiodiversidad, ImagenBaseMapa } from '@/lib/supabase/tipos'
import { SelectorUbicacion } from './SelectorUbicacion'
import { CargarFoto, type FotoPendiente } from './CargarFoto'
import { AvisoPersonas } from './AvisoPersonas'

/**
 * Formulario de ficha de biodiversidad (T091, T094).
 *
 * Guarda como BORRADOR. La publicación es un paso aparte y deliberado
 * (FR-038a): así nadie publica sin querer al pulsar «guardar».
 *
 * El orden de los campos sigue el de una salida de campo real: primero la
 * foto, que es lo que se acaba de tomar; luego dónde estaba; y al final los
 * nombres, que a veces hay que consultar.
 */

export interface DatosFicha {
  nombre_comun: string
  nombre_cientifico: string
  categoria_id: string
  descripcion: string
  punto: { x: number; y: number } | null
}

const VACIA: DatosFicha = {
  nombre_comun: '',
  nombre_cientifico: '',
  categoria_id: '',
  descripcion: '',
  punto: null,
}

export function FormularioFicha({
  categorias,
  imagen,
  autorId,
}: {
  categorias: CategoriaBiodiversidad[]
  imagen: Pick<ImagenBaseMapa, 'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'> | null
  autorId: string
}) {
  const router = useRouter()
  const [datos, setDatos] = useState<DatosFicha>(VACIA)
  const [fotos, setFotos] = useState<FotoPendiente[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const faltantes = validarCompletitud(
    {
      nombre_comun: datos.nombre_comun,
      nombre_cientifico: datos.nombre_cientifico,
      categoria_id: datos.categoria_id || undefined,
      descripcion: datos.descripcion,
      punto_mapa_id: datos.punto ? 'pendiente' : undefined,
    },
    fotos.length
  )
  const faltaCampo = (campo: CampoFicha) => faltantes.some((f) => f.campo === campo)

  async function guardar() {
    setGuardando(true)
    setError(null)
    const supabase = crearClienteNavegador()

    try {
      if (!datos.punto) throw new Error('Falta marcar la ubicación en el mapa.')

      // 1. El punto del mapa. Se crea antes porque la ficha lo referencia.
      const { data: punto, error: errorPunto } = await supabase
        .from('punto_mapa')
        .insert({
          x_relativa: datos.punto.x,
          y_relativa: datos.punto.y,
          imagen_base_version: 1,
        })
        .select('id')
        .single()

      if (errorPunto || !punto) throw new Error('No se pudo guardar la ubicación.')

      // 2. La ficha, siempre como borrador.
      const { data: ficha, error: errorFicha } = await supabase
        .from('ficha_biodiversidad')
        .insert({
          nombre_comun: datos.nombre_comun.trim(),
          nombre_cientifico: datos.nombre_cientifico.trim(),
          categoria_id: datos.categoria_id,
          descripcion: datos.descripcion.trim(),
          punto_mapa_id: punto.id,
          autor_id: autorId,
          estado: 'borrador',
        })
        .select('id')
        .single()

      if (errorFicha || !ficha) throw new Error('No se pudo guardar la ficha.')

      // 3. Las fotos, ya redimensionadas en el navegador.
      for (const [indice, foto] of fotos.entries()) {
        const ruta = `${ficha.id}/${indice}-${Date.now()}.jpg`
        const { error: errorSubida } = await supabase.storage
          .from('fotos-fichas')
          .upload(ruta, foto.archivo, { contentType: 'image/jpeg', upsert: false })

        if (errorSubida) throw new Error('No se pudo subir la fotografía.')

        await supabase.from('foto_ficha').insert({
          ficha_id: ficha.id,
          ruta_storage: ruta,
          orden: indice,
          subida_por: autorId,
        })
      }

      router.push(`/fichas?creada=${ficha.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al guardar.')
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. La fotografía</h2>
        <CargarFoto fotos={fotos} onCambio={setFotos} />
        <AvisoPersonas />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. Dónde estaba</h2>
        {imagen ? (
          <SelectorUbicacion
            imagen={imagen}
            punto={datos.punto}
            onCambio={(punto) => setDatos((d) => ({ ...d, punto }))}
          />
        ) : (
          <p className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950">
            Todavía no se ha cargado la imagen aérea del colegio, así que no se puede marcar la
            ubicación. Avise al docente responsable.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">3. Qué es</h2>

        <Campo
          id="nombre_comun"
          etiqueta="Nombre común"
          ayuda="Como se le dice en el colegio. Por ejemplo: guayacán amarillo."
          valor={datos.nombre_comun}
          onCambio={(v) => setDatos((d) => ({ ...d, nombre_comun: v }))}
          invalido={faltaCampo('nombre_comun')}
        />

        <Campo
          id="nombre_cientifico"
          etiqueta="Nombre científico"
          ayuda="Género y especie, en cursiva por convención. Por ejemplo: Tabebuia chrysantha."
          valor={datos.nombre_cientifico}
          onCambio={(v) => setDatos((d) => ({ ...d, nombre_cientifico: v }))}
          invalido={faltaCampo('nombre_cientifico')}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="categoria" className="text-sm font-medium">
            Categoría
          </label>
          <select
            id="categoria"
            value={datos.categoria_id}
            onChange={(e) => setDatos((d) => ({ ...d, categoria_id: e.target.value }))}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          >
            <option value="">Elija una…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="descripcion" className="text-sm font-medium">
            Importancia biológica
          </label>

          {/*
            Las preguntas guía van FUERA del campo, no en el placeholder.
            Un placeholder desaparece en cuanto se escribe la primera letra,
            justo cuando se necesita recordar qué faltaba por contestar. Y
            los lectores de pantalla no siempre lo anuncian.
          */}
          <ul
            id="guia-importancia"
            className="mb-1 flex flex-col gap-1 text-sm"
            style={{ color: 'var(--color-texto-suave)' }}
          >
            <li>· ¿Qué papel cumple en el ecosistema del colegio? ¿Da sombra, alimento, refugio?</li>
            <li>· ¿Qué aporta a la biodiversidad del campus? ¿Es nativa o introducida?</li>
            <li>· ¿Cómo afecta a quienes pasan por ahí? ¿Mejora el aire, la temperatura, el ruido?</li>
            <li>· ¿Qué observaron ustedes en campo que valga la pena registrar?</li>
          </ul>

          <textarea
            id="descripcion"
            rows={7}
            value={datos.descripcion}
            onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
            aria-describedby="guia-importancia contador-importancia"
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          />
          <p id="contador-importancia" className="text-sm text-[color:var(--color-texto-suave)]">
            Escriba para alguien que no estuvo allí. {datos.descripcion.trim().length} caracteres.
          </p>
        </div>
      </section>

      {faltantes.length > 0 && (
        <div className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-fondo)] p-4">
          <p className="text-sm font-medium">Para poder publicarla después, falta:</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-[color:var(--color-texto-suave)]">
            {faltantes.map((f) => (
              <li key={f.campo}>{f.mensaje}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[color:var(--color-texto-suave)]">
            Puede guardarla igualmente como borrador y completarla más tarde.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-daniña)] bg-red-50 px-4 py-3 text-sm text-red-950">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !datos.nombre_comun.trim()}
          className="rounded-full bg-[color:var(--color-marca)] px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar como borrador'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-[color:var(--color-borde)] px-5 py-3"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Campo({
  id,
  etiqueta,
  ayuda,
  valor,
  onCambio,
  invalido,
}: {
  id: string
  etiqueta: string
  ayuda: string
  valor: string
  onCambio: (v: string) => void
  invalido: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={id}
        type="text"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-describedby={`${id}-ayuda`}
        aria-invalid={invalido && valor.length > 0}
        className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
      />
      <p id={`${id}-ayuda`} className="text-sm text-[color:var(--color-texto-suave)]">
        {ayuda}
      </p>
    </div>
  )
}
