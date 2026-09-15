'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import {
  EXIGENCIAS_COMPLETAS,
  EXIGENCIAS_FASE_INICIAL,
  validarCompletitud,
  type CampoFicha,
} from '@/lib/fichas/validarCompletitud'
import type {
  CategoriaBiodiversidad,
  FichaBiodiversidad,
  ImagenBaseMapa,
  ZonaCampus,
} from '@/lib/supabase/tipos'
import { SelectorUbicacion } from './SelectorUbicacion'
import { CargarFoto, type FotoPendiente } from './CargarFoto'
import { FotosGuardadas, type FotoGuardada } from './FotosGuardadas'
import { AvisoPersonas } from './AvisoPersonas'

/**
 * Formulario de ficha de biodiversidad (T091, T094) — FR-021a, FR-041a.
 *
 * Sirve para crear y para editar. Son el mismo formulario a propósito: dos
 * versiones separadas acaban divergiendo, y quien edita se encuentra campos
 * que no estaban al crear.
 *
 * Guarda como BORRADOR. La publicación es un paso aparte y deliberado
 * (FR-038a): así nadie publica sin querer al pulsar «guardar».
 *
 * El orden sigue el de una salida de campo real: primero la foto, que es lo
 * que se acaba de tomar; luego dónde estaba; después los nombres, que a
 * veces hay que consultar; y al final quién la registró.
 *
 * ── Por qué la ubicación ya no bloquea ───────────────────────────────────
 *
 * Antes el guardado empezaba con `if (!datos.punto) throw`, y el punto solo
 * podía marcarse sobre la ortofoto. Como la ortofoto no existe, era
 * imposible crear una ficha: el formulario se abría, se rellenaba entero y
 * al guardar decía que faltaba marcar un mapa que la propia pantalla
 * declaraba no disponible.
 *
 * Ahora la ubicación son dos datos distintos que conviven:
 *
 *   · La ZONA —«Cancha de la Fraternidad»— que se elige de una lista y
 *     funciona hoy.
 *   · El PUNTO sobre la ortofoto, cuando exista, que dice exactamente dónde.
 *
 * Ninguno sustituye al otro y ninguno es obligatorio para guardar.
 */

export interface DatosFicha {
  nombre_comun: string
  nombre_cientifico: string
  categoria_id: string
  descripcion: string
  zona_id: string
  autor_id: string
  punto: { x: number; y: number } | null
}

