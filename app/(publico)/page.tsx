import { crearClientePublico } from '@/lib/supabase/servidor'
import { MapaExplorador } from '@/components/mapa/MapaExplorador'
import { Marca } from '@/components/ui/Marca'
import type { FichaPublica, PuntoDestacadoPublico } from '@/lib/supabase/tipos'

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

  const [fichasRes, destacadosRes] = await Promise.all([
    supabase.from('ficha_publica').select('*'),
    supabase.from('punto_destacado_publico').select('*'),
  ])

  const fichas = (fichasRes.data ?? []) as FichaPublica[]
  const destacados = (destacadosRes.data ?? []) as PuntoDestacadoPublico[]

  /*
   * ── Esta página ya no depende de la ortofoto ────────────────────────
   *
   * Antes, si no había imagen aérea registrada, la portada entera decía
   * «El mapa aún no está disponible». Y no la había: el vuelo de dron que
   * hizo el colegio no tiene una sola toma cenital, así que el mapa llevaba
   * meses sin existir para nadie.
   *
   * Con coordenadas reales (migración 0018) el mapa funciona sobre imagen
   * satelital pública. La ortofoto, cuando llegue, será una capa más encima.
   */

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
          ver su fotografía y lo que observaron. El contorno verde marca los límites del colegio.
        </p>
      </div>

      <MapaExplorador fichas={fichas} destacados={destacados} />
    </div>
  )
}
