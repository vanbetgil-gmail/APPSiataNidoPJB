-- ---------------------------------------------------------------------
-- SIATA PJB — 0014: las políticas de escritura que faltaban
--
-- FR-039, FR-006a.
--
-- ── El fallo ─────────────────────────────────────────────────────────
--
-- Seis tablas tenían RLS activado y SOLO políticas de lectura. En
-- PostgreSQL, una tabla con RLS y sin política para una operación la
-- rechaza siempre: no hace falta una regla que prohíba, basta con que no
-- exista ninguna que permita.
--
-- El resultado fue que `foto_ficha` nunca aceptó una fila. Ninguna
-- fotografía ha podido adjuntarse a ninguna ficha desde el primer día.
-- El archivo sí subía al almacenamiento —esa cubeta tiene sus propias
-- reglas y están bien— así que en el servidor quedaron imágenes
-- huérfanas, sin fila que las relacionara con nada, mientras la ficha
-- decía «Sin fotografía».
--
-- `punto_mapa` tenía el mismo problema y habría aparecido el día que
-- llegara la ortofoto: marcar la ubicación falla igual.
--
-- ── Por qué nadie se enteró ──────────────────────────────────────────
--
-- Porque el código hacía `await supabase.from('foto_ficha').insert(...)`
-- sin mirar el resultado. Un rechazo de RLS no lanza excepción en
-- supabase-js: devuelve un objeto con `error`. Ignorarlo convierte un
-- fallo de permisos en silencio. Eso se corrige aparte, en el código.
--
-- ── Criterio de las políticas ────────────────────────────────────────
--
-- Escribe quien usa la aplicación; administra el responsable. Los
-- catálogos y el material de dron son decisiones de proyecto, no de una
-- salida de campo, así que quedan en manos del responsable.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 1. Fotografías de ficha — las sube cualquier integrante
--
-- `subida_por = auth.uid()`: se registra quién subió cada imagen, y nadie
-- puede atribuir una subida a otra persona.
-- ---------------------------------------------------------------------
create policy integrante_sube_foto on foto_ficha
  for insert with check (es_integrante_activo() and subida_por = auth.uid());

-- Borrar la foto equivocada es parte de subirlas. Quien la subió puede
-- quitarla; el responsable también, porque es quien responde de lo que se
-- publica —y de retirar una imagen donde aparezca un menor sin permiso.
create policy integrante_borra_su_foto on foto_ficha
  for delete using (subida_por = auth.uid() or es_responsable());


-- ---------------------------------------------------------------------
-- 2. Puntos del mapa — los marca cualquier integrante
--
-- Sin esto, marcar la ubicación de una ficha falla en cuanto exista la
-- ortofoto. No se ha notado porque todavía no hay imagen sobre la que
-- marcar, así que el formulario nunca llega a intentarlo.
--
-- Se permite también actualizar: corregir un punto mal puesto es mover el
-- que ya existe, no crear otro y dejar el anterior suelto.
-- ---------------------------------------------------------------------
create policy integrante_crea_punto on punto_mapa
  for insert with check (es_integrante_activo());

create policy integrante_corrige_punto on punto_mapa
  for update using (es_integrante_activo()) with check (es_integrante_activo());


-- ---------------------------------------------------------------------
-- 3. Catálogo de categorías — solo el responsable
--
-- Son dos, Fauna y Flora, y coinciden con los filtros de la aplicación
-- (migración 0010). Que cualquiera pudiera añadir rompería esa
-- correspondencia sin que nada avisara.
-- ---------------------------------------------------------------------
create policy responsable_gestiona_categorias on categoria_biodiversidad
  for all using (es_responsable()) with check (es_responsable());


-- ---------------------------------------------------------------------
-- 4. Imagen base del mapa — solo el responsable
--
-- Registrar una ortofoto nueva reencuadra TODOS los puntos ya marcados:
-- las coordenadas son fracciones de una imagen concreta, y cambiar la
-- imagen sin cambiar los puntos los desplaza todos a la vez. No es una
-- operación de salida de campo.
-- ---------------------------------------------------------------------
create policy responsable_gestiona_imagen_base on imagen_base_mapa
  for all using (es_responsable()) with check (es_responsable());


-- ---------------------------------------------------------------------
-- 5. Vistas inmersivas y puntos didácticos — solo el responsable
--
-- Material de dron y contenido pedagógico: se cargan una vez, desde un
-- computador, no desde el celular en mitad del patio.
-- ---------------------------------------------------------------------
create policy responsable_gestiona_inmersivas on vista_inmersiva
  for all using (es_responsable()) with check (es_responsable());

create policy responsable_gestiona_didacticos on punto_interes_didactico
  for all using (es_responsable()) with check (es_responsable());
