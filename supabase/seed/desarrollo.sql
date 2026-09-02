-- =====================================================================
-- NIDO PJB — Datos SOLO para desarrollo local
--
-- ⚠️ NO EJECUTAR EN PRODUCCIÓN. Crea cuentas con acceso real.
--
-- Las cuentas reales las da de alta el responsable desde /admin/integrantes
-- (FR-013a: no hay autorregistro).
-- =====================================================================

-- Usuario de autenticación de prueba.
-- El correo debe pertenecer al dominio de `configuracion`, o el disparador
-- verificar_dominio_institucional() lo rechazará — que es justamente lo que
-- queremos comprobar que funciona.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000001',
  'docente.prueba@salesianos.edu.co',
  now(),
  '{"nombre":"Docente de Prueba"}'::jsonb
)
on conflict (id) do nothing;

insert into integrante (id, correo, nombre, rol, es_menor_edad, autorizacion_acudiente, activo)
values (
  '00000000-0000-0000-0000-000000000001',
  'docente.prueba@salesianos.edu.co',
  'Docente de Prueba',
  'responsable',
  false,   -- persona adulta: puede aparecer públicamente sin autorización
  true,
  true
)
on conflict (id) do nothing;

-- Estudiante de prueba: MENOR y SIN autorización.
-- Es el caso que debe hacer fallar el intento de activar mostrar_autor
-- (prueba crítica T090).
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000002',
  'estudiante.prueba@salesianos.edu.co',
  now(),
  '{"nombre":"Estudiante de Prueba"}'::jsonb
)
on conflict (id) do nothing;

insert into integrante (id, correo, nombre, rol, es_menor_edad, autorizacion_acudiente, activo)
values (
  '00000000-0000-0000-0000-000000000002',
  'estudiante.prueba@salesianos.edu.co',
  'Estudiante de Prueba',
  'integrante',
  true,    -- menor de edad
  false,   -- sin autorización de acudiente
  true
)
on conflict (id) do nothing;
