-- ---------------------------------------------------------------------
-- SIATA PJB — 0013: fichas sin autor registrado
--
-- FR-051c. Y corrige un defecto de 0003 que habría aparecido a la
-- primera publicación.
--
-- ═══════════════════════════════════════════════════════════════════
-- 1. EL DEFECTO QUE HABÍA QUE CORREGIR DE TODAS FORMAS
-- ═══════════════════════════════════════════════════════════════════
--
-- `ficha_publica` unía con `punto_mapa` mediante un JOIN interno:
--
--     join punto_mapa p on p.id = f.punto_mapa_id
--
-- Desde la migración 0009 `punto_mapa_id` admite nulos, porque la
-- ortofoto todavía no existe. Un JOIN interno DESCARTA las filas cuyo
-- lado derecho falta, así que cualquier ficha publicada sin punto en el
-- mapa desaparecía del catálogo público entero.
--
-- Las 16 fichas del registro arbóreo no tienen punto. Publicar la
-- primera habría dado exactamente esto: la ficha aprobada, el estado en
-- «publicado», y nada visible en Biodiversidad. Sin error, sin aviso, y
-- sin ninguna pista de por dónde buscar.
--
-- ═══════════════════════════════════════════════════════════════════
-- 2. FICHAS SIN AUTOR
-- ═══════════════════════════════════════════════════════════════════
--
-- El equipo pidió poder no registrar quién hizo una ficha. Tiene sentido
-- para las que salieron de un trabajo colectivo, donde señalar a una
-- persona sería tan arbitrario como señalar a otra.
--
-- No se confunde con `mostrar_autor`, que ya existía: ese decide si el
-- nombre se enseña en público. Aquí se trata de no tener nombre que
-- enseñar, ni siquiera dentro del equipo.
--
-- Para menores de edad esto no es un capricho: la forma más segura de
-- proteger un nombre es no haberlo guardado.
-- ---------------------------------------------------------------------

alter table ficha_biodiversidad
  alter column autor_id drop not null;

comment on column ficha_biodiversidad.autor_id is
  'Quién registró la ficha. Nulo cuando el equipo eligió no atribuirla '
  '(FR-051c). Distinto de mostrar_autor, que decide si ese nombre se '
  'enseña en público.';


-- ---------------------------------------------------------------------
-- La vista pública, con las dos uniones corregidas.
--
-- `left join` en punto_mapa y en integrante: una ficha publicada sale al
-- catálogo aunque no tenga punto marcado y aunque no tenga autor. Lo que
-- falte llega como nulo, que es la respuesta correcta a «¿dónde está?» y
-- a «¿quién la hizo?» cuando de verdad no se sabe.
--
-- `categoria_biodiversidad` sigue con unión interna a propósito: la
-- categoría SÍ es obligatoria, y una ficha sin ella estaría rota.
-- ---------------------------------------------------------------------
drop view if exists ficha_publica;

create view ficha_publica as
select
  f.id,
  f.nombre_comun,
  f.nombre_cientifico,
  f.descripcion,
  c.nombre as categoria,
  z.nombre as zona,
  p.x_relativa,
  p.y_relativa,
  case when f.mostrar_autor then i.nombre else null end as autor_visible,
  f.creada_en
from ficha_biodiversidad f
join      categoria_biodiversidad c on c.id = f.categoria_id
left join punto_mapa               p on p.id = f.punto_mapa_id
left join integrante               i on i.id = f.autor_id
left join zona_campus              z on z.id = f.zona_id
where f.estado = 'publicado';


-- ---------------------------------------------------------------------
-- La política de creación admitía solo `autor_id = auth.uid()`.
--
-- Con autor nulo, esa comparación da NULL —que SQL trata como falso— y
-- la ficha anónima habría sido rechazada al guardar. El desplegable
-- habría ofrecido una opción que no funcionaba.
-- ---------------------------------------------------------------------
drop policy if exists integrante_crea_ficha on ficha_biodiversidad;

create policy integrante_crea_ficha on ficha_biodiversidad
  for insert with check (
    es_integrante_activo()
    and (autor_id is null or autor_id = auth.uid() or es_responsable())
  );


-- ---------------------------------------------------------------------
-- El disparador que protege los nombres de menores.
--
-- Con autor nulo, la consulta interna no devuelve fila y las variables
-- quedan en NULL, de modo que la condición `menor and not autorizado`
-- resulta NULL y deja pasar. Funciona por accidente, no por diseño.
--
-- Se hace explícito: sin autor no hay nombre que exponer, así que
-- `mostrar_autor` no tiene sentido y se apaga en vez de quedar en un
-- estado que dice «muestra a nadie».
-- ---------------------------------------------------------------------
create or replace function verificar_autorizacion_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare menor boolean; autorizado boolean;
begin
  if new.autor_id is null then
    new.mostrar_autor := false;
    return new;
  end if;

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

-- El disparador solo se activaba al tocar `mostrar_autor`; ahora también
-- debe hacerlo al cambiar el autor, que es cuando puede quedarse en nulo.
drop trigger if exists trg_autorizacion_autor on ficha_biodiversidad;

create trigger trg_autorizacion_autor
  before insert or update of mostrar_autor, autor_id on ficha_biodiversidad
  for each row execute function verificar_autorizacion_autor();
