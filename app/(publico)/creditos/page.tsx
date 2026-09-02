import type { Metadata } from 'next'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { Marca } from '@/components/ui/Marca'
import { Aviso } from '@/components/ui/Aviso'

export const metadata: Metadata = {
  title: 'El equipo',
  description: 'Equipo del proyecto NIDO PJB del Instituto Pedro Justo Berrío.',
}

export const revalidate = 300

/**
 * Página pública de créditos (T035) — FR-051g.
 *
 * ── Regla que gobierna esta página ───────────────────────────────────────
 *
 * Lee de la vista `integrante_publico` (migración 0004), que filtra por la
 * MISMA condición que FR-051d aplica a la autoría de fichas: solo mayores de
 * edad, o menores con autorización de acudiente registrada.
 *
 * El correo no aparece por construcción: la vista ni siquiera lo selecciona.
 * Es la diferencia entre «se nos olvidó incluirlo» y «no puede salir».
 *
 * Se resolvió con una vista y NO abriendo la tabla `integrante` al público,
 * que habría sido la salida fácil y habría expuesto los correos.
 */
export default async function PaginaCreditos() {
  const supabase = crearClientePublico()

  // La vista ya aplica el filtro de autorización: aquí no se repite.
  const { data: integrantes } = await supabase
    .from('integrante_publico')
    .select('id, nombre')
    .order('nombre')

  const visibles = integrantes ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Marca conLecturaCompleta />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">El equipo</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-[color:var(--color-texto-suave)]">
        NIDO PJB es un proyecto ambiental escolar del Instituto Pedro Justo Berrío. Los estudiantes
        miden la calidad del aire en los talleres del colegio y documentan la biodiversidad del
        parque San José.
      </p>

      {visibles.length > 0 ? (
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {visibles.map((integrante) => (
            <li
              key={integrante.id}
              className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-3"
            >
              {integrante.nombre}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <Aviso>
            El listado del equipo se publicará cuando cada integrante lo autorice. La mayoría son
            menores de edad, así que sus nombres solo aparecen aquí con autorización de sus
            acudientes.
          </Aviso>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Acompañamiento</h2>
        <p className="mt-2 leading-relaxed text-[color:var(--color-texto-suave)]">
          El proyecto se apoya en la red SIATA del Valle de Aburrá como referencia de calidad del
          aire de la ciudad.
        </p>
      </section>
    </div>
  )
}
