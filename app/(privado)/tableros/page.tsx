import Link from 'next/link'
import { Aviso } from '@/components/ui/Aviso'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { exigirIntegrante } from '@/lib/auth/sesion'

export const metadata = { title: 'Tableros' }

/**
 * Tableros de resultados — Historia 4, todavía sin implementar.
 *
 * Esta pantalla existe porque es el destino por omisión tras iniciar sesión y
 * sin ella habría un 404. Dice con claridad qué falta en lugar de fingir que
 * está vacía por casualidad.
 */
export default async function PaginaTableros() {
  const integrante = await exigirIntegrante('/tableros')

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Hola, {integrante.nombre}</h1>
      <p className="mt-2 text-[color:var(--color-texto-suave)]">
        Ya está dentro del proyecto NIDO PJB.
      </p>

      <div className="mt-6">
        <Aviso>
          <strong>Los tableros todavía no están construidos.</strong> Llegarán con la Historia 4,
          junto con la migración de las 135 mediciones históricas del archivo{' '}
          <code>MEDIDORES.xlsx</code>.
        </Aviso>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Lo que ya puede hacer</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Tarjeta>
          <h3 className="font-medium">Documentar biodiversidad</h3>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
            Registre un árbol, un ave o un insecto del colegio con su fotografía y su descripción.
          </p>
          <Link
            href="/fichas/nueva"
            className="mt-3 inline-block text-sm text-[color:var(--color-marca)]"
          >
            Crear una ficha →
          </Link>
        </Tarjeta>

        <Tarjeta>
          <h3 className="font-medium">Ver el catálogo público</h3>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
            Todo lo que el equipo ha documentado hasta ahora, tal como lo ve cualquier visitante.
          </p>
          <Link
            href="/biodiversidad"
            className="mt-3 inline-block text-sm text-[color:var(--color-marca)]"
          >
            Abrir Biodiversidad PJB →
          </Link>
        </Tarjeta>
      </div>
    </div>
  )
}
