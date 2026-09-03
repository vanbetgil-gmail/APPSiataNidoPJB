import { describe, expect, it } from 'vitest'
import { reinoDeCategoria } from '@/lib/biodiversidad/reinos'

describe('Agrupación en fauna y flora', () => {
  it('clasifica las cinco categorías del catálogo inicial', () => {
    expect(reinoDeCategoria('Árbol')).toBe('flora')
    expect(reinoDeCategoria('Arbusto')).toBe('flora')
    expect(reinoDeCategoria('Planta ornamental')).toBe('flora')
    expect(reinoDeCategoria('Ave')).toBe('fauna')
    expect(reinoDeCategoria('Insecto')).toBe('fauna')
  })

  it('no depende de las tildes ni de las mayúsculas', () => {
    // El catálogo lo edita el equipo desde la aplicación: hay que contar con
    // que escriban «arbol» sin tilde o «AVE» en mayúsculas.
    expect(reinoDeCategoria('arbol')).toBe('flora')
    expect(reinoDeCategoria('AVE')).toBe('fauna')
    expect(reinoDeCategoria('  Árbol  ')).toBe('flora')
  })

  it('reconoce categorías nuevas por su palabra raíz', () => {
    expect(reinoDeCategoria('Planta trepadora')).toBe('flora')
    expect(reinoDeCategoria('Plantas acuáticas')).toBe('flora')
    expect(reinoDeCategoria('Mamífero')).toBe('fauna')
    expect(reinoDeCategoria('Reptil')).toBe('fauna')
  })

  it('manda a «otros» lo que no encaja, en vez de adivinar', () => {
    // Un hongo no es ni fauna ni flora. Asignarlo por omisión a flora lo
    // clasificaría mal en silencio, que es peor que dejarlo aparte.
    expect(reinoDeCategoria('Hongo')).toBe('otros')
    expect(reinoDeCategoria('Liquen')).toBe('otros')
    expect(reinoDeCategoria(null)).toBe('otros')
    expect(reinoDeCategoria('')).toBe('otros')
  })
})
