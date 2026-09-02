-- =====================================================================
-- NIDO PJB — Migración 0005: la página de Equipo como anuario
--
-- Añade grado y fotografía a cada integrante, para presentar al equipo con
-- cara y nombre.
--
-- ── La decisión que gobierna esta migración ──────────────────────────────
--
-- Una fotografía de rostro es dato biométrico, y por tanto SENSIBLE según el
-- Art. 5 de la Ley 1581 de 2012. Tratándose de menores de edad, el Art. 7
-- prohíbe su tratamiento salvo con autorización del representante legal.
--
-- Por eso las fotos del equipo NO van en una cubeta pública. Van en una
-- privada, y la aplicación genera un enlace temporal solo para quien tiene
-- autorización registrada. Un enlace público, aunque su ruta fuera difícil
-- de adivinar, seguiría siendo un enlace público.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Campos nuevos
-- ---------------------------------------------------------------------
alter table integrante
  add column if not exists grado text,
  add column if not exists foto_ruta text,
  add column if not exists semblanza text;

comment on column integrante.grado is
  'Grado escolar (11°, 10-B) o cargo (Docente acompañante). Texto libre: los colegios los nombran de formas distintas.';
comment on column integrante.foto_ruta is
  'Ruta en la cubeta PRIVADA fotos-equipo. Nunca se expone directamente: la aplicación genera un enlace temporal.';
comment on column integrante.semblanza is
  'Una o dos frases del propio integrante. Opcional.';

-- ---------------------------------------------------------------------
-- La vista pública, ampliada
--
-- Se mantiene la misma condición de siempre: solo aparece quien es mayor de
-- edad o tiene autorización de acudiente registrada (FR-051d).
--
-- `foto_ruta` se incluye a propósito aunque sea una ruta privada: no es un
-- enlace utilizable por sí solo. Sin firmar, no abre nada.
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
  i.creado_en
from integrante i
where i.activo
  and (not i.es_menor_edad or i.autorizacion_acudiente);

comment on view integrante_publico is
  'Datos publicables del equipo. Nunca incluye correo. Solo mayores de edad o menores con autorización registrada (FR-051d, FR-051g).';

grant select on integrante_publico to anon, authenticated;

-- ---------------------------------------------------------------------
-- Cubeta PRIVADA para las fotografías del equipo
--
-- `public = false` es la diferencia con `fotos-fichas`. Una foto de un
-- guayacán puede ser pública; la cara de un estudiante de grado noveno, no.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-equipo',
  'fotos-equipo',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Solo el responsable sube y borra fotos del equipo. No las sube cada
-- estudiante: es quien custodia las autorizaciones quien las gestiona.
create policy "equipo_gestiona_responsable"
  on storage.objects for all
  using (bucket_id = 'fotos-equipo' and es_responsable())
  with check (bucket_id = 'fotos-equipo' and es_responsable());

-- Los integrantes autenticados pueden ver las fotos del equipo dentro de la
-- aplicación. Los visitantes anónimos NO: para ellos, la página pública usa
-- enlaces temporales generados en el servidor.
create policy "equipo_lectura_integrantes"
  on storage.objects for select
  using (bucket_id = 'fotos-equipo' and es_integrante_activo());
