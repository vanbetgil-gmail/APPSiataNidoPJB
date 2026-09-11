import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Toda tabla con RLS tiene una política de escritura, o está declarada
 * como de solo lectura a propósito.
 *
 * ── Por qué esta prueba existe ───────────────────────────────────────────
 *
 * En PostgreSQL, una tabla con RLS activado y sin política para una
 * operación la rechaza SIEMPRE. No hace falta una regla que prohíba: basta
 * con que no exista ninguna que permita. Es lo contrario de lo que sugiere
 * la intuición, y por eso se olvida.
 *
 * `foto_ficha` quedó así desde el primer día. Ninguna fotografía pudo
 * adjuntarse nunca a ninguna ficha. El archivo subía al almacenamiento
 * —esa cubeta tiene reglas propias y estaban bien— y la fila que lo
 * relacionaba con la ficha se rechazaba en silencio, dejando imágenes
 * huérfanas en el servidor y fichas que decían «Sin fotografía».
 *
 * `punto_mapa` tenía el mismo hueco y habría aparecido el día que llegara
 * la ortofoto, con las coordenadas ya marcadas y sin guardar.
 *
 * Esta prueba lee las migraciones y compara. No consulta la base de datos
 * a propósito: debe fallar al escribir la migración, no al desplegarla.
 */

const SQL = readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
  .join('\n')

/** Sin comentarios: una política citada en la prosa no es una política. */
const EFECTIVO = SQL.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')

/**
 * Tablas que de verdad nadie debe poder escribir desde la aplicación.
 *
 * Si alguna tabla nueva entra aquí, que sea por una decisión escrita y no
 * por un descuido. Hoy la lista está vacía: todo lo que tiene RLS se
 * escribe desde algún sitio.
 */
const SOLO_LECTURA: string[] = []

function tablasConRls(): string[] {
  const m = [...EFECTIVO.matchAll(/alter table\s+(\w+)\s+enable row level security/g)]
  return [...new Set(m.map((x) => x[1]))]
}

function politicasDe(tabla: string): string[] {
  const m = [...EFECTIVO.matchAll(/create policy\s+"?(\w+)"?\s+on\s+(\w+)\s+for\s+(\w+)/gs)]
  return m.filter((x) => x[2] === tabla).map((x) => x[3].toLowerCase())
}

describe('Políticas de escritura', () => {
  it('hay tablas con RLS que analizar', () => {
    // Si esta prueba falla, el análisis de más abajo estaría pasando en
    // vacío y diría que todo está bien sin haber mirado nada.
    expect(tablasConRls().length).toBeGreaterThan(10)
  })

  it('toda tabla con RLS admite inserción desde algún rol', () => {
    const mudas = tablasConRls().filter((t) => {
      if (SOLO_LECTURA.includes(t)) return false
      const p = politicasDe(t)
      return !p.includes('insert') && !p.includes('all')
    })

    expect(
      mudas,
      `Estas tablas tienen RLS y ninguna política de inserción, así que ` +
        `PostgreSQL las rechaza siempre: ${mudas.join(', ')}`
    ).toEqual([])
  })

  it('las dos tablas que ya fallaron tienen su política', () => {
    // Prueba de regresión explícita, con nombre, para que quien lea el
    // fallo sepa de qué se trataba sin ir al historial.
    expect(politicasDe('foto_ficha')).toContain('insert')
    expect(politicasDe('punto_mapa')).toContain('insert')
  })

  it('lo que se puede crear se puede corregir o retirar', () => {
    // Poder subir una foto y no poder quitarla deja al equipo sin salida
    // ante una imagen equivocada, que con menores no es un detalle menor.
    for (const tabla of ['foto_ficha', 'punto_mapa']) {
      const p = politicasDe(tabla)
      expect(
        p.includes('delete') || p.includes('update') || p.includes('all'),
        `${tabla} se puede crear pero no corregir ni retirar`
      ).toBe(true)
    }
  })
})
