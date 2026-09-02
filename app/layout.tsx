import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { urlSitio, esDominioDefinitivo } from '@/lib/sitio'
import './globals.css'

/*
 * Tipografías.
 *
 * `next/font` las descarga en tiempo de compilación y las sirve desde el
 * propio dominio: no hay petición a Google al cargar la página, ni el salto
 * de texto que se ve cuando una fuente llega tarde.
 *
 * Fraunces para titulares: serif cálida con un italic de verdad, que es lo
 * que da el aire editorial y sereno del diseño. Inter para todo lo demás,
 * que es lo que se lee en formularios, tablas y mapas.
 */
const display = Fraunces({
  subsets: ['latin'],
  variable: '--fuente-display',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

const sans = Inter({
  subsets: ['latin'],
  variable: '--fuente-sans',
  display: 'swap',
})

// FR-048: la interfaz está íntegramente en español.
export const metadata: Metadata = {
  // `metadataBase` convierte en absolutas todas las rutas relativas de los
  // metadatos. Sin ella, las vistas previas al compartir en WhatsApp o en
  // redes salen sin imagen: los clientes de mensajería no resuelven rutas
  // relativas (ver lib/sitio.ts).
  metadataBase: new URL(urlSitio()),

  title: {
    default: 'NIDO PJB — Mapa de biodiversidad del Instituto Salesiano Pedro Justo Berrío',
    template: '%s · NIDO PJB',
  },
  description:
    'Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío. Mapa de biodiversidad escolar y registro de mediciones de calidad del aire, hechos por los estudiantes.',
  applicationName: 'NIDO PJB',
  authors: [{ name: 'Equipo NIDO PJB — Instituto Salesiano Pedro Justo Berrío' }],
  keywords: [
    'biodiversidad escolar',
    'calidad del aire',
    'Instituto Salesiano Pedro Justo Berrío',
    'Medellín',
    'proyecto ambiental',
    'SIATA',
  ],

  // FR-045b: instalable en el celular como ícono de pantalla de inicio
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'NIDO PJB', statusBarStyle: 'default' },
  icons: { icon: '/iconos/icono-192.png', apple: '/iconos/icono-192.png' },

  alternates: { canonical: '/' },

  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'NIDO PJB',
    title: 'NIDO PJB — Mapa de biodiversidad del Instituto Salesiano Pedro Justo Berrío',
    description:
      'Los árboles, las aves y los insectos del colegio, documentados uno a uno por los estudiantes.',
    url: '/',
    images: [{ url: '/iconos/icono-512.png', width: 512, height: 512, alt: 'NIDO PJB' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'NIDO PJB',
    description: 'Mapa de biodiversidad del Instituto Salesiano Pedro Justo Berrío.',
  },

  /*
   * Los despliegues de prueba NO se indexan.
   *
   * Sin esto, cada rama desplegada acabaría en Google como una copia más del
   * mapa del colegio, compitiendo con el dominio real y confundiendo a quien
   * busque el proyecto.
   */
  robots: esDominioDefinitivo()
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin maximumScale ni userScalable:false — bloquear el zoom incumpliría
  // WCAG 2.1 AA, y en un mapa el acercamiento es justamente lo que se necesita.
  themeColor: '#1f7a45',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
