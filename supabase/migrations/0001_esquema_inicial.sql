-- =====================================================================
-- NIDO PJB — Migración 0001: esquema inicial
-- Tipos enumerados, tablas, restricciones e índices. Sin disparadores ni RLS.
-- Generada desde specs/001-plataforma-ambiental-pjb/contracts/db-schema.sql
-- =====================================================================

-- =====================================================================
-- NIDO PJB — Esquema de base de datos (contrato de Fase 1)
-- Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío
--
-- Feature : 001-plataforma-ambiental-pjb
-- Motor   : PostgreSQL 15 (Supabase)
-- Fecha   : 2026-08-28
--
-- Las decisiones de diseño están explicadas en ../data-model.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type rol_integrante   as enum ('integrante', 'responsable');
create type estado_ficha     as enum ('borrador', 'en_revision', 'publicado', 'despublicado');
create type origen_jornada   as enum ('app', 'importacion', 'migracion');
create type tipo_medio       as enum ('panorama_360', 'foto_detalle', 'video');
create type origen_medio     as enum ('dron', 'movil');

-- ---------------------------------------------------------------------
-- Configuración (fila única)
-- FR-011: dominio institucional configurable sin tocar código
-- FR-035e: norma de referencia visible al público
-- ---------------------------------------------------------------------
create table configuracion (
  id                          boolean primary key default true,
  dominio_institucional       text    not null,
  norma_ica                   text    not null default 'Resolución 2254 de 2017 (Colombia)',
  imagen_base_version_vigente int,
  constraint fila_unica check (id)
);

