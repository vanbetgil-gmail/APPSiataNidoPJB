import { describe, expect, it } from 'vitest'
import { transicionesDisponibles, type ContextoFicha } from '@/lib/fichas/transiciones'

/**
 * Quién puede hacer qué con una ficha — FR-038a a FR-038c, FR-038h.
 *
 * ── Por qué esta tabla merece pruebas ────────────────────────────────────
 *
 * Es la única pieza que decide si el trabajo de un estudiante se hace
 * público. Un fallo aquí no da error: da un botón de más o de menos, y
 * nadie lo nota hasta que alguien publica algo que debía revisarse, o hasta
 * que una ficha se queda atascada sin manera de avanzar.
 *
 * Justamente eso pasó: la docente responsable solo veía «Enviar a
 * revisión», es decir, enviársela a sí misma.
 */

const BASE: ContextoFicha = {
  estado: 'borrador',
  aprobadaAlgunaVez: false,
  esAutor: true,
  esResponsable: false,
  completa: true,
}

const acciones = (ctx: Partial<ContextoFicha>) =>
  transicionesDisponibles({ ...BASE, ...ctx }).map((t) => t.accion)

describe('Transiciones de una ficha', () => {
  describe('desde borrador', () => {
    it('un integrante la envía a verificación, no la publica', () => {
      expect(acciones({})).toEqual(['enviar_a_revision'])
    })

    it('la docente responsable la publica directamente', () => {
      // Mandarla a verificación sería enviársela a sí misma.
      expect(acciones({ esResponsable: true })).toEqual(['publicar_directo'])
      expect(acciones({ esResponsable: true })).not.toContain('enviar_a_revision')
    })

    it('una ficha ya aprobada alguna vez sale directa, sea de quien sea', () => {
      // FR-038c: la confianza se otorga una vez y no se retira.
      expect(acciones({ aprobadaAlgunaVez: true })).toEqual(['publicar_directo'])
    })

    it('quien no es autor ni responsable no puede moverla', () => {
      expect(acciones({ esAutor: false })).toEqual([])
    })
  })

  describe('desde en_revision', () => {
    it('la responsable puede verificar o devolver', () => {
      const a = acciones({ estado: 'en_revision', esResponsable: true, esAutor: false })
      expect(a).toContain('aprobar')
      expect(a).toContain('rechazar')
    })

    it('un integrante NO puede aprobar la suya', () => {
      // Es la regla que sostiene toda la revisión: sin ella, cualquiera
      // publicaría enviando y aprobando de seguido.
      expect(acciones({ estado: 'en_revision' })).not.toContain('aprobar')
    })

    it('su autor puede retirarla para seguir trabajándola', () => {
      expect(acciones({ estado: 'en_revision' })).toContain('volver_a_borrador')
    })
  })

  describe('una ficha incompleta nunca se hace pública', () => {
    it('FR-041: se filtran las acciones que publican', () => {
      for (const ctx of [
        { esResponsable: true },
        { aprobadaAlgunaVez: true },
        { estado: 'en_revision' as const, esResponsable: true },
        { estado: 'despublicado' as const },
      ]) {
        const publicables = transicionesDisponibles({ ...BASE, ...ctx, completa: false }).filter(
          (t) => t.publica
        )
        expect(publicables, JSON.stringify(ctx)).toHaveLength(0)
      }
    })

    it('pero sí puede enviarse a verificación', () => {
      // Enviar no publica: es pedir ayuda, y una ficha a medias es
      // exactamente la que necesita que alguien la mire.
      expect(acciones({ completa: false })).toContain('enviar_a_revision')
    })
  })

  it('toda acción declara su énfasis visual', () => {
    // Sin él, el botón se pinta sin estilo y «Enviar a revisión» vuelve a
    // confundirse con «Editar».
    for (const estado of ['borrador', 'en_revision', 'publicado', 'despublicado'] as const) {
      for (const t of transicionesDisponibles({ ...BASE, estado, esResponsable: true })) {
        expect(['principal', 'avanza', 'neutro'], t.accion).toContain(t.enfasis)
      }
    }
  })
})
