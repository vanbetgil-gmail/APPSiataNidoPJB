-- ---------------------------------------------------------------------
-- SIATA PJB — 0015: cómo aparece cada integrante en la página del equipo
--
-- FR-051g.
--
-- ── Qué faltaba ──────────────────────────────────────────────────────
--
-- La página pública del equipo mostraba a TODA persona activa con
-- autorización, en un solo orden —el alfabético— y con una etiqueta fija:
-- «Docente acompañante» para cualquier responsable.
--
-- Eso no alcanza para presentar un equipo real. Hay docentes que
-- acompañan el proyecto sin querer figurar en la página pública, y hay
-- quien cumple un papel concreto —liderarlo, sostener la parte
-- técnica— que «Docente acompañante» no dice.
--
-- ── Las dos columnas ─────────────────────────────────────────────────
--
-- `visible_en_equipo` separa dos cosas que hasta ahora eran una sola:
-- pertenecer al equipo y aparecer en la página pública. Quien se oculta
-- conserva su cuenta, su acceso y sus fichas; simplemente no sale en el
-- anuario. Es distinto de `activo`, que sí corta el acceso.
--
-- `orden_equipo` permite poner a alguien primero. Sin él, el único orden
-- posible es el alfabético, que coloca al azar a quien lidera.
--
-- ── Por qué aquí no se nombra a nadie ────────────────────────────────
--
-- Este repositorio es público y las migraciones quedan en su historia
-- para siempre. Una migración que dijera «ocultar a Fulano» dejaría esa
-- frase escrita sobre una persona real, a la vista de cualquiera y sin
-- forma de retirarla.
--
-- Por eso la migración solo crea la capacidad. Quién se muestra y con
-- qué cargo se decide desde Equipo → Ficha pública, y vive en la base de
-- datos, que sí se puede cambiar.
-- ---------------------------------------------------------------------

alter table integrante
  add column if not exists visible_en_equipo boolean not null default true,
  add column if not exists orden_equipo      smallint;

comment on column integrante.visible_en_equipo is
  'Si aparece en la página pública del equipo. Distinto de `activo`: quien se oculta conserva acceso y fichas.';
comment on column integrante.orden_equipo is
  'Menor va primero. NULL queda al final, ordenado por nombre. Sirve para destacar a quien lidera.';


-- ---------------------------------------------------------------------
-- La vista pública, con el filtro nuevo
--
-- Se conserva íntegra la condición de siempre: solo aparece quien es
-- mayor de edad o tiene autorización de acudiente registrada (FR-051d).
-- `visible_en_equipo` se SUMA a esa regla, nunca la sustituye: ocultar a
-- alguien es una decisión editorial, mostrarlo sigue exigiendo permiso.
-- ---------------------------------------------------------------------
drop view if exists integrante_publico;

create view integrante_publico as
select
  i.id,
  i.nombre,
  i.rol,
  i.grado,
  i.foto_ruta,
  i.semblanza,
  i.orden_equipo,
  i.creado_en
from integrante i
where i.activo
  and i.visible_en_equipo
  and (not i.es_menor_edad or i.autorizacion_acudiente);

comment on view integrante_publico is
  'Datos publicables del equipo. Nunca incluye correo. Solo mayores de edad o menores con autorización (FR-051d, FR-051g), y solo quien no se haya ocultado.';

grant select on integrante_publico to anon, authenticated;


-- ---------------------------------------------------------------------
-- Cuántos estudiantes hay y cuántos pueden verse
--
-- ── Para qué ─────────────────────────────────────────────────────────
--
-- Hoy la página del equipo muestra cuatro docentes y ningún estudiante,
-- y no explica por qué. Quien la abre concluye que el proyecto lo hacen
-- los adultos, que es exactamente lo contrario de la verdad.
--
-- Con esto la página puede decir «y nueve estudiantes más, cuyos
-- nombres aparecerán cuando sus acudientes lo autoricen». Se reconoce
-- que existen sin publicar nada de ellos.
--
-- ── Por qué es seguro ────────────────────────────────────────────────
--
-- Devuelve dos números y ninguna fila. Un recuento no identifica a
-- nadie: no es dato personal y no hay nada que autorizar.
-- ---------------------------------------------------------------------
create or replace view equipo_resumen as
select
  count(*) filter (where rol <> 'responsable')::int as estudiantes_totales,
  count(*) filter (
    where rol <> 'responsable' and (not es_menor_edad or autorizacion_acudiente)
  )::int as estudiantes_visibles
from integrante
where activo and visible_en_equipo;

comment on view equipo_resumen is
  'Solo recuentos, nunca nombres. Permite reconocer al equipo completo sin publicar datos de menores sin autorización.';

grant select on equipo_resumen to anon, authenticated;
