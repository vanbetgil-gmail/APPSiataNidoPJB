-- ---------------------------------------------------------------------
-- NIDO PJB — 0010: el catálogo de categorías se reduce a Fauna y Flora
--
-- FR-007.
--
-- ── Por qué ──────────────────────────────────────────────────────────
--
-- El catálogo tenía cinco entradas —Árbol, Arbusto, Ave, Insecto, Planta
-- ornamental— mientras que los filtros del catálogo público y de la
-- clasificación taxonómica ofrecen dos: fauna y flora.
--
-- Dos vocabularios para lo mismo se separan solos. Quien documenta una
-- especie elige entre cinco opciones y luego no encuentra su ficha bajo
-- ninguno de los dos filtros que ve; y el día que alguien añada
-- «Mamífero» al catálogo, tendrá que acordarse de que existe una lista de
-- palabras en el código que decide a qué grupo va.
--
-- Con dos categorías, la categoría ES el grupo. No hay nada que deducir
-- ni que mantener sincronizado.
--
-- ── Qué se pierde, dicho claramente ──────────────────────────────────
--
-- La distinción entre árbol, arbusto y planta ornamental deja de estar en
-- el catálogo. No es una pérdida real: las 16 fichas del registro arbóreo
-- llevan esa información en su descripción y en su nombre científico, y
-- la clasificación taxonómica completa —reino, familia, género— es
-- justamente lo que el equipo va a añadir a cada ficha. Ahí es donde ese
-- detalle tiene sitio propio, no en una lista de cinco opciones.
-- ---------------------------------------------------------------------

-- 1. Las dos categorías nuevas.
insert into categoria_biodiversidad (nombre, icono) values
  ('Fauna', 'fauna'),
  ('Flora', 'flora')
on conflict (nombre) do nothing;

-- 2. Reasignar las fichas existentes ANTES de borrar nada.
--
-- `categoria_id` es una llave foránea obligatoria: borrar primero dejaría
-- fichas apuntando al vacío y la operación fallaría entera.
update ficha_biodiversidad f
set categoria_id = (select id from categoria_biodiversidad where nombre = 'Flora')
where exists (
  select 1 from categoria_biodiversidad c
  where c.id = f.categoria_id
    and c.nombre in ('Árbol', 'Arbusto', 'Planta ornamental')
);

update ficha_biodiversidad f
set categoria_id = (select id from categoria_biodiversidad where nombre = 'Fauna')
where exists (
  select 1 from categoria_biodiversidad c
  where c.id = f.categoria_id
    and c.nombre in ('Ave', 'Insecto')
);

-- 3. Retirar las antiguas, ya sin fichas que las usen.
--
-- La condición `not exists` es una red: si por cualquier motivo quedara
-- una ficha apuntando a una de ellas, la categoría sobrevive y la
-- migración no rompe nada. Es preferible una categoría de más a una
-- ficha rota.
delete from categoria_biodiversidad c
where c.nombre in ('Árbol', 'Arbusto', 'Ave', 'Insecto', 'Planta ornamental')
  and not exists (
    select 1 from ficha_biodiversidad f where f.categoria_id = c.id
  );
