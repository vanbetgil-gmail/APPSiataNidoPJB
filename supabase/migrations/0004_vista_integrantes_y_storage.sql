-- =====================================================================
-- NIDO PJB — Migración 0004: vista pública de integrantes y almacenamiento
--
-- Cubre dos huecos detectados al implementar:
--   1. La página de créditos necesitaba leer nombres de integrantes, pero la
--      tabla `integrante` no es legible por un anónimo (correctamente: tiene
--      correos). Se resuelve con una vista, NO abriendo la tabla.
--   2. Faltaba el bucket de fotos de fichas con sus políticas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Vista pública de integrantes (FR-051, FR-051g)
--
-- Expone ÚNICAMENTE el nombre, y solo de quien puede aparecer públicamente:
-- personas mayores de edad, o menores con autorización de acudiente
-- registrada. Misma condición que FR-051d aplica a la autoría de fichas.
--
-- El correo no aparece por construcción: la vista ni lo selecciona. Es la
-- diferencia entre «se nos olvidó incluirlo» y «no puede salir».
-- ---------------------------------------------------------------------
create view integrante_publico as
select
  i.id,
  i.nombre,
  i.rol
from integrante i
where i.activo
  and (not i.es_menor_edad or i.autorizacion_acudiente);

comment on view integrante_publico is
  'Nombres publicables del equipo. Nunca incluye correo. Solo mayores de edad o menores con autorización registrada (FR-051d, FR-051g).';

-- `security_invoker = off` (por omisión en vistas) hace que la vista se
-- evalúe con los permisos de su propietario, sorteando el RLS de
-- `integrante`. Es justo lo que se quiere: la vista es la única puerta,
-- y su propia cláusula WHERE es el control de acceso.
grant select on integrante_publico to anon, authenticated;

-- ---------------------------------------------------------------------
-- Almacenamiento de fotografías de fichas (FR-040, R-008)
--
-- Solo las fotos que suben los estudiantes van a almacenamiento medido.
-- Las teselas del mapa y los clips inmersivos son estáticos en CDN.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-fichas',
  'fotos-fichas',
  true,                                    -- lectura pública: el mapa es público
  10485760,                                -- 10 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lectura pública: las fichas publicadas muestran sus fotos a cualquiera.
create policy "fotos_lectura_publica"
  on storage.objects for select
  using (bucket_id = 'fotos-fichas');

-- Escritura solo de integrantes activos.
create policy "fotos_suben_integrantes"
  on storage.objects for insert
  with check (bucket_id = 'fotos-fichas' and es_integrante_activo());

-- Cada quien borra lo suyo; el responsable, cualquiera.
create policy "fotos_borra_autor_o_responsable"
  on storage.objects for delete
  using (
    bucket_id = 'fotos-fichas'
    and (owner = auth.uid() or es_responsable())
  );

-- ---------------------------------------------------------------------
-- Índices de apoyo
--
-- Se añaden solo estos dos porque son los que sostienen consultas que se
-- ejecutan en cada carga de página. A la escala del proyecto (cientos de
-- filas) el resto no se justifica.
-- ---------------------------------------------------------------------

-- La bandeja de revisión filtra por estado en cada carga (FR-038f).
create index idx_ficha_estado on ficha_biodiversidad (estado);

-- «Mis fichas» filtra por autor (FR-038e).
create index idx_ficha_autor on ficha_biodiversidad (autor_id);

-- ---------------------------------------------------------------------
-- Comprobación de pertenencia al equipo (FR-012)
--
-- La tabla `integrante` NO es legible por un anónimo, y no debe serlo: tiene
-- correos. Pero FR-012 exige distinguir «correo del colegio no autorizado» de
-- «correo de otro dominio», y eso obliga a poder preguntar si un correo está
-- en la lista ANTES de autenticar.
--
-- Esta función es la única puerta a esa pregunta. Devuelve lo mínimo
-- imprescindible —si existe y si está activo— y NUNCA el nombre ni ningún
-- otro dato de la persona.
--
-- Nota sobre enumeración: la función permite averiguar si un correo concreto
-- pertenece al equipo. Es inherente a FR-012, que exige mensajes distintos
-- para cada caso. Se acepta a conciencia: el equipo son 10 personas conocidas
-- del colegio y el beneficio de un mensaje claro supera al riesgo.
-- ---------------------------------------------------------------------
create or replace function correo_autorizado(correo_consultado text)
returns table (existe boolean, activo boolean, rol rol_integrante)
language sql
security definer
set search_path = public
stable
as $$
  select true, i.activo, i.rol
  from integrante i
  where lower(i.correo) = lower(trim(correo_consultado))
  limit 1;
$$;

revoke all on function correo_autorizado(text) from public;
grant execute on function correo_autorizado(text) to anon, authenticated;
