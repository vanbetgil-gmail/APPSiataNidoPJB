-- ---------------------------------------------------------------------
-- NIDO PJB — 0009: fichas de taxonomía arbórea
--
-- FR-038f, FR-041a. Prepara la carga del registro de taxonomía del
-- proyecto arbóreo (16 especies, 31 árboles) antes de que existan la
-- ortofoto y las fotografías.
--
-- Cuatro cambios, cada uno con su razón.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 1. La ubicación deja de ser obligatoria
--
-- `punto_mapa_id` era `not null`, lo que ata cada ficha a un punto sobre
-- la ortofoto. Pero la ortofoto todavía no existe: el material de dron
-- no tiene tomas cenitales y está pendiente un nuevo vuelo.
--
-- Exigirla ahora obligaría a inventar coordenadas, y una coordenada
-- inventada no se distingue después de una medida. Peor: la imagen base
-- ES el sistema de coordenadas del proyecto, así que unos puntos puestos
-- «provisionalmente» sobre una imagen que va a cambiar quedarían todos
-- desplazados sin que nada avise.
--
-- Mejor un campo vacío, que se ve, que un dato falso, que no.
-- ---------------------------------------------------------------------

alter table ficha_biodiversidad
  alter column punto_mapa_id drop not null;

comment on column ficha_biodiversidad.punto_mapa_id is
  'Ubicación sobre la ortofoto. Nula mientras no exista imagen base '
  'vigente (FR-041a). En cuanto la haya, pasa a exigirse para publicar.';


-- ---------------------------------------------------------------------
-- 2. Edición colaborativa con tope
--
-- El equipo entero debe poder completar y corregir estas fichas, no solo
-- quien las cargó: son un registro común, y quien las creó fue un script.
--
-- Pero sin tope, dieciséis fichas y once personas es una invitación a que
-- se reescriban unas a otras indefinidamente y nadie sepa cuál es la
-- versión buena. El tope de dos ediciones obliga a que la tercera pase
-- por revisión, que es donde se decide.
--
-- El responsable no gasta ediciones: es quien verifica, y su trabajo es
-- justamente corregir lo que haga falta antes de publicar.
-- ---------------------------------------------------------------------

alter table ficha_biodiversidad
  add column if not exists ediciones_usadas smallint not null default 0;

comment on column ficha_biodiversidad.ediciones_usadas is
  'Ediciones de contenido gastadas sobre esta ficha (FR-038f). Tope de 2 '
  'para integrantes; los responsables no gastan ninguna.';

create or replace function contar_edicion_de_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cambio_de_contenido boolean;
begin
  -- Cambiar de estado no es editar. Enviar a revisión, aprobar o retirar
  -- del mapa no debe consumir el cupo de nadie: lo que se limita es
  -- reescribir el contenido, no mover la ficha por su ciclo de vida.
  cambio_de_contenido :=
       new.nombre_comun      is distinct from old.nombre_comun
    or new.nombre_cientifico is distinct from old.nombre_cientifico
    or new.descripcion       is distinct from old.descripcion
    or new.categoria_id      is distinct from old.categoria_id
    or new.punto_mapa_id     is distinct from old.punto_mapa_id;

  if not cambio_de_contenido then
    return new;
  end if;

  if es_responsable() then
    return new;
  end if;

  if old.ediciones_usadas >= 2 then
    raise exception
      'Esta ficha ya se editó dos veces. Envíela a revisión para que la docente responsable la verifique.';
  end if;

  new.ediciones_usadas := old.ediciones_usadas + 1;
  return new;
end $$;

create trigger trg_contar_edicion
  before update on ficha_biodiversidad
  for each row execute function contar_edicion_de_ficha();


-- ---------------------------------------------------------------------
-- 3. Todos los integrantes pueden editar
--
-- La política anterior era `autor_id = auth.uid() or es_responsable()`.
-- Se amplía a cualquier integrante activo.
--
-- La autoría no se pierde por esto: `autor_id` sigue diciendo de quién es
-- la ficha, `modificada_por` queda con quien la tocó por última vez, y el
-- contador de arriba impide que la edición abierta se vuelva un problema.
-- ---------------------------------------------------------------------

drop policy if exists integrante_edita_su_ficha on ficha_biodiversidad;

create policy integrante_edita_ficha_del_equipo on ficha_biodiversidad
  for update
  using (es_integrante_activo())
  with check (
    -- FR-038b/c: la primera publicación sigue siendo del responsable.
    -- Que cualquiera pueda EDITAR no significa que cualquiera pueda PUBLICAR.
    es_responsable()
    or estado <> 'publicado'
    or aprobada_alguna_vez
  );


-- ---------------------------------------------------------------------
-- 4. Todos los integrantes VEN todas las fichas del equipo
--
-- La política de lectura era:
--
--     estado = 'publicado' or autor_id = auth.uid() or es_responsable()
--
-- Con ella, las 16 fichas de taxonomía —creadas en borrador y atribuidas
-- a la docente responsable— serían invisibles para los estudiantes. Se
-- les habría dado permiso de edición sobre algo que no pueden ni abrir.
--
-- Permitir editar sin permitir ver no es una restricción: es un error.
-- ---------------------------------------------------------------------

drop policy if exists integrante_ve_sus_fichas on ficha_biodiversidad;

create policy integrante_ve_fichas_del_equipo on ficha_biodiversidad
  for select using (estado = 'publicado' or es_integrante_activo());

-- Las fotografías siguen la misma regla: de nada sirve ver la ficha sin
-- poder ver lo que se fotografió.
--
-- Se añade junto a `publico_lee_fotos`, que se conserva intacta. Varias
-- políticas permisivas sobre la misma tabla se combinan con OR, así que el
-- visitante anónimo sigue viendo exactamente lo que veía —las fotos de
-- fichas publicadas— y el integrante ve además las del equipo.
create policy integrante_ve_fotos_del_equipo on foto_ficha
  for select using (es_integrante_activo());
