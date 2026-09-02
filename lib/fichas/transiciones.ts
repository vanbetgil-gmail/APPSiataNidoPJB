import type { EstadoFicha } from '@/lib/supabase/tipos'

/**
 * Transiciones de estado de una ficha de biodiversidad (T096).
 *
 * FR-038a a FR-038d. Implementa la decisión de la fase de clarificación:
 * **revisión previa SOLO en la primera publicación**.
 *
 * ── El campo que hace funcionar todo esto ────────────────────────────────
 *
 * `aprobada_alguna_vez`. Sin él no habría forma de distinguir «ficha nueva
 * que necesita aprobación» de «ficha ya aprobada que solo se está editando».
 * Una vez `true` nunca vuelve a `false`, ni siquiera al despublicar: la
 * confianza ya fue otorgada a ese registro.
 *
 * La base de datos vuelve a comprobar esto en un disparador y en RLS. Aquí se
 * resuelve para que la interfaz sepa qué botones mostrar, no para autorizar.
 */

export type AccionFicha =
  | 'enviar_a_revision'
  | 'aprobar'
  | 'rechazar'
  | 'publicar_directo'
  | 'despublicar'
  | 'republicar'
  | 'volver_a_borrador'

export interface ContextoFicha {
  estado: EstadoFicha
  aprobadaAlgunaVez: boolean
  esAutor: boolean
  esResponsable: boolean
  completa: boolean
}

export interface TransicionPermitida {
  accion: AccionFicha
  destino: EstadoFicha
  etiqueta: string
  /** Explicación de lo que va a pasar, para mostrar antes de confirmar. */
  consecuencia: string
  /** `true` si la acción hace visible la ficha al público. */
  publica: boolean
}

/**
 * Qué puede hacer esta persona con esta ficha, ahora mismo.
 *
 * Devolver la lista completa —en vez de una función `puedeHacer(x)`— permite
 * que la interfaz pinte exactamente los botones disponibles sin duplicar la
 * lógica de decisión.
 */
export function transicionesDisponibles(ctx: ContextoFicha): TransicionPermitida[] {
  const disponibles: TransicionPermitida[] = []

  switch (ctx.estado) {
    case 'borrador':
      if (ctx.esAutor || ctx.esResponsable) {
        if (ctx.aprobadaAlgunaVez) {
          // Ya fue aprobada antes: puede volver a publicarse sin revisión.
          disponibles.push({
            accion: 'publicar_directo',
            destino: 'publicado',
            etiqueta: 'Publicar',
            consecuencia: 'La ficha volverá a verse en el mapa público de inmediato.',
            publica: true,
          })
        } else {
          disponibles.push({
            accion: 'enviar_a_revision',
            destino: 'en_revision',
            etiqueta: 'Enviar a revisión',
            consecuencia:
              'El docente responsable la revisará antes de que aparezca en el mapa público. ' +
              'Es solo la primera vez: después podrá editarla libremente.',
            publica: false,
          })
        }
      }
      break

    case 'en_revision':
      if (ctx.esResponsable) {
        disponibles.push({
          accion: 'aprobar',
          destino: 'publicado',
          etiqueta: 'Aprobar y publicar',
          consecuencia:
            'La ficha aparecerá en el mapa público. A partir de ahí su autor podrá editarla ' +
            'sin necesidad de nueva aprobación.',
          publica: true,
        })
        disponibles.push({
          accion: 'rechazar',
          destino: 'borrador',
          etiqueta: 'Devolver con observaciones',
          consecuencia:
            'Volverá a borrador y su autor verá el motivo que usted escriba. Podrá corregirla ' +
            'y enviarla de nuevo.',
          publica: false,
        })
      }
      if (ctx.esAutor) {
        disponibles.push({
          accion: 'volver_a_borrador',
          destino: 'borrador',
          etiqueta: 'Retirar de revisión',
          consecuencia: 'Volverá a borrador para que pueda seguir trabajando en ella.',
          publica: false,
        })
      }
      break

    case 'publicado':
      if (ctx.esAutor || ctx.esResponsable) {
        disponibles.push({
          accion: 'despublicar',
          destino: 'despublicado',
          etiqueta: 'Quitar del mapa público',
          consecuencia:
            'Dejará de verse públicamente, pero se conserva completa para el equipo y podrá ' +
            'volver a publicarse cuando quiera.',
          publica: false,
        })
      }
      break

    case 'despublicado':
      if (ctx.esAutor || ctx.esResponsable) {
        disponibles.push({
          accion: 'republicar',
          destino: 'publicado',
          etiqueta: 'Volver a publicar',
          consecuencia:
            'Volverá al mapa público de inmediato: ya fue aprobada una vez y no necesita ' +
            'nueva revisión.',
          publica: true,
        })
      }
      break
  }

  // FR-041: nada que haga pública una ficha incompleta.
  return ctx.completa ? disponibles : disponibles.filter((t) => !t.publica)
}

export function etiquetaEstado(estado: EstadoFicha): string {
  const nombres: Record<EstadoFicha, string> = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    publicado: 'Publicada',
    despublicado: 'Retirada del mapa',
  }
  return nombres[estado]
}

export function descripcionEstado(estado: EstadoFicha): string {
  const textos: Record<EstadoFicha, string> = {
    borrador: 'Solo usted la ve. Envíela a revisión cuando esté lista.',
    en_revision: 'Esperando que el docente responsable la apruebe. Todavía no es pública.',
    publicado: 'Visible en el mapa para cualquier persona.',
    despublicado: 'Ya no se ve en público. Se conserva para el equipo.',
  }
  return textos[estado]
}

/** Color de la etiqueta de estado. Deliberadamente NEUTRO. */
export function colorEstado(estado: EstadoFicha): string {
  // No se usa la paleta del ICA: esos colores significan calidad del aire y
  // solo eso (FR-004). Reutilizarlos aquí haría que un borrador «pareciera»
  // aire limpio.
  const colores: Record<EstadoFicha, string> = {
    borrador: 'var(--color-texto-suave)',
    en_revision: 'var(--color-marca)',
    publicado: 'var(--color-marca)',
    despublicado: 'var(--color-texto-suave)',
  }
  return colores[estado]
}
