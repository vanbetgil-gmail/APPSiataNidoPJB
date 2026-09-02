-- ---------------------------------------------------------------------
-- NIDO PJB — 0008: rompe la recursión infinita de las políticas
--
-- FR-015. Corrige un defecto de 0003.
--
-- ── El fallo ─────────────────────────────────────────────────────────
--
-- `es_integrante_activo()` y `es_responsable()` consultan la tabla
-- `integrante`. Y la tabla `integrante` tiene políticas que llaman a
-- `es_responsable()`:
--
--     create policy integrante_se_ve_a_si_mismo on integrante
--       for select using (id = auth.uid() or es_responsable());
--
-- Como las funciones se declararon sin `security definer`, corrían con
-- los permisos de quien llama, así que su `select` interno volvía a
-- pasar por RLS:
--
--     leer integrante → política → es_responsable()
--                     → leer integrante → política → es_responsable() → …
--
-- PostgreSQL lo detiene con «stack depth limit exceeded». No devuelve
-- datos de más: devuelve un error.
--
-- ── Por qué afectaba a todo, no solo a `integrante` ──────────────────
--
-- Las políticas de `medicion`, `jornada`, `ficha_biodiversidad` y el
-- resto también llaman a estas funciones. Cada una de esas consultas
-- terminaba leyendo `integrante` y entrando en el mismo bucle. En la
-- práctica, ninguna persona con sesión iniciada podía leer NADA: la
-- aplicación autenticada entera estaba inutilizada.
--
-- `integranteActual()` hace justamente esa consulta, así que devolvía
-- null y el layout privado expulsaba a /login a quien acababa de entrar
-- con su contraseña correcta.
--
-- ── Por qué las pruebas no lo vieron ─────────────────────────────────
--
-- Solo había pruebas del visitante ANÓNIMO, y comprueban que no reciba
-- filas. Un error de recursión tampoco devuelve filas, así que pasaban
-- en verde por el motivo equivocado: la tabla no estaba protegida, esta-
-- ba rota. Se añade `tests/integration/rls-autenticado.test.ts` para
-- cubrir el caso con sesión.
--
-- ── La corrección ────────────────────────────────────────────────────
--
-- `security definer` hace que la función corra con los permisos de su
-- dueño, de modo que su `select` interno no vuelve a evaluar RLS y la
-- cadena se corta en el primer paso.
--
-- `set search_path = public` no es opcional en una función así: sin él,
-- quien la invoque podría anteponer un esquema propio con su propia
-- tabla `integrante` y hacer que la función respondiera lo que quiera.
-- Es el descuido habitual al usar `security definer`.
--
-- No hay pérdida de protección. Ambas funciones responden únicamente
-- sobre `auth.uid()` —quien pregunta, sobre sí mismo— y devuelven un
-- booleano, nunca filas. No pueden usarse para leer datos de terceros.
-- ---------------------------------------------------------------------

create or replace function es_integrante_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from integrante where id = auth.uid() and activo
  );
$$;

create or replace function es_responsable()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from integrante
    where id = auth.uid() and activo and rol = 'responsable'
  );
$$;

comment on function es_integrante_activo() is
  'Cierto si quien consulta tiene una ficha de integrante activa. '
  'SECURITY DEFINER a propósito: sin ello, las políticas que la usan '
  'recursan contra la propia tabla integrante (migración 0008).';

comment on function es_responsable() is
  'Cierto si quien consulta es responsable activo. SECURITY DEFINER por '
  'la misma razón que es_integrante_activo() (migración 0008).';
