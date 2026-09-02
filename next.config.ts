import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Las teselas del mapa y el material inmersivo se sirven como archivos
  // estáticos desde /public (research.md R-002, R-008): no pasan por el
  // optimizador de imágenes, que los recomprimiría sin necesidad.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },

  async headers() {
    return [
      {
        /*
         * Teselas del mapa y clips inmersivos: inmutables.
         *
         * Se generan una vez y no cambian nunca; cuando el colegio vuelve a
         * volar el dron, se crea una VERSIÓN nueva en `imagen_base_mapa` con
         * su propia carpeta. Así que se pueden cachear un año entero.
         *
         * Esto es lo que hace que el mapa sea instantáneo a partir de la
         * segunda visita, y lo que evita gastar transferencia del alojamiento
         * cada vez que alguien acerca el mapa.
         */
        source: '/:ruta(mapa/tiles|inmersivas)/:archivo*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:ruta*',
        headers: [
          // Impide que el sitio se incruste en un iframe ajeno. Un mapa
          // escolar dentro de una página de terceros se prestaría a
          // suplantar al colegio.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Al salir del sitio no se filtra la ruta exacta que se estaba
          // viendo: la ficha que alguien consultaba es asunto suyo.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            /*
             * La aplicación no necesita ninguno de estos permisos del
             * dispositivo, y conviene declararlo.
             *
             * `geolocation=()` es deliberado y no un descuido: FR-042a
             * prohíbe depender del GPS para ubicar registros. Negar el
             * permiso a nivel de navegador hace imposible que se cuele por
             * accidente en el futuro.
             */
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
