import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

/**
 * Canje del enlace mágico (parte de T040/T043).
 *
 * Supabase envía aquí con un `code` de un solo uso. Se cambia por una sesión
 * y se redirige a donde la persona quería ir.
 */
export async function GET(peticion: Request) {
  const url = new URL(peticion.url)
  const codigo = url.searchParams.get('code')
  const siguiente = url.searchParams.get('siguiente') ?? '/tableros'

  // Solo rutas internas: aceptar una URL absoluta convertiría esto en un
  // redirector abierto que cualquiera podría usar para enviar a otro sitio.
  const destino = siguiente.startsWith('/') && !siguiente.startsWith('//') ? siguiente : '/tableros'

  if (!codigo) {
    return NextResponse.redirect(new URL('/login?error=sin_codigo', url.origin))
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.exchangeCodeForSession(codigo)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=enlace_invalido', url.origin))
  }

  return NextResponse.redirect(new URL(destino, url.origin))
}
