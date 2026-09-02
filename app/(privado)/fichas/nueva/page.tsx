import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { FormularioFicha } from '@/components/fichas/FormularioFicha'
import type { CategoriaBiodiversidad, ImagenBaseMapa } from '@/lib/supabase/tipos'

export const metadata = { title: 'Nueva ficha' }

export default async function PaginaNuevaFicha() {
  const integrante = await exigirIntegrante('/fichas/nueva')
  const supabase = await crearClienteServidor()

  const [categoriasRes, imagenRes] = await Promise.all([
    supabase.from('categoria_biodiversidad').select('*').order('nombre'),
    supabase
      .from('imagen_base_mapa')
      .select('ruta_teselas, zoom_maximo, ancho_px, alto_px')
      .eq('vigente', true)
      .maybeSingle(),
  ])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/fichas" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Mis fichas
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Documentar una especie</h1>
      <p className="mt-2 mb-8 leading-relaxed text-[color:var(--color-texto-suave)]">
        Se guarda como borrador. Cuando esté lista podrá enviarla a revisión, y el docente
        responsable la aprobará para que aparezca en el mapa público.
      </p>

      <FormularioFicha
        categorias={(categoriasRes.data ?? []) as CategoriaBiodiversidad[]}
        imagen={
          imagenRes.data as Pick<
            ImagenBaseMapa,
            'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'
          > | null
        }
        autorId={integrante.id}
      />
    </div>
  )
}
