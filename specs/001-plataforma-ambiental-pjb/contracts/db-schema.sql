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

-- FR-011 / FR-012: el correo debe pertenecer al dominio configurado
create or replace function verificar_dominio_institucional()
returns trigger language plpgsql as $$
declare dominio text;
begin
  select dominio_institucional into dominio from configuracion where id;
  if lower(split_part(new.correo, '@', 2)) is distinct from lower(dominio) then
    raise exception 'El correo % no pertenece al dominio institucional %', new.correo, dominio;
  end if;
  return new;
end $$;

create trigger trg_dominio_integrante
  before insert or update of correo on integrante
  for each row execute function verificar_dominio_institucional();

-- Debe existir siempre al menos un responsable activo.
-- Sin él, ninguna ficha nueva podría publicarse (FR-038b).
--
-- La primera comprobación no es un adorno: sin ella, cualquier
-- actualización de la ficha del ÚNICO responsable falla, incluidas las
-- que lo dejan igual que estaba, porque no existe «otro» que lo releve.
create or replace function garantizar_responsable_activo()
returns trigger language plpgsql as $$
begin
  -- El cambio no toca la condición que protegemos.
  if new.rol = 'responsable' and new.activo then
    return new;
  end if;

  -- Aquí la fila deja de ser responsable activo: hace falta un relevo.
  if not exists (
    select 1 from integrante
    where rol = 'responsable' and activo and id <> old.id
  ) then
    raise exception 'Debe permanecer al menos un responsable activo';
  end if;

  return new;
end $$;

create trigger trg_responsable_activo
  before update of rol, activo on integrante
  for each row when (old.rol = 'responsable' and old.activo)
  execute function garantizar_responsable_activo();

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

-- Solo una imagen vigente a la vez
create unique index idx_una_imagen_vigente on imagen_base_mapa (vigente) where vigente;

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

  -- Nulo solo en registros importados sin autor identificable (FR-030b).
  -- Ver la restricción de más abajo: la aplicación no puede dejarlo vacío.
  integrante_id uuid        references integrante(id),

  cerrada       boolean     not null default false,
  origen        origen_jornada not null default 'app',
  creada_en     timestamptz not null default now(),

  -- Abrir el campo a nulos sin acotarlo permitiría crear mediciones
  -- anónimas desde la aplicación, rompiendo la trazabilidad de FR-030a.
  constraint jornada_sin_autor_solo_importada
    check (integrante_id is not null or origen <> 'app')
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

-- Clave natural de deduplicación (FR-031c, SC-011, SC-015).
-- Dos lecturas del mismo medidor, mismo sitio y mismo minuto son la misma lectura.
-- Hace idempotentes tanto la sincronización sin conexión como la reimportación.
create unique index idx_medicion_clave_natural
  on medicion (jornada_id, hora);

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

-- FR-051d: no puede mostrarse el nombre de un menor sin autorización registrada.
-- Se implementa en la base de datos, no solo en la interfaz, para que sea
-- imposible saltárselo desde cualquier cliente.
create or replace function verificar_autorizacion_autor()
returns trigger language plpgsql as $$
declare menor boolean; autorizado boolean;
begin
  if new.mostrar_autor then
    select es_menor_edad, autorizacion_acudiente
      into menor, autorizado
      from integrante where id = new.autor_id;
    if menor and not autorizado then
      raise exception
        'No puede mostrarse públicamente el nombre de un integrante menor de edad sin autorización de acudiente registrada';
    end if;
  end if;
  return new;
end $$;

create trigger trg_autorizacion_autor
  before insert or update of mostrar_autor on ficha_biodiversidad
  for each row execute function verificar_autorizacion_autor();

-- FR-038b / FR-038c: la primera publicación exige responsable; las siguientes no.
create or replace function marcar_primera_aprobacion()
returns trigger language plpgsql as $$
begin
  if new.estado = 'publicado' and not old.aprobada_alguna_vez then
    new.aprobada_alguna_vez := true;
    new.aprobada_en := now();
  end if;
  return new;
end $$;

create trigger trg_primera_aprobacion
  before update of estado on ficha_biodiversidad
  for each row execute function marcar_primera_aprobacion();

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

-- =====================================================================
-- Funciones auxiliares de autorización
-- =====================================================================
create or replace function es_integrante_activo()
returns boolean language sql stable as $$
  select exists (
    select 1 from integrante where id = auth.uid() and activo
  );
$$;

create or replace function es_responsable()
returns boolean language sql stable as $$
  select exists (
    select 1 from integrante
    where id = auth.uid() and activo and rol = 'responsable'
  );
$$;

-- =====================================================================
-- Vistas públicas
-- Proyecciones que garantizan que el correo NUNCA sale al público (FR-051)
-- =====================================================================

-- Autor visible solo si la ficha lo activó y hay autorización.
-- El correo no aparece en ningún caso.
create view ficha_publica as
select
  f.id,
  f.nombre_comun,
  f.nombre_cientifico,
  f.descripcion,
  c.nombre as categoria,
  p.x_relativa,
  p.y_relativa,
  case when f.mostrar_autor then i.nombre else null end as autor_visible,
  f.creada_en