-- ---------------------------------------------------------------------
-- Integrantes — es también la lista de acceso (FR-013a: sin autorregistro)
-- ---------------------------------------------------------------------
create table integrante (
  id                     uuid primary key references auth.users(id) on delete restrict,
  correo                 text        not null unique,
  nombre                 text        not null,
  rol                    rol_integrante not null default 'integrante',
  -- Por omisión se asume menor de edad: es el caso seguro (FR-051d)
  es_menor_edad          boolean     not null default true,
  autorizacion_acudiente boolean     not null default false,
  activo                 boolean     not null default true,
  creado_en              timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vinculación con el histórico (FR-030, FR-030a)
-- ---------------------------------------------------------------------
create table alias_historico (
  alias         text primary key,
  integrante_id uuid        not null references integrante(id),
  registrado_por uuid       not null references integrante(id),
  registrado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Imagen base del mapa (R-002)
-- ---------------------------------------------------------------------
create table imagen_base_mapa (
  version       serial primary key,
  ruta_teselas  text    not null,
  ancho_px      int     not null check (ancho_px > 0),
  alto_px       int     not null check (alto_px  > 0),
  zoom_maximo   int     not null check (zoom_maximo between 0 and 24),
  vigente       boolean not null default false,
  capturada_en  date
);

-- ---------------------------------------------------------------------
-- Puntos del mapa
-- FR-006a: posición referida a la imagen, no coordenadas geográficas
-- FR-006c: en fracciones, para sobrevivir al cambio de ortofoto
-- FR-042 : imposible marcar fuera de la imagen
-- ---------------------------------------------------------------------
create table punto_mapa (
  id                   uuid primary key default gen_random_uuid(),
  x_relativa           numeric not null check (x_relativa between 0 and 1),
  y_relativa           numeric not null check (y_relativa between 0 and 1),
  imagen_base_version  int     not null references imagen_base_mapa(version)
);

-- ---------------------------------------------------------------------
-- Catálogos (FR-021, FR-022: nunca texto libre)
-- ---------------------------------------------------------------------
create table lugar_medicion (
  id             uuid primary key default gen_random_uuid(),
  nombre         text    not null unique,
  -- Los 5 lugares actuales son talleres cerrados: el dron no los capta (A-010b)
  es_interior    boolean not null default false,
  punto_mapa_id  uuid references punto_mapa(id),
  activo         boolean not null default true
);

create table medidor (
  id           uuid primary key default gen_random_uuid(),
  -- UNIQUE materializa SC-008: cero medidores con identidad duplicada.
  -- La migración debe resolver 32 vs 9032 antes de insertar.
  numero_serie text    not null unique,
  etiqueta     text,
  disponible   boolean not null default true
);

create table categoria_biodiversidad (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  icono  text
);

-- ---------------------------------------------------------------------
-- Jornadas y mediciones
-- ---------------------------------------------------------------------
create table jornada (
  -- id generado en el cliente antes de guardar en local (R-006)
  id            uuid primary key,
  fecha         date        not null,
  lugar_id      uuid        not null references lugar_medicion(id),
  medidor_id    uuid        not null references medidor(id),
  integrante_id uuid        not null references integrante(id),
  cerrada       boolean     not null default false,
  origen        origen_jornada not null default 'app',
  creada_en     timestamptz not null default now()
);

create table medicion (
  -- id generado en el cliente: hace idempotente la sincronización (FR-027)
  id               uuid primary key,
  jornada_id       uuid     not null references jornada(id) on delete cascade,
  numero           smallint not null,
  hora             time     not null,

  -- FR-018: todo numérico. Nunca texto.
  -- FR-025: NULL = no medido. 0 = medido en cero. Son cosas distintas.
  pm1              numeric,
  pm25             numeric,   -- entra al cálculo del ICA
  pm10             numeric,   -- entra al cálculo del ICA
  hcho             numeric,
  tvoc             numeric,
  humedad_relativa numeric,
  temperatura      numeric,
  particulas_litro numeric,
  co2              numeric,

  -- FR-035d: lo que reporta el equipo (escala EPA), distinto del ICA calculado
  aqi_medidor      numeric,

  -- FR-031: dato que no pudo normalizarse con certeza
  dato_dudoso      boolean  not null default false,
  nota_dudoso      text,

  creada_en        timestamptz not null default now(),
  modificada_en    timestamptz,
  modificada_por   uuid references integrante(id),

  constraint numero_unico_en_jornada unique (jornada_id, numero)
);

-- Nota deliberada: los rangos plausibles por variable NO se implementan como
-- CHECK. FR-024 exige advertir sin impedir; una restricción rígida haría
-- imposible registrar una lectura extrema que sea real.

-- ---------------------------------------------------------------------
-- Inventario de biodiversidad
-- ---------------------------------------------------------------------
create table ficha_biodiversidad (
  id                   uuid primary key default gen_random_uuid(),
  nombre_comun         text not null,
  nombre_cientifico    text not null,
  categoria_id         uuid not null references categoria_biodiversidad(id),
  descripcion          text not null,
  punto_mapa_id        uuid not null references punto_mapa(id),

  estado               estado_ficha not null default 'borrador',
  -- Campo que hace funcionar la revisión solo-la-primera-vez (FR-038c).
  -- Una vez true, nunca vuelve a false.
  aprobada_alguna_vez  boolean not null default false,
  motivo_rechazo       text,

  -- FR-051b: desactivado por omisión. Proteger por defecto, no exponer por descuido.
  mostrar_autor        boolean not null default false,

  autor_id             uuid not null references integrante(id),
  aprobada_por         uuid references integrante(id),
  aprobada_en          timestamptz,
  creada_en            timestamptz not null default now(),
  modificada_en        timestamptz,
  modificada_por       uuid references integrante(id)
);

create table foto_ficha (
  id           uuid primary key default gen_random_uuid(),
  ficha_id     uuid     not null references ficha_biodiversidad(id) on delete cascade,
  ruta_storage text     not null,
  orden        smallint not null default 0,
  subida_por   uuid     not null references integrante(id),
  subida_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vistas inmersivas (FR-010a a FR-010i)
-- Opcional por punto: un punto sin filas aquí funciona con normalidad (FR-010c)
-- ---------------------------------------------------------------------
create table vista_inmersiva (
  id             uuid primary key default gen_random_uuid(),
  punto_mapa_id  uuid       not null references punto_mapa(id) on delete cascade,
  tipo_medio     tipo_medio not null,
  -- FR-010d: los interiores se capturan con móvil, no con dron
  origen         origen_medio not null default 'dron',
  ruta           text       not null,
  ruta_respaldo  text,        -- FR-010h: imagen fija si el medio no reproduce
  orden          smallint   not null default 0
);

-- ---------------------------------------------------------------------
-- Puntos destacados de contaminación (FR-010j a FR-010m)
-- Marcado EXCLUSIVAMENTE manual: el sistema nunca escribe aquí (FR-010k)
-- ---------------------------------------------------------------------
create table punto_destacado (
  lugar_id    uuid primary key references lugar_medicion(id) on delete cascade,
  marcado_por uuid        not null references integrante(id),
  marcado_en  timestamptz not null default now(),
  nota        text
);

-- ---------------------------------------------------------------------
-- Contenido didáctico (FR-010)
-- ---------------------------------------------------------------------
create table punto_interes_didactico (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  variable_asociada text,
  explicacion       text not null,
  ruta_foto         text,
  punto_mapa_id     uuid references punto_mapa(id),
  orden             smallint not null default 0
);

-- Solo una imagen vigente a la vez
create unique index idx_una_imagen_vigente on imagen_base_mapa (vigente) where vigente;

-- Clave natural de deduplicación (FR-031c, SC-011, SC-015).
-- Dos lecturas del mismo medidor, mismo sitio y mismo minuto son la misma lectura.
-- Hace idempotentes tanto la sincronización sin conexión como la reimportación.
create unique index idx_medicion_clave_natural
  on medicion (jornada_id, hora);
