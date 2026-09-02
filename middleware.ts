import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DOMINIO_PRODUCCION } from '@/lib/sitio'

/**
 * Middleware de sesión y protección de rutas (T043) — FR-015, FR-016.
 *
 * Hace dos cosas:
 *
 * 1. Refresca la sesión en cada petición. Sin esto la sesión caduca aunque la
 *    persona esté usando la aplicación, y FR-016 exige mantenerla entre usos.
 *
 * 2. Protege el grupo `(privado)`. Y al redirigir CONSERVA la ruta pedida,
 *    para que tras autenticarse se llegue a donde se quería ir y no a la
 *    portada (escenario 6 de la Historia 2).
 *
 * ── Lo que este archivo NO es ────────────────────────────────────────────
 *
 * No es la barrera de seguridad. La barrera es RLS: aunque este middleware
 * fallara por completo, PostgreSQL seguiría negando el acceso a `medicion` y
 * `jornada`. Esto es comodidad de navegación, no control de acceso.
 *
 * Por eso la lista de rutas protegidas puede quedarse corta sin que se filtre
 * nada: lo peor que pasa es que alguien vea una pantalla vacía.
 */

const RUTAS_PRIVADAS = [
  '/jornadas',
  '/tableros',
  '/fichas',
  '/revision',
  '/admin',
]

export async function middleware(peticion: NextRequest) {
  /*
   * Una sola dirección canónica: www → dominio raíz.
   *
   * El sitio vive en institutopedrojustoberrio.com. Si además respondiera en
   * www.institutopedrojustoberrio.com, los buscadores indexarían dos copias
   * del mapa compitiendo entre sí, y los enlaces que compartan los
   * estudiantes serían inconsistentes.
   *
   * Se redirige de forma permanente (308) conservando ruta y parámetros: un
   * enlace de especie compartido con www sigue llevando a la misma ficha.
   */
  const anfitrion = peticion.headers.get('host') ?? ''
  if (anfitrion === `www.${DOMINIO_PRODUCCION}`) {
    const destino = new URL(peticion.url)
    destino.host = DOMINIO_PRODUCCION
    destino.protocol = 'https:'
    destino.port = ''
    return NextResponse.redirect(destino, 308)
  }

  let respuesta = NextResponse.next({ request: peticion })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => peticion.cookies.getAll(),
        setAll: (nuevas) => {
          nuevas.forEach(({ name, value }) => peticion.cookies.set(name, value))
          respuesta = NextResponse.next({ request: peticion })
          nuevas.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida el token contra el servidor. getSession() solo lee la
  // cookie, que es manipulable: en middleware hay que usar getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = peticion.nextUrl.pathname
  const esPrivada = RUTAS_PRIVADAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))

  if (esPrivada && !user) {
    const destino = new URL('/login', peticion.url)
    destino.searchParams.set('siguiente', ruta + peticion.nextUrl.search)
    return NextResponse.redirect(destino)
  }

  // Quien ya tiene sesión no necesita ver el formulario de acceso.
  if (ruta === '/login' && user) {
    return NextResponse.redirect(new URL('/tableros', peticion.url))
  }

  return respuesta
}

export const config = {
  matcher: [
    /*
     * Todas las rutas salvo archivos estáticos. Se excluyen explícitamente
     * las teselas del mapa y el material inmersivo: son miles de peticiones
     * de imagen y pasarlas por el middleware sería un desperdicio notable.
     */
    '/((?!_next/static|_next/image|favicon.ico|mapa/tiles|inmersivas|iconos|manifest.json|sw.js).*)',
  ],
}