from ficha_biodiversidad f
join categoria_biodiversidad c on c.id = f.categoria_id
join punto_mapa p             on p.id = f.punto_mapa_id
join integrante i             on i.id = f.autor_id
where f.estado = 'publicado';

-- A-010d / FR-015: el público ve QUÉ lugares están marcados, nunca los valores.
create view punto_destacado_publico as
select
  l.id   as lugar_id,
  l.nombre,
  p.x_relativa,
  p.y_relativa
from punto_destacado d
join lugar_medicion l on l.id = d.lugar_id
join punto_mapa p     on p.id = l.punto_mapa_id;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table integrante              enable row level security;
alter table alias_historico         enable row level security;
alter table lugar_medicion          enable row level security;
alter table medidor                 enable row level security;
alter table categoria_biodiversidad enable row level security;
alter table jornada                 enable row level security;
alter table medicion                enable row level security;
alter table ficha_biodiversidad     enable row level security;
alter table foto_ficha              enable row level security;
alter table punto_mapa              enable row level security;
alter table vista_inmersiva         enable row level security;
alter table punto_destacado         enable row level security;
alter table punto_interes_didactico enable row level security;
alter table imagen_base_mapa        enable row level security;
alter table configuracion           enable row level security;

-- --- Público anónimo: solo lectura, y solo de lo publicado ------------
-- FR-005 / SC-001: el mapa nunca exige cuenta
create policy publico_lee_fichas on ficha_biodiversidad
  for select using (estado = 'publicado');

create policy publico_lee_fotos on foto_ficha
  for select using (
    exists (select 1 from ficha_biodiversidad f
            where f.id = ficha_id and f.estado = 'publicado')
  );

create policy publico_lee_categorias  on categoria_biodiversidad for select using (true);
create policy publico_lee_puntos      on punto_mapa              for select using (true);
create policy publico_lee_inmersivas  on vista_inmersiva         for select using (true);
create policy publico_lee_destacados  on punto_destacado         for select using (true);
create policy publico_lee_didacticos  on punto_interes_didactico for select using (true);
create policy publico_lee_imagen      on imagen_base_mapa        for select using (true);
create policy publico_lee_lugares     on lugar_medicion          for select using (true);

-- FR-015 / A-010d: mediciones y jornadas NUNCA son públicas.
-- Nótese la ausencia deliberada de política de lectura anónima
-- sobre `medicion` y `jornada`: sin política, no hay acceso.
create policy integrantes_leen_mediciones on medicion
  for select using (es_integrante_activo());

create policy integrantes_leen_jornadas on jornada
  for select using (es_integrante_activo());

-- --- Integrantes: registran sus propios datos ------------------------
create policy integrante_crea_jornada on jornada
  for insert with check (es_integrante_activo() and integrante_id = auth.uid());

create policy integrante_edita_su_jornada on jornada
  for update using (integrante_id = auth.uid() or es_responsable());

create policy integrante_crea_medicion on medicion
  for insert with check (
    es_integrante_activo()
    and exists (select 1 from jornada j
                where j.id = jornada_id and j.integrante_id = auth.uid())
  );

-- FR-026: corregir mediciones conservando registro de la modificación
create policy integrante_edita_medicion on medicion
  for update using (
    exists (select 1 from jornada j
            where j.id = jornada_id and j.integrante_id = auth.uid())
    or es_responsable()
  );

-- --- Fichas de biodiversidad -----------------------------------------
create policy integrante_ve_sus_fichas on ficha_biodiversidad
  for select using (
    estado = 'publicado' or autor_id = auth.uid() or es_responsable()
  );

create policy integrante_crea_ficha on ficha_biodiversidad
  for insert with check (es_integrante_activo() and autor_id = auth.uid());

-- FR-038b: solo el responsable aprueba la primera publicación.
-- El autor puede editar la suya, pero no llevarla a 'publicado'
-- si nunca fue aprobada (FR-038c).
create policy integrante_edita_su_ficha on ficha_biodiversidad
  for update using (autor_id = auth.uid() or es_responsable())
  with check (
    es_responsable()
    or estado <> 'publicado'
    or aprobada_alguna_vez
  );

-- --- Administración: solo responsables --------------------------------
create policy responsable_gestiona_integrantes on integrante
  for all using (es_responsable());

create policy integrante_se_ve_a_si_mismo on integrante
  for select using (id = auth.uid() or es_responsable());

create policy responsable_gestiona_lugares    on lugar_medicion  for all using (es_responsable());
create policy responsable_gestiona_medidores  on medidor         for all using (es_responsable());
create policy responsable_gestiona_destacados on punto_destacado for all using (es_responsable());
create policy responsable_gestiona_alias      on alias_historico for all using (es_responsable());
create policy responsable_gestiona_config     on configuracion   for all using (es_responsable());

create policy publico_lee_config on configuracion for select using (true);
create policy integrantes_leen_medidores on medidor for select using (es_integrante_activo());
