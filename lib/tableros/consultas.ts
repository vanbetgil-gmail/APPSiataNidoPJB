import { crearClienteServidor } from '@/lib/supabase/servidor'
import { calcularICA } from '@/lib/ica/calcular'
import type { CategoriaICA } from '@/lib/ica/umbrales'

/**
 * Consultas de los tableros — FR-032 a FR-037.
 *
 * ── Por qué se agrega aquí y no en la base ───────────────────────────────
 *
 * Son 98 mediciones históricas más las que registre el equipo: un conjunto
 * que cabe entero en memoria sin esfuerzo. Escribir vistas materializadas o
 * funciones de agregación en PostgreSQL para este tamaño añadiría una capa
 * que hay que mantener sincronizada a cambio de una ganancia que nadie
 * podría medir.
 *
 * Cuando el histórico crezca lo suficiente para que esto importe, el sitio
 * donde cambiarlo es este archivo y solo este.
 */

export interface MedicionTablero {
  id: string
  fecha: string
  hora: string
  lugar: string
  medidor: string
  autor: string | null
  pm1: number | null
  pm25: number | null
  pm10: number | null
  hcho: number | null
  tvoc: number | null
  humedad_relativa: number | null
  temperatura: number | null
  particulas_litro: number | null
  co2: number | null
  aqi_medidor: number | null
  dudoso: boolean
  ica: number | null
  categoria: CategoriaICA | null
}

export interface DatosTablero {
  mediciones: MedicionTablero[]
  lugares: string[]
  /** Fechas con al menos una medición, ordenadas. */
  fechas: string[]
  totalJornadas: number
  /** Mediciones marcadas como dudosas, excluidas de los promedios. */
  dudosas: number
}

export async function cargarDatosTablero(): Promise<DatosTablero> {
  const supabase = await crearClienteServidor()

  const [{ data: mediciones }, { data: jornadas }, { data: lugares }, { data: medidores }, { data: integrantes }] =
    await Promise.all([
      supabase.from('medicion').select('*').order('hora'),
      supabase.from('jornada').select('*'),
      supabase.from('lugar_medicion').select('id, nombre'),
      supabase.from('medidor').select('id, numero_serie'),
      supabase.from('integrante').select('id, nombre'),
    ])

  const porJornada = new Map((jornadas ?? []).map((j) => [j.id, j]))
  const nombreLugar = new Map((lugares ?? []).map((l) => [l.id, l.nombre]))
  const nombreMedidor = new Map((medidores ?? []).map((m) => [m.id, m.numero_serie]))
  const nombreIntegrante = new Map((integrantes ?? []).map((i) => [i.id, i.nombre]))

  const filas: MedicionTablero[] = []

  for (const m of mediciones ?? []) {
    const j = porJornada.get(m.jornada_id)
    if (!j) continue

    const { valor, categoria } = calcularICA(m.pm25, m.pm10)

    filas.push({
      id: m.id,
      fecha: j.fecha,
      hora: m.hora,
      lugar: nombreLugar.get(j.lugar_id) ?? 'Sin identificar',
      medidor: nombreMedidor.get(j.medidor_id) ?? '—',
      // FR-030b: el histórico tiene mediciones sin autor identificado.
      autor: j.integrante_id ? (nombreIntegrante.get(j.integrante_id) ?? null) : null,
      pm1: m.pm1,
      pm25: m.pm25,
      pm10: m.pm10,
      hcho: m.hcho,
      tvoc: m.tvoc,
      humedad_relativa: m.humedad_relativa,
      temperatura: m.temperatura,
      particulas_litro: m.particulas_litro,
      co2: m.co2,
      aqi_medidor: m.aqi_medidor,
      dudoso: m.dato_dudoso,
      ica: valor,
      categoria,
    })
  }

  filas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))

  return {
    mediciones: filas,
    lugares: [...new Set(filas.map((f) => f.lugar))].sort(),
    fechas: [...new Set(filas.map((f) => f.fecha))].sort(),
    totalJornadas: new Set((jornadas ?? []).map((j) => j.id)).size,
    dudosas: filas.filter((f) => f.dudoso).length,
  }
}
