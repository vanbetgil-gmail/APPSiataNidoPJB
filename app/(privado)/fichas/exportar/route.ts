import { NextResponse } from 'next/server'
import { integranteActual } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import {
  construirLibroDeFichas,
  nombreDelArchivo,
  type FichaExportable,
} from '@/lib/fichas/exportar'

/**
 * Descarga de las fichas en hoja de cálculo — FR-036.
 *
 * ── Por qué se genera en el servidor ─────────────────────────────────────
 *
 * Podría armarse en el navegador, pero entonces el archivo se construiría
 * con lo que la pantalla tenga cargado en ese momento. Aquí se consulta la
 * base en el instante de la descarga, así que el archivo refleja el estado
 * real y no una copia que quedó en memoria hace media hora.
 *
 * ── Sobre los permisos ───────────────────────────────────────────────────
 *
 * Se usa el cliente con la sesión de quien descarga, no la clave de
 * servicio. RLS decide qué filas entran en el archivo, exactamente igual
 * que decide qué se ve en pantalla. Una exportación que enseñe más que la
 * interfaz es una fuga con formato de hoja de cálculo.
 */
export async function GET() {
  const integrante = await integranteActual()

  if (!integrante) {
    return NextResponse.json({ error: 'Se necesita sesión iniciada.' }, { status: 401 })
  }

  const supabase = await crearClienteServidor()

  const [{ data: fichas, error }, { data: categorias }, { data: personas }, { data: fotos }] =
    await Promise.all([
      supabase
        .from('ficha_biodiversidad')
        .select('*')
        .order('nombre_comun'),
      supabase.from('categoria_biodiversidad').select('id, nombre'),
      supabase.from('integrante').select('id, nombre'),
      supabase.from('foto_ficha').select('ficha_id'),
    ])

  if (error) {
    return NextResponse.json({ error: 'No se pudieron leer las fichas.' }, { status: 500 })
  }

  const nombreCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre]))
  const nombrePersona = new Map((personas ?? []).map((p) => [p.id, p.nombre]))

  const fotosPorFicha = new Map<string, number>()
  for (const f of fotos ?? []) {
    fotosPorFicha.set(f.ficha_id, (fotosPorFicha.get(f.ficha_id) ?? 0) + 1)
  }

  const exportables: FichaExportable[] = (fichas ?? []).map((f) => ({
    nombre_comun: f.nombre_comun,
    nombre_cientifico: f.nombre_cientifico,
    categoria: nombreCategoria.get(f.categoria_id) ?? null,
    estado: f.estado,
    descripcion: f.descripcion,
    autor: nombrePersona.get(f.autor_id) ?? null,
    tiene_ubicacion: Boolean(f.punto_mapa_id),
    numero_de_fotos: fotosPorFicha.get(f.id) ?? 0,
    ediciones_usadas: f.ediciones_usadas ?? 0,
    mostrar_autor: f.mostrar_autor,
    aprobada_por: f.aprobada_por ? (nombrePersona.get(f.aprobada_por) ?? null) : null,
    aprobada_en: f.aprobada_en,
    creada_en: f.creada_en,
    modificada_en: f.modificada_en,
  }))

  const libro = construirLibroDeFichas(exportables, integrante.nombre)

  return new NextResponse(new Uint8Array(libro), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreDelArchivo()}"`,
      // El archivo cambia con cada ficha que se edite: no debe cachearse.
      'Cache-Control': 'no-store',
    },
  })
}
