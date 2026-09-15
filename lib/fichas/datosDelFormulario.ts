import { crearClienteServidor } from '@/lib/supabase/servidor'
import type { CategoriaBiodiversidad, ImagenBaseMapa, ZonaCampus } from '@/lib/supabase/tipos'

/**
 * Lo que necesita el formulario de ficha, se esté creando o editando.
 *
 * Vive aparte porque las dos pantallas piden exactamente lo mismo, y tenerlo
 * duplicado garantizaba que tarde o temprano una añadiera un campo y la otra
 * no. Ya pasó con las zonas: se añadieron al crear y editar habría seguido
 * sin ofrecerlas.
 */
export interface DatosDelFormulario {
  categorias: CategoriaBiodiversidad[]
  zonas: ZonaCampus[]
  integrantes: { id: string; nombre: string }[]
  imagen: Pick<ImagenBaseMapa, 'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'> | null
}

export async function cargarDatosDelFormulario(): Promise<DatosDelFormulario> {
  const supabase = await crearClienteServidor()

  const [categorias, zonas, integrantes, imagen] = await Promise.all([
    supabase.from('categoria_biodiversidad').select('*').order('nombre'),
    supabase.from('zona_campus').select('*').eq('activo', true).order('nombre'),
    /*
     * De `integrante_equipo`, no de `integrante` (migracion 0016).
     *
     * RLS solo deja a un estudiante leer su propia fila de `integrante`,
     * asi que esta lista le llegaba con un unico nombre —el suyo— sin
     * error ni aviso. La vista expone solo nombres, nunca correos.
     */
    supabase.from('integrante_equipo').select('id, nombre').eq('activo', true),
    supabase
      .from('imagen_base_mapa')
      .select('ruta_teselas, zoom_maximo, ancho_px, alto_px')
      .eq('vigente', true)
      .maybeSingle(),
  ])

  return {
    categorias: (categorias.data ?? []) as CategoriaBiodiversidad[],
    /*
     * El orden alfabético se hace aquí y no en la consulta.
     *
     * PostgreSQL ordena según la configuración regional de la base, que en
     * Supabase es `C` por omisión: ahí «Á» va después de «Z» y «Cafetería»
     * queda separada de «Cancha». `localeCompare` con 'es' pone las tildes
     * donde un lector espera encontrarlas.
     */
    zonas: ((zonas.data ?? []) as ZonaCampus[]).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    ),
    integrantes: ((integrantes.data ?? []) as { id: string; nombre: string }[]).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    ),
    imagen: imagen.data as DatosDelFormulario['imagen'],
  }
}
