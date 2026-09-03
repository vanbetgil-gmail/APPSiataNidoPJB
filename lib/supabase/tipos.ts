/**
 * Tipos del esquema de NIDO PJB.
 *
 * Escritos a mano a partir de supabase/migrations/0001_esquema_inicial.sql.
 *
 * Para regenerarlos desde la base de datos real (requiere Docker y Supabase
 * local en marcha), lo cual es preferible en cuanto esté disponible:
 *
 *   pnpm db:tipos
 *
 * Ese comando sobrescribe este archivo. Está en la lista de ignorados de
 * ESLint precisamente porque su versión definitiva es generada.
 */

/**
 * NOTA sobre `type` en lugar de `interface`
 * ------------------------------------------
 * Todos los tipos de fila se declaran como ALIAS DE TIPO, no como interfaces.
 * No es cuestión de estilo: en TypeScript una `interface` no es asignable a
 * `Record<string, unknown>` porque carece de índice implícito, y `GenericSchema`
 * de postgrest-js lo exige. Con interfaces, TODA consulta se infiere como
 * `never` y el compilador deja de avisar de campos mal escritos.
 */

export type RolIntegrante = 'integrante' | 'responsable'
export type EstadoFicha = 'borrador' | 'en_revision' | 'publicado' | 'despublicado'
export type OrigenJornada = 'app' | 'importacion' | 'migracion'
export type TipoMedio = 'panorama_360' | 'foto_detalle' | 'video'
export type OrigenMedio = 'dron' | 'movil'

export type Integrante = {
  id: string
  correo: string
  nombre: string
  rol: RolIntegrante
  es_menor_edad: boolean
  autorizacion_acudiente: boolean
  activo: boolean
  creado_en: string
  /** Grado escolar o cargo. Texto libre: cada colegio los nombra distinto. */
  grado: string | null
  /** Ruta en la cubeta PRIVADA `fotos-equipo`. No es un enlace utilizable. */
  foto_ruta: string | null
  semblanza: string | null
}

export type LugarMedicion = {
  id: string
  nombre: string
  es_interior: boolean
  punto_mapa_id: string | null
  activo: boolean
}

export type Medidor = {
  id: string
  numero_serie: string
  etiqueta: string | null
  disponible: boolean
}

export type CategoriaBiodiversidad = {
  id: string
  nombre: string
  icono: string | null
}

export type Jornada = {
  id: string
  fecha: string
  lugar_id: string
  medidor_id: string
  /**
   * Nulo solo en jornadas importadas cuyo autor no se pudo identificar
   * (FR-030b). La restricción `jornada_sin_autor_solo_importada` impide
   * que una jornada creada en la aplicación llegue sin autor, así que en
   * todo lo que escriba la aplicación este campo va siempre relleno.
   */
  integrante_id: string | null
  cerrada: boolean
  origen: OrigenJornada
  creada_en: string
}

/**
 * Toda variable ambiental es `number | null`.
 *
 * `null` = no medido. `0` = medido en cero. Son cosas distintas (FR-025) y el
 * tipo lo hace explícito: no existe forma de escribir un `0` "de relleno" sin
 * que se note en el código.
 */
export type Medicion = {
  id: string
  jornada_id: string
  numero: number
  hora: string
  pm1: number | null
  pm25: number | null
  pm10: number | null
  hcho: number | null
  tvoc: number | null
  humedad_relativa: number | null
  temperatura: number | null
  particulas_litro: number | null
  co2: number | null
  /** Lo que reporta el equipo, en escala EPA. Distinto del ICA calculado (FR-035d). */
  aqi_medidor: number | null
  dato_dudoso: boolean
  nota_dudoso: string | null
  creada_en: string
  modificada_en: string | null
  modificada_por: string | null
}

/** Posición sobre la ortofoto, en fracciones 0–1 del ancho y alto (FR-006a). */
export type PuntoMapa = {
  id: string
  x_relativa: number
  y_relativa: number
  imagen_base_version: number
}

export type ImagenBaseMapa = {
  version: number
  ruta_teselas: string
  ancho_px: number
  alto_px: number
  zoom_maximo: number
  vigente: boolean
  capturada_en: string | null
}

export type FichaBiodiversidad = {
  id: string
  nombre_comun: string
  nombre_cientifico: string
  categoria_id: string
  descripcion: string
  /** Nulo mientras no exista ortofoto vigente (FR-041a, migración 0009). */
  punto_mapa_id: string | null
  estado: EstadoFicha
  /** Una vez true, nunca vuelve a false. Es la clave de FR-038c. */
  aprobada_alguna_vez: boolean
  motivo_rechazo: string | null
  /** Desactivado por omisión (FR-051b): proteger por defecto. */
  mostrar_autor: boolean
  autor_id: string
  aprobada_por: string | null
  aprobada_en: string | null
  creada_en: string
  modificada_en: string | null
  modificada_por: string | null
  /** Ediciones de contenido gastadas. Tope de 2 para integrantes (FR-038f). */
  ediciones_usadas: number
}

