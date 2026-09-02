-- ---------------------------------------------------------------------
-- NIDO PJB — 0007: corrige la guardia del último responsable
--
-- FR-038b.
--
-- ── El fallo ─────────────────────────────────────────────────────────
--
-- `garantizar_responsable_activo()` protege una regla necesaria: nunca
-- puede quedar el proyecto sin un responsable activo, porque sin él
-- ninguna ficha de biodiversidad podría publicarse.
--
-- Pero la comprobación estaba mal planteada. Exigía que existiera OTRO
-- responsable activo distinto de la fila que se está modificando:
--
--     where rol = 'responsable' and activo and id <> old.id
--
-- sin mirar en qué queda la fila después del cambio. Con un solo
-- responsable en la tabla, eso hace fallar CUALQUIER actualización de
-- su ficha, incluidas las que lo dejan exactamente como estaba.
--
-- Se detectó al volver a ejecutar `pnpm cargar-equipo`: la fila de la
-- única responsable fue rechazada con «Debe permanecer al menos un
-- responsable activo», siendo que seguía siendo responsable y activa.
--
-- Habría impedido también editar su grado, su foto o su semblanza desde
-- la pantalla del equipo mientras fuera la única responsable, que es
-- justo la situación de partida de cualquier colegio que empiece.
--
-- ── La corrección ────────────────────────────────────────────────────
--
-- Si tras el cambio la fila sigue siendo un responsable activo, no hay
-- nada que comprobar: el responsable que hacía falta sigue ahí. La
-- comprobación solo tiene sentido cuando el cambio la degrada —le quita
-- el rol o la desactiva—, y es entonces cuando hay que exigir que otro
-- ocupe su lugar.
--
-- La garantía queda igual de firme: sigue siendo imposible quedarse sin
-- responsable. Lo que deja de ocurrir es el falso positivo.
-- ---------------------------------------------------------------------

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

comment on function garantizar_responsable_activo() is
  'Impide que el último responsable activo deje de serlo (FR-038b). '
  'Solo actúa cuando el cambio realmente lo degrada: mantener a un '
  'responsable como responsable no requiere que exista otro.';
