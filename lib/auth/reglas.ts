/**
 * Reglas de acceso compartidas entre el servidor y el navegador.
 *
 * Viven aquí y no en `acciones.ts` porque un archivo marcado con
 * `'use server'` solo puede exportar funciones asíncronas: cualquier
 * constante que exporte rompe la compilación.
 *
 * Que el formulario y la acción de servidor lean el mismo valor no es
 * cosmético. Si el navegador exigiera 8 caracteres y el servidor 6, la
 * validación visible mentiría sobre la regla real.
 */

/**
 * Ocho caracteres, no seis.
 *
 * Supabase admite seis por omisión, pero la contraseña inicial la dicta el
 * docente en voz alta en un salón, así que la que importa es la que cada
 * quien elige después. Ocho es el mínimo por debajo del cual esa segunda
 * contraseña deja de aportar nada.
 */
export const LARGO_MINIMO_CONTRASENA = 8
