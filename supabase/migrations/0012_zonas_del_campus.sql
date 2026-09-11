-- ---------------------------------------------------------------------
-- SIATA PJB — 0012: zonas del campus para las fichas
--
-- FR-021a, FR-041a.
--
-- ── Qué resuelve ─────────────────────────────────────────────────────
--
-- «Dónde estaba» solo admitía un punto sobre la ortofoto, y la ortofoto
-- no existe. En la práctica el campo estaba bloqueado: la pantalla decía
-- «Todavía no se ha cargado la imagen aérea del colegio» y no había forma
-- de registrar dónde se vio nada.
--
-- Con una lista de zonas con nombre, la ubicación deja de depender del
-- vuelo de dron. Cuando la ortofoto llegue, las dos convivirán: la zona
-- dice «en la Cancha de la Fraternidad» y el punto dice exactamente
-- dónde. Son datos distintos y ninguno sustituye al otro.
--
-- ── Por qué una tabla y no una lista en el código ────────────────────
--
-- Porque el equipo pidió poder añadir zonas sin esperar a nadie. Una
-- lista escrita en el código exigiría editar, compilar y desplegar cada
-- vez que aparezca un rincón nuevo.
--
-- ── Por qué no se reutiliza `lugar_medicion` ─────────────────────────
--
-- Son dos vocabularios distintos. `lugar_medicion` son los cinco talleres
-- cerrados donde se mide el aire; las zonas son espacios del campus donde
-- se encuentra un árbol o un ave. Mezclarlos pondría «Taller de Mecánica
-- Industrial» en la lista de dónde se vio un guayacán, y «Cancha de la
-- Fraternidad» entre las opciones de una jornada de medición.
-- ---------------------------------------------------------------------

create table if not exists zona_campus (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  activo     boolean not null default true,

  -- Nulo en las sembradas: no las creó nadie desde la aplicación.
  creada_por uuid references integrante(id),
  creada_en  timestamptz not null default now()
);

comment on table zona_campus is
  'Zonas del campus donde se encuentra biodiversidad (FR-021a). Distinto '
  'de lugar_medicion, que son los talleres donde se mide el aire.';

-- ---------------------------------------------------------------------
-- Las doce zonas que entregó el equipo.
-- ---------------------------------------------------------------------
insert into zona_campus (nombre) values
  ('Aire puro'),
  ('Bloque Bachillerato'),
  ('Bloque Domingo Savio'),
  ('Cafetería'),
  ('Cancha Baloncesto'),
  ('Cancha de la Fraternidad'),
  ('Coliseo'),
  ('Hall principal'),
  ('Hall San José'),
  ('Parqueadero'),
  ('Portería principal'),
  ('Portería Recepción')
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- La ficha guarda su zona.
--
-- Nulo a propósito: las 16 fichas del registro arbóreo ya existen y traen
-- su ubicación escrita dentro de la descripción, tal como la anotó el
-- equipo en papel. Obligarlas a tener zona ahora significaría adivinar
-- cuál, y «Fraternidad» en una nota no es lo mismo que «Cancha de la
-- Fraternidad» en un catálogo.
-- ---------------------------------------------------------------------
alter table ficha_biodiversidad
  add column if not exists zona_id uuid references zona_campus(id);

comment on column ficha_biodiversidad.zona_id is
  'Zona del campus donde se observó la especie (FR-021a). Complementa a '
  'punto_mapa_id, no lo sustituye: la zona dice en qué parte, el punto '
  'dice exactamente dónde.';

-- ---------------------------------------------------------------------
-- Permisos
--
-- Lectura pública: la ficha publicada muestra su zona, y el visitante
-- anónimo tiene que poder leer el nombre.
--
-- Escritura solo del responsable: es lo que pidió el equipo. Si cualquier
-- integrante pudiera añadir, en un mes habría «cancha», «Cancha»,
-- «la cancha» y «Cancha de futbol» conviviendo, y el filtro por zona
-- dejaría de servir para nada.
-- ---------------------------------------------------------------------
alter table zona_campus enable row level security;

create policy publico_lee_zonas on zona_campus
  for select using (true);

create policy responsable_gestiona_zonas on zona_campus
  for all using (es_responsable()) with check (es_responsable());
