-- =====================================================================
-- NIDO PJB — Migración 0003: RLS y vistas públicas
-- Los permisos viven aquí, no repartidos por el código de la aplicación.
-- Generada desde specs/001-plataforma-ambiental-pjb/contracts/db-schema.sql
-- =====================================================================


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
