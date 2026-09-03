/**
 * NIDO PJB — carga el registro de taxonomía arbórea como fichas.
 *
 * Se ejecuta con:
 *   pnpm cargar-taxonomia
 *
 * Crea una ficha de biodiversidad por cada especie de
 * `lib/fichas/taxonomiaArborea.ts`, transcrito del PDF que entregó el
 * equipo. Quedan en estado BORRADOR, sin ubicación en el mapa y sin
 * fotografía, para que el equipo las complete y la docente responsable las
 * verifique antes de publicarlas.
 *
 * ── Es idempotente ───────────────────────────────────────────────────────
 *
 * Reconoce las fichas ya cargadas por su nombre científico y no las toca.
 * Volver a ejecutarlo no duplica nada ni pisa el trabajo que el equipo haya
 * hecho encima. Importa porque quien lo ejecute no va a recordar si ya lo
 * había corrido.
 *
 * ── Por qué el autor es la responsable ───────────────────────────────────
 *
 * `autor_id` no admite nulos y el registro es colectivo: lo hizo el equipo
 * entero en campo, no una persona. Atribuirlo a un estudiante al azar sería
 * inventar. Se atribuye a la docente responsable, que es quien entregó el
 * documento, y la edición queda abierta a todo el equipo (migración 0009).
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { TAXONOMIA_ARBOREA, TOTAL_ARBOLES } from '../lib/fichas/taxonomiaArborea'

// ---------------------------------------------------------------------------
try {
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const c = l.indexOf('=')
    if (c === -1) continue
    const k = l.slice(0, c).trim()
    if (!process.env[k]) process.env[k] = l.slice(c + 1).trim().replace(/^["']|["']$/g, '')
  }
} catch {
  console.error('\n✖ No se encontró .env.local\n')
  process.exit(1)
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !CLAVE || CLAVE.length < 40) {
  console.error('\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  console.error('  Si dejó la clave comentada con #, quítele la almohadilla mientras ejecuta esto.\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Arma el texto de la ficha juntando la descripción de la especie con los
 * datos del registro y, si la hay, la duda pendiente.
 *
 * La ubicación en texto SÍ va aquí. Lo que se omite hasta que exista la
 * ortofoto es el punto sobre el mapa, que es otra cosa: «Fraternidad» es un
 * dato que el equipo anotó en campo y perderlo no tendría sentido.
 */
function componerDescripcion(e: (typeof TAXONOMIA_ARBOREA)[number]): string {
  const partes = [e.descripcion]

  partes.push(
    `Ubicación en la institución: ${e.ubicacionTexto}. ` +
      `${e.cantidad === 1 ? 'Un ejemplar registrado' : `${e.cantidad} ejemplares registrados`}.`
  )

  if (e.registradoComo) {
    partes.push(
      `Nota de transcripción: en el registro original el nombre científico aparecía como ` +
        `«${e.registradoComo}». Se corrigió al escribirlo aquí; si la forma original era la ` +
        `correcta, devuélvanla.`
    )
  }

  if (e.dudaDeIdentificacion) {
    partes.push(`Por verificar en campo: ${e.dudaDeIdentificacion}`)
  }

  partes.push(
    'Esta descripción es un borrador escrito a partir del registro en papel, sin haber visto el ' +
      'árbol. Corríjanla con lo que observen: el tamaño, el estado en que está, qué animales lo ' +
      'visitan, si da sombra a alguna zona de medición.'
  )

  return partes.join('\n\n')
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('\nNIDO PJB — registro de taxonomía arbórea\n')
  console.log(`${TAXONOMIA_ARBOREA.length} especies · ${TOTAL_ARBOLES} árboles\n`)

  const { data: categoria } = await supabase
    .from('categoria_biodiversidad')
    .select('id')
    .eq('nombre', 'Árbol')
    .maybeSingle()

  if (!categoria) {
    console.error('✖ No existe la categoría «Árbol». Ejecute supabase/seed/catalogos.sql\n')
    process.exit(1)
  }

  const { data: responsable } = await supabase
    .from('integrante')
    .select('id, nombre')
    .eq('rol', 'responsable')
    .eq('activo', true)
    .order('creado_en')
    .limit(1)
    .maybeSingle()

  if (!responsable) {
    console.error('✖ No hay ninguna responsable activa. Ejecute antes `pnpm cargar-equipo`.\n')
    process.exit(1)
  }

  console.log(`Autoría: ${responsable.nombre}\n`)

  const { data: existentes } = await supabase
    .from('ficha_biodiversidad')
    .select('nombre_cientifico')

  const yaCargadas = new Set((existentes ?? []).map((f) => f.nombre_cientifico.toLowerCase()))

  let creadas = 0
  let omitidas = 0

  for (const especie of TAXONOMIA_ARBOREA) {
    if (yaCargadas.has(especie.nombreCientifico.toLowerCase())) {
      console.log(`  · ${especie.nombreComun.padEnd(30)} ya existía`)
      omitidas++
      continue
    }

    const { error } = await supabase.from('ficha_biodiversidad').insert({
      nombre_comun: especie.nombreComun,
      nombre_cientifico: especie.nombreCientifico,
      categoria_id: categoria.id,
      descripcion: componerDescripcion(especie),
      // Sin ubicación: la ortofoto no existe todavía (FR-041a, migración 0009).
      punto_mapa_id: null,
      estado: 'borrador',
      autor_id: responsable.id,
      // FR-051b: el nombre del autor no se expone por omisión.
      mostrar_autor: false,
    })

    if (error) {
      console.log(`  ✖ ${especie.nombreComun.padEnd(30)} ${error.message}`)
      continue
    }

    const marca = especie.dudaDeIdentificacion ? '⚠' : '✓'
    console.log(`  ${marca} ${especie.nombreComun.padEnd(30)} creada`)
    creadas++
  }

  const conDudas = TAXONOMIA_ARBOREA.filter((e) => e.dudaDeIdentificacion)

  console.log(`\n✓ ${creadas} fichas creadas, ${omitidas} ya existían.\n`)

  if (conDudas.length > 0) {
    console.log(`⚠ ${conDudas.length} especies tienen una duda de identificación anotada:\n`)
    for (const e of conDudas) console.log(`    ${e.nombreComun} — ${e.nombreCientifico}`)
    console.log('\n  No las corregí por mi cuenta: hay que mirar el árbol para resolverlas.')
    console.log('  Cada ficha lleva la duda escrita en su descripción.\n')
  }

  console.log('  Están en BORRADOR. El equipo las completa desde /fichas y la docente')
  console.log('  responsable las verifica antes de que se publiquen.\n')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
