import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirResponsable } from '@/lib/auth/sesion'
import { GestionIntegrantes } from '@/components/admin/GestionIntegrantes'
import { Aviso } from '@/components/ui/Aviso'
import type { Integrante } from '@/lib/supabase/tipos'

export const metadata = { title: 'Equipo del proyecto' }

/**
 * Administración de integrantes (T046) — FR-013, FR-013a.
 *
 * «El responsable del proyecto agrega o revoca integrantes desde la propia
 * aplicación, sin intervención técnica» y «NO DEBE existir autorregistro».
 *
 * Esta pantalla ES la lista de acceso: quien no esté aquí, no entra.
 */
export default async function PaginaIntegrantes() {
  await exigirResponsable('/admin/integrantes')
  const supabase = await crearClienteServidor()

  const [{ data: personas }, { data: config }] = await Promise.all([
    supabase.from('integrante').select('*').order('activo', { ascending: false }).order('nombre'),
    supabase.from('configuracion').select('dominio_institucional').maybeSingle(),
  ])

  const integrantes = (personas ?? []) as Integrante[]
  const activos = integrantes.filter((i) => i.activo)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Equipo del proyecto</h1>
      <p className="mt-2 leading-relaxed text-[color:var(--color-texto-suave)]">
        {activos.length} integrante{activos.length === 1 ? '' : 's'} con acceso. Nadie puede
        registrarse por su cuenta: el alta se hace aquí.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Aviso>
          Solo se admiten correos del dominio{' '}
          <strong>@{config?.dominio_institucional ?? 'sin configurar'}</strong>. Para cambiarlo hay
          que editar la fila de configuración en la base de datos.
        </Aviso>
      </div>

      <div className="mt-8">
        <GestionIntegrantes
          integrantes={integrantes}
          dominio={config?.dominio_institucional ?? ''}
        />
      </div>

      <p className="mt-8 text-sm text-[color:var(--color-texto-suave)]">
        <Link href="/admin/autorizaciones" className="text-[color:var(--color-marca)]">
          Gestionar autorizaciones de acudientes →
        </Link>
      </p>
    </div>
  )
}
