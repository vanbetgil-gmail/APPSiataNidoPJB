-- =====================================================================
-- NIDO PJB — Migración 0002: disparadores
-- Reglas de integridad que NO pueden vivir solo en la interfaz.
-- Generada desde specs/001-plataforma-ambiental-pjb/contracts/db-schema.sql
-- =====================================================================


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

-- Debe existir siempre al menos un responsable activo.
-- Sin él, ninguna ficha nueva podría publicarse (FR-038b).
create or replace function garantizar_responsable_activo()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from integrante
    where rol = 'responsable' and activo and id <> old.id
  ) then
    raise exception 'Debe permanecer al menos un responsable activo';
  end if;
  return new;
end $$;

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

create trigger trg_dominio_integrante
  before insert or update of correo on integrante
  for each row execute function verificar_dominio_institucional();

create trigger trg_responsable_activo
  before update of rol, activo on integrante
  for each row when (old.rol = 'responsable' and old.activo)
  execute function garantizar_responsable_activo();

create trigger trg_autorizacion_autor
  before insert or update of mostrar_autor on ficha_biodiversidad
  for each row execute function verificar_autorizacion_autor();

create trigger trg_primera_aprobacion
  before update of estado on ficha_biodiversidad
  for each row execute function marcar_primera_aprobacion();