export function FormularioFicha({
  categorias,
  zonas,
  integrantes,
  imagen,
  autorPorDefecto,
  esResponsable,
  ficha,
  fotosGuardadas = [],
}: {
  categorias: CategoriaBiodiversidad[]
  zonas: ZonaCampus[]
  /** Para el desplegable de autoría. Ya vienen ordenados. */
  integrantes: { id: string; nombre: string }[]
  imagen: Pick<ImagenBaseMapa, 'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'> | null
  autorPorDefecto: string
  esResponsable: boolean
  /** Presente al editar; ausente al crear. */
  ficha?: FichaBiodiversidad
  /** Las que la ficha ya tiene. Cuentan para el tope de tres. */
  fotosGuardadas?: FotoGuardada[]
}) {
  const router = useRouter()
  const editando = Boolean(ficha)

  const [datos, setDatos] = useState<DatosFicha>({
    nombre_comun: ficha?.nombre_comun ?? '',
    nombre_cientifico: ficha?.nombre_cientifico ?? '',
    categoria_id: ficha?.categoria_id ?? '',
    descripcion: ficha?.descripcion ?? '',
    zona_id: ficha?.zona_id ?? '',
    autor_id: ficha ? (ficha.autor_id ?? '') : autorPorDefecto,
    punto: null,
  })

  const [zonasDisponibles, setZonasDisponibles] = useState(zonas)
  const [zonaNueva, setZonaNueva] = useState('')
  const [anadiendoZona, setAnadiendoZona] = useState(false)

  const [fotos, setFotos] = useState<FotoPendiente[]>([])
  const [guardadas, setGuardadas] = useState<FotoGuardada[]>(fotosGuardadas)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // FR-041a: sin ortofoto, ni la ubicación ni la foto bloquean.
  const exigencias = imagen ? EXIGENCIAS_COMPLETAS : EXIGENCIAS_FASE_INICIAL

  const faltantes = validarCompletitud(
    {
      nombre_comun: datos.nombre_comun,
      nombre_cientifico: datos.nombre_cientifico,
      categoria_id: datos.categoria_id || undefined,
      descripcion: datos.descripcion,
      punto_mapa_id: datos.punto ? 'pendiente' : (ficha?.punto_mapa_id ?? undefined),
    },
    guardadas.length + fotos.length,
    exigencias
  )
  const faltaCampo = (campo: CampoFicha) => faltantes.some((f) => f.campo === campo)

  /**
   * Añadir una zona — solo el responsable (migración 0012).
   *
   * Se hace aquí y no en una pantalla aparte porque el momento en que
   * alguien descubre que falta una zona es justo este: con la ficha a medio
   * llenar. Mandarla a otra pantalla significaría perder lo escrito.
   */
  async function anadirZona() {
    const nombre = zonaNueva.trim()
    if (!nombre) return

    setAnadiendoZona(true)
    setError(null)

    const supabase = crearClienteNavegador()
    const { data, error: e } = await supabase
      .from('zona_campus')
      .insert({ nombre, creada_por: autorPorDefecto })
      .select('*')
      .single()

    setAnadiendoZona(false)

    if (e || !data) {
      setError(
        /duplicate|unique/i.test(e?.message ?? '')
          ? `La zona «${nombre}» ya existe en la lista.`
          : 'No se pudo añadir la zona.'
      )
      return
    }

    const zona = data as ZonaCampus
    setZonasDisponibles((z) => [...z, zona].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    setDatos((d) => ({ ...d, zona_id: zona.id }))
    setZonaNueva('')
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const supabase = crearClienteNavegador()

    try {
      // El punto del mapa solo se crea si de verdad se marcó uno.
      let puntoId: string | null = ficha?.punto_mapa_id ?? null

      if (datos.punto) {
        const { data: punto, error: errorPunto } = await supabase
          .from('punto_mapa')
          .insert({
            x_relativa: datos.punto.x,
            y_relativa: datos.punto.y,
            imagen_base_version: 1,
          })
          .select('id')
          .single()

        if (errorPunto || !punto) throw new Error('No se pudo guardar la ubicación en el mapa.')
        puntoId = punto.id
      }

      const campos = {
        nombre_comun: datos.nombre_comun.trim(),
        nombre_cientifico: datos.nombre_cientifico.trim(),
        categoria_id: datos.categoria_id,
        descripcion: datos.descripcion.trim(),
        zona_id: datos.zona_id || null,
        punto_mapa_id: puntoId,
        // Cadena vacía = «Sin registrar». En la base es un nulo, no un
        // texto vacío: no hay autor, no hay un autor que se llama «».
        autor_id: datos.autor_id || null,
      }

      let fichaId: string

      if (ficha) {
        const { error: e } = await supabase
          .from('ficha_biodiversidad')
          .update(campos)
          .eq('id', ficha.id)

        if (e) {
          // El disparador del tope de ediciones habla en español y su
          // mensaje es más útil que cualquier cosa que pudiéramos escribir.
          throw new Error(e.message)
        }
        fichaId = ficha.id
      } else {
        const { data: creada, error: e } = await supabase
          .from('ficha_biodiversidad')
          .insert({ ...campos, estado: 'borrador' })
          .select('id')
          .single()

        if (e || !creada) throw new Error(e?.message ?? 'No se pudo guardar la ficha.')
        fichaId = creada.id
      }

      /*
       * Las fotos, ya redimensionadas en el navegador.
       *
       * ── Los DOS pasos y por qué hay que mirar los dos ────────────────
       *
       * Subir la imagen y registrarla son operaciones separadas, contra
       * sistemas distintos: el almacenamiento y la base de datos. Aquí se
       * comprobaba solo la primera. La segunda se rechazaba por falta de
       * política de RLS y el rechazo no lanza excepción en supabase-js
       * —devuelve un objeto con `error`—, así que ignorarlo lo convertía
       * en silencio.
       *
       * El resultado: el archivo en el servidor, sin fila que lo
       * relacionara con nada, y la ficha diciendo «Sin fotografía». El
       * fallo de permisos se corrige en la migración 0014; el silencio,
       * aquí.
       */
      const ordenBase = guardadas.reduce((mayor, f) => Math.max(mayor, f.orden + 1), 0)

      for (const [indice, foto] of fotos.entries()) {
        const orden = ordenBase + indice
        const ruta = `${fichaId}/${orden}-${Date.now()}.jpg`

        const { error: errorSubida } = await supabase.storage
          .from('fotos-fichas')
          .upload(ruta, foto.archivo, { contentType: 'image/jpeg', upsert: false })

        if (errorSubida) throw new Error(`No se pudo subir la fotografía: ${errorSubida.message}`)

        const { error: errorRegistro } = await supabase.from('foto_ficha').insert({
          ficha_id: fichaId,
          ruta_storage: ruta,
          orden,
          subida_por: autorPorDefecto,
        })

        if (errorRegistro) {
          // El archivo ya está arriba: si no se puede registrar, se retira.
          // Dejarlo produciría exactamente el problema que acabamos de
          // corregir, imágenes huérfanas que nadie sabe de quién son.
          await supabase.storage.from('fotos-fichas').remove([ruta])
          throw new Error(
            `La imagen subió pero no se pudo asociar a la ficha: ${errorRegistro.message}`
          )
        }
      }

      router.push('/fichas')
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
        {editando && (
          <p className="text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            Las que añada aquí se suman a las que ya tenga la ficha, hasta un máximo de tres.
          </p>
        )}

        <FotosGuardadas
          fotos={guardadas}
          nombreEspecie={datos.nombre_comun || 'esta especie'}
          onQuitada={(id) => setGuardadas((g) => g.filter((f) => f.id !== id))}
        />

        <CargarFoto fotos={fotos} onCambio={setFotos} yaGuardadas={guardadas.length} />
        <AvisoPersonas />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">2. Dónde estaba</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="zona" className="text-sm font-medium">
            Zona del campus
          </label>
          <select
            id="zona"
            value={datos.zona_id}
            onChange={(e) => setDatos((d) => ({ ...d, zona_id: e.target.value }))}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          >
            <option value="">Elija una…</option>
            {zonasDisponibles.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Solo el responsable amplía la lista: si cualquiera pudiera, en un
            mes habría «cancha», «Cancha» y «la cancha» conviviendo. */}
        {esResponsable && (
          <div
            className="rounded-[--radius-tarjeta] border p-3"
            style={{
              borderColor: 'var(--color-borde)',
              backgroundColor: 'var(--color-fondo)',
            }}
          >
            <label htmlFor="zona-nueva" className="text-sm font-medium">
              ¿Falta una zona? Añádala a la lista
            </label>
            <p className="mt-0.5 mb-2 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
              Quedará disponible para todo el equipo. Solo usted puede hacerlo.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                id="zona-nueva"
                type="text"
                value={zonaNueva}
                onChange={(e) => setZonaNueva(e.target.value)}
                placeholder="Por ejemplo: Huerta escolar"
                className="min-w-0 flex-1 rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={anadirZona}
                disabled={anadiendoZona || !zonaNueva.trim()}
                className="rounded-full px-4 py-2 text-sm disabled:opacity-60"
                style={{
                  border: '1.5px solid var(--color-marca)',
                  backgroundColor: 'var(--color-salvia-clara)',
                  color: 'var(--color-marca)',
                  fontWeight: 500,
                }}
              >
                {anadiendoZona ? 'Añadiendo…' : 'Añadir'}
              </button>
            </div>
          </div>
        )}

        {imagen ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Punto exacto sobre la imagen aérea</p>
            <SelectorUbicacion
              imagen={imagen}
              punto={datos.punto}
              onCambio={(punto) => setDatos((d) => ({ ...d, punto }))}
            />
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            El punto exacto sobre la imagen aérea del colegio se podrá marcar cuando esa imagen
            esté lista. La zona ya queda registrada.
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

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">4. Quién la registró</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="autor" className="text-sm font-medium">
            Integrante del equipo
          </label>
          <select
            id="autor"
            value={datos.autor_id}
            onChange={(e) => setDatos((d) => ({ ...d, autor_id: e.target.value }))}
            className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3 text-base"
          >
            {/*
              «Sin registrar» va PRIMERO y no al final de la lista.
              
              Es la opción que protege, y las opciones que protegen no deben
              quedar escondidas detrás de once nombres: quien dude entre poner
              un nombre y no ponerlo tiene que encontrarla sin buscar.
            */}
            <option value="">Sin registrar (ficha anónima)</option>
            {integrantes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>

          <p className="text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            {/*
              La lista sale de la base, no de nombres escritos a mano: cuando
              entre alguien al equipo aparecerá solo, y cuando alguien salga
              dejará de aparecer sin que haya que tocar nada.
            */}
            Viene puesto usted. Cámbielo si la ficha la hizo otra persona del equipo —por ejemplo,
            si está pasando a limpio una salida de campo de alguien más.
          </p>

          {datos.autor_id ? (
            <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
              Este nombre no se muestra en público a menos que su titular lo autorice, ficha por
              ficha, desde la lista de fichas.
            </p>
          ) : (
            <p
              className="rounded-[--radius-tarjeta] border px-3 py-2 text-xs leading-relaxed"
              style={{
                borderColor: 'var(--color-salvia)',
                backgroundColor: 'var(--color-salvia-clara)',
                color: 'var(--color-texto)',
              }}
            >
              La ficha quedará <strong>sin autor</strong>, ni siquiera dentro del equipo. Es lo
              apropiado cuando el trabajo fue colectivo y señalar a una persona sería tan arbitrario
              como señalar a otra.
            </p>
          )}
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
        <p
          role="alert"
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-daniña)] bg-red-50 px-4 py-3 text-sm text-red-950"
        >
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
          {guardando ? 'Guardando…' : editando ? 'Guardar los cambios' : 'Guardar como borrador'}
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
