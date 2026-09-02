import { describe, expect, it } from 'vitest'
import { transicionesDisponibles, type ContextoFicha } from '@/lib/fichas/transiciones'
import { estaCompleta, validarCompletitud } from '@/lib/fichas/validarCompletitud'

/**
 * Pruebas de la máquina de estados de las fichas.
 *
 * Es donde vive la decisión de la fase de clarificación: revisión previa SOLO
 * en la primera publicación. Un error aquí significa o bien que un estudiante
 * publica en internet sin que nadie lo revise, o bien que cada corrección de
 * una coma vuelve a la cola de aprobación.
 */

function ctx(parcial: Partial<ContextoFicha> = {}): ContextoFicha {
  return {
    estado: 'borrador',
    aprobadaAlgunaVez: false,
    esAutor: true,
    esResponsable: false,
    completa: true,
    ...parcial,
  }
}

const acciones = (c: ContextoFicha) => transicionesDisponibles(c).map((t) => t.accion)

describe('Revisión solo la primera vez — la regla central', () => {
  it('una ficha nueva solo puede enviarse a revisión, nunca publicarse directo', () => {
    expect(acciones(ctx())).toEqual(['enviar_a_revision'])
  })

  it('EL CASO QUE IMPORTA: ya aprobada una vez, el autor publica sin revisión', () => {
    expect(acciones(ctx({ aprobadaAlgunaVez: true }))).toEqual(['publicar_directo'])
  })

  it('el autor NO puede aprobar su propia ficha nueva', () => {
    const suyas = acciones(ctx({ estado: 'en_revision', esAutor: true, esResponsable: false }))
    expect(suyas).not.toContain('aprobar')
    // Pero sí puede retirarla si quiere seguir trabajándola.
    expect(suyas).toContain('volver_a_borrador')
  })

  it('solo el responsable aprueba o rechaza', () => {
    const delResponsable = acciones(
      ctx({ estado: 'en_revision', esAutor: false, esResponsable: true })
    )
    expect(delResponsable).toContain('aprobar')
    expect(delResponsable).toContain('rechazar')
  })

  it('un integrante ajeno no puede hacer nada con la ficha de otro', () => {
    expect(acciones(ctx({ esAutor: false, esResponsable: false }))).toEqual([])
  })
})

describe('Ficha incompleta — FR-041', () => {
  it('no ofrece ninguna acción que la haga pública', () => {
    const incompleta = acciones(ctx({ aprobadaAlgunaVez: true, completa: false }))
    expect(incompleta).not.toContain('publicar_directo')
  })

  it('tampoco deja aprobarla estando en revisión', () => {
    const acc = acciones(
      ctx({ estado: 'en_revision', esResponsable: true, esAutor: false, completa: false })
    )
    expect(acc).not.toContain('aprobar')
    // Devolverla con observaciones sí se puede: es justo lo que hay que hacer.
    expect(acc).toContain('rechazar')
  })

  it('sí permite acciones que no publican nada', () => {
    const acc = acciones(ctx({ estado: 'publicado', completa: false }))
    expect(acc).toContain('despublicar')
  })
})

describe('Despublicar y volver a publicar', () => {
  it('una ficha publicada puede retirarse del mapa', () => {
    expect(acciones(ctx({ estado: 'publicado' }))).toEqual(['despublicar'])
  })

  it('una retirada vuelve directa, sin nueva revisión: ya fue aprobada', () => {
    expect(acciones(ctx({ estado: 'despublicado', aprobadaAlgunaVez: true }))).toEqual([
      'republicar',
    ])
  })
})

describe('Completitud — FR-039, FR-041', () => {
  const completa = {
    nombre_comun: 'Guayacán amarillo',
    nombre_cientifico: 'Tabebuia chrysantha',
    categoria_id: 'uuid-categoria',
    descripcion: 'Árbol grande junto a la cancha, florece en amarillo intenso hacia marzo.',
    punto_mapa_id: 'uuid-punto',
  }

  it('acepta una ficha completa con foto', () => {
    expect(estaCompleta(completa, 1)).toBe(true)
  })

  it('rechaza una ficha sin fotografía', () => {
    const faltan = validarCompletitud(completa, 0)
    expect(faltan.map((f) => f.campo)).toEqual(['foto'])
  })

  it('rechaza una descripción demasiado corta', () => {
    const faltan = validarCompletitud({ ...completa, descripcion: 'Un árbol.' }, 1)
    expect(faltan.map((f) => f.campo)).toContain('descripcion')
  })

  it('nombra CADA campo que falta, no un mensaje genérico', () => {
    const faltan = validarCompletitud({}, 0)
    expect(faltan.map((f) => f.campo).sort()).toEqual(
      ['categoria_id', 'descripcion', 'foto', 'nombre_comun', 'nombre_cientifico', 'punto_mapa_id'].sort()
    )
    // Cada mensaje explica qué se espera, no solo que falta algo.
    for (const falta of faltan) {
      expect(falta.mensaje.length).toBeGreaterThan(30)
    }
  })

  it('no acepta espacios en blanco como contenido', () => {
    const faltan = validarCompletitud({ ...completa, nombre_comun: '   ' }, 1)
    expect(faltan.map((f) => f.campo)).toContain('nombre_comun')
  })
})