export type FotoFicha = {
  id: string
  ficha_id: string
  ruta_storage: string
  orden: number
  subida_por: string
  subida_en: string
}

export type VistaInmersiva = {
  id: string
  punto_mapa_id: string
  tipo_medio: TipoMedio
  origen: OrigenMedio
  ruta: string
  ruta_respaldo: string | null
  orden: number
}

export type PuntoDestacado = {
  lugar_id: string
  marcado_por: string
  marcado_en: string
  nota: string | null
}

export type PuntoInteresDidactico = {
  id: string
  nombre: string
  variable_asociada: string | null
  explicacion: string
  ruta_foto: string | null
  punto_mapa_id: string | null
  orden: number
}

export type AliasHistorico = {
  alias: string
  integrante_id: string
  registrado_por: string
  registrado_en: string
}

export type Configuracion = {
  id: boolean
  dominio_institucional: string
  norma_ica: string
  imagen_base_version_vigente: number | null
}

/**
 * Vista pública de fichas.
 *
 * No incluye `correo` — no puede, por construcción (FR-051). `autor_visible`
 * llega como `null` cuando la ficha no activó `mostrar_autor`.
 */
export type FichaPublica = {
  id: string
  nombre_comun: string
  nombre_cientifico: string
  descripcion: string
  categoria: string
  x_relativa: number
  y_relativa: number
  autor_visible: string | null
  creada_en: string
}

/** Vista pública del equipo. Nunca incluye correo (FR-051, FR-051g). */
export type IntegrantePublico = {
  id: string
  nombre: string
  rol: RolIntegrante
  grado: string | null
  foto_ruta: string | null
  semblanza: string | null
  creado_en: string
}

export type PuntoDestacadoPublico = {
  lugar_id: string
  nombre: string
  x_relativa: number
  y_relativa: number
}

type Tabla<Fila, Insert = Partial<Fila>, Update = Partial<Fila>> = {
  Row: Fila
  Insert: Insert
  Update: Update
  // supabase-js lo exige para inferir el tipo de fila de un select.
  // Sin esta clave, cada consulta devuelve `never` y el compilador no puede
  // avisar de un campo mal escrito, que es justo para lo que sirve tiparlo.
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      integrante: Tabla<Integrante>
      alias_historico: Tabla<AliasHistorico>
      lugar_medicion: Tabla<LugarMedicion>
      medidor: Tabla<Medidor>
      categoria_biodiversidad: Tabla<CategoriaBiodiversidad>
      jornada: Tabla<Jornada>
      medicion: Tabla<Medicion>
      ficha_biodiversidad: Tabla<FichaBiodiversidad>
      foto_ficha: Tabla<FotoFicha>
      punto_mapa: Tabla<PuntoMapa>
      imagen_base_mapa: Tabla<ImagenBaseMapa>
      vista_inmersiva: Tabla<VistaInmersiva>
      punto_destacado: Tabla<PuntoDestacado>
      punto_interes_didactico: Tabla<PuntoInteresDidactico>
      configuracion: Tabla<Configuracion>
    }
    Views: {
      ficha_publica: { Row: FichaPublica; Relationships: [] }
      punto_destacado_publico: { Row: PuntoDestacadoPublico; Relationships: [] }
      integrante_publico: { Row: IntegrantePublico; Relationships: [] }
    }
    Functions: {
      es_integrante_activo: { Args: Record<string, never>; Returns: boolean }
      es_responsable: { Args: Record<string, never>; Returns: boolean }
      correo_autorizado: {
        Args: { correo_consultado: string }
        Returns: { existe: boolean; activo: boolean; rol: RolIntegrante }[]
      }
    }
    Enums: {
      rol_integrante: RolIntegrante
      estado_ficha: EstadoFicha
      origen_jornada: OrigenJornada
      tipo_medio: TipoMedio
      origen_medio: OrigenMedio
    }
    // supabase-js exige esta clave para que el esquema satisfaga
    // `GenericSchema`. Sin ella, cualquier consulta con lista de columnas
    // —`select('nombre, activo')`— se infiere como `never`. El proyecto no
    // usa tipos compuestos, pero la clave debe existir.
    CompositeTypes: Record<string, never>
  }
}
