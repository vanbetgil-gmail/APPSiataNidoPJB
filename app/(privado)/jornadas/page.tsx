import { Aviso } from '@/components/ui/Aviso'

export const metadata = { title: 'Mediciones' }

/**
 * Registro de mediciones — Historia 3, todavía sin implementar.
 *
 * Existe para que el enlace de la cabecera no lleve a un 404 y para decir con
 * honestidad qué falta.
 */
export default function PaginaJornadas() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Registrar mediciones</h1>
      <div className="mt-6">
        <Aviso>
          <strong>Todavía no está construido.</strong> Llegará con la Historia 3: registro de
          jornadas de hasta 8 mediciones, con las 11 variables del medidor y funcionamiento sin
          conexión para poder usarlo dentro de los talleres, donde no hay señal.
        </Aviso>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
        Mientras tanto, sigan usando el formulario actual. Al construir esta pantalla se migrará
        todo el histórico y el formulario dejará de usarse.
      </p>
    </div>
  )
}
