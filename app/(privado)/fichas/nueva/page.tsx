import Link from 'next/link'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { FormularioFicha } from '@/components/fichas/FormularioFicha'
import { cargarDatosDelFormulario } from '@/lib/fichas/datosDelFormulario'

export const metadata = { title: 'Nueva ficha' }

export default async function PaginaNuevaFicha() {
  const integrante = await exigirIntegrante('/fichas/nueva')
  const { categorias, zonas, integrantes, imagen } = await cargarDatosDelFormulario()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/fichas" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Clasificación taxonómica
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Documentar una especie</h1>
      <p className="mt-2 mb-8 leading-relaxed text-[color:var(--color-texto-suave)]">
        Se guarda como borrador. Cuando esté lista podrá enviarla a verificación, y la docente
        responsable la aprobará para que aparezca en el mapa público.
      </p>

      <FormularioFicha
        categorias={categorias}
        zonas={zonas}
        integrantes={integrantes}
        imagen={imagen}
        autorPorDefecto={integrante.id}
        esResponsable={integrante.esResponsable}
      />
    </div>
  )
}
