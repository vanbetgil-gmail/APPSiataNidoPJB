import { crearClienteServidor } from '@/lib/supabase/servidor'
import { enviarCorreo } from '@/lib/correo/enviar'
import { urlSitio } from '@/lib/sitio'
import { MARCA, PLATAFORMA } from '@/lib/marca'

/**
 * Aviso por correo cuando una ficha llega a verificación (FR-038f).
 *
 * ── El problema que resuelve ─────────────────────────────────────────────
 *
 * La bandeja de revisión solo se ve entrando a la aplicación. Un estudiante
 * envía su ficha un jueves por la tarde y allí se queda hasta que alguien
 * decide mirar. La propia pantalla ya destaca las que llevan más de una
 * semana esperando, que es una forma de reconocer que esto pasa.
 *
 * ── Por qué la dirección está en el entorno y no en la base de datos ─────
 *
 * Por dos razones concretas.
 *
 * La primera es RLS. Un estudiante que envía su ficha no puede leer la fila
 * de `integrante` de nadie más —ni debe—, así que esta función, que se
 * ejecuta con su sesión, no tiene forma de averiguar el correo de la
 * docente. Darle esa capacidad significaría abrir los correos del equipo a
 * los trece integrantes.
 *
 * La segunda es que el repositorio es público. Una dirección institucional
 * escrita en el código o en una migración queda en la historia de git para
 * siempre.
 *
 * Una variable de entorno resuelve las dos: vive en Vercel, no se versiona y
 * no depende de los permisos de quien dispara el aviso.
 *
 * ── Nunca interrumpe ─────────────────────────────────────────────────────
 *
 * Si no hay dirección configurada, o el servidor de correo falla, la ficha
 * se envía igual. El aviso es un añadido; perderlo no puede costarle a un
 * estudiante el trabajo que acaba de mandar.
 */

/** A quién se avisa. Vacío = nadie, y la aplicación lo dice en pantalla. */
export function destinatariosDeAvisos(): string[] {
  return (process.env.CORREO_AVISOS_REVISION ?? '')
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean)
}

export async function avisarFichaEnRevision(fichaId: string): Promise<void> {
  const destinatarios = destinatariosDeAvisos()
  if (destinatarios.length === 0) return

  try {
    const supabase = await crearClienteServidor()

    const { data: ficha } = await supabase
      .from('ficha_biodiversidad')
      .select('nombre_comun, nombre_cientifico, autor_id')
      .eq('id', fichaId)
      .maybeSingle()

    if (!ficha) return

    let autor = 'Alguien del equipo'
    if (ficha.autor_id) {
      // `integrante_equipo` y no `integrante`: la segunda no es legible
      // para el estudiante que acaba de enviar la ficha (migración 0016).
      const { data: persona } = await supabase
        .from('integrante_equipo')
        .select('nombre')
        .eq('id', ficha.autor_id)
        .maybeSingle()
      if (persona?.nombre) autor = persona.nombre
    }

    const { count } = await supabase
      .from('ficha_biodiversidad')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'en_revision')

    const pendientes = count ?? 1
    const sitio = urlSitio()

    const cuerpo = [
      `${autor} envió a verificación la ficha de ${ficha.nombre_comun} (${ficha.nombre_cientifico}).`,
      '',
      'Puede revisarla aquí:',
      `${sitio}/revision`,
      '',
      pendientes === 1
        ? 'Es la única ficha esperando verificación en este momento.'
        : `Hay ${pendientes} fichas esperando verificación en este momento.`,
      '',
      'Recuerde que solo la primera publicación de cada ficha pasa por verificación.',
      'Una vez aprobada, su autor podrá editarla y los cambios saldrán directamente.',
      '',
      '—',
      `Este aviso lo envía ${MARCA} · ${PLATAFORMA} de forma automática. No hace falta responderlo.`,
    ].join('\n')

    const resultado = await enviarCorreo({
      para: destinatarios,
      asunto: `Hay una ficha por revisar: ${ficha.nombre_comun}`,
      cuerpo,
      tiempoLimiteMs: 12_000,
    })

    if (!resultado.ok) {
      // Se registra y se sigue. Quien envió la ficha no tiene por qué
      // enterarse de que el servidor de correo está caído.
      console.error('[aviso de revisión] no se pudo enviar:', resultado.detalle)
    }
  } catch (e) {
    console.error('[aviso de revisión] error inesperado:', e)
  }
}
