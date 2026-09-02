import { crearClientePublico } from '@/lib/supabase/servidor'
import { MapaExplorador } from '@/components/mapa/MapaExplorador'
import { Marca } from '@/components/ui/Marca'
import type { FichaPublica, ImagenBaseMapa, PuntoDestacadoPublico } from '@/lib/supabase/tipos'

/**
 * Portada pública: el mapa de biodiversidad (T033).
 *
 * ── Lo más importante de este archivo ────────────────────────────────────
 *
 * Usa `crearClientePublico()`, que NO arrastra sesión. Es deliberado: esta
 * página se sirve igual para todo el mundo, y así resulta imposible que se
 * cuele una comprobación de sesión por descuido (FR-005, SC-001).
 *
 * Si en el futuro alguien añade aquí una redirección a /login, la prueba
 * T025 fallará. Esa es su razón de existir.
 */

// Se regenera cada 5 minutos: el contenido cambia poco y así el mapa se
// sirve prácticamente desde caché, lo que ayuda a cumplir SC-002.
export const revalidate = 300

export default async function PaginaMapa() {
  const supabase = crearClientePublico()

  const [imagenRes, fichasRes, destacadosRes] = await Promise.all([
    supabase
      .from('imagen_base_mapa')
      .select('ruta_teselas, zoom_maximo, ancho_px, alto_px')
      .eq('vigente', true)
      .maybeSingle(),
    supabase.from('ficha_publica').select('*'),
    supabase.from('punto_destacado_publico').select('*'),
  ])

  const imagen = imagenRes.data as Pick<
    ImagenBaseMapa,
    'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'
  > | null
  const fichas = (fichasRes.data ?? []) as FichaPublica[]
  const destacados = (destacadosRes.data ?? []) as PuntoDestacadoPublico[]

  // Sin ortofoto registrada no hay mapa que mostrar. Se explica en lugar de
  // dejar una pantalla rota: es el estado real hasta que llegue la toma de dron.
  if (!imagen) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Marca conLecturaCompleta />
        <h1 className="mt-8 text-2xl font-semibold">El mapa aún no está disponible</h1>
        <p className="mt-3 leading-relaxed text-[color:var(--color-texto-suave)]">
          Todavía no se ha registrado la imagen aérea del colegio. En cuanto el equipo cargue la
          toma de dron, el mapa de biodiversidad aparecerá aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        {/* FR-001: la lectura completa de la sigla aparece en la portada pública */}
        <Marca conLecturaCompleta />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Mapa de biodiversidad del colegio
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
          Cada punto lo documentaron estudiantes del Instituto Salesiano Pedro Justo Berrío. Toque uno para
          ver su fotografía y lo que observaron.
        </p>
      </div>

      <MapaExplorador imagen={imagen} fichas={fichas} destacados={destacados} />
    </div>
  )
}
