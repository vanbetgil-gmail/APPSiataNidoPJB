-- ---------------------------------------------------------------------
-- SIATA PJB — 0018: el mapa pasa a coordenadas reales
--
-- FR-006a, FR-006c, FR-042.
--
-- ── Por qué se cambia el sistema de coordenadas ──────────────────────
--
-- El diseño original guardaba cada punto como una FRACCIÓN de la
-- ortofoto: «al 34 % de ancho, al 71 % de alto». Tenía una razón
-- explícita —FR-006c— que era sobrevivir al cambio de ortofoto: si
-- mañana se vuela otra vez y la imagen nueva encuadra distinto, las
-- fracciones se reinterpretan sobre la nueva y los puntos siguen ahí.
--
-- El problema es que esa idea solo funciona si la imagen encuadra
-- EXACTAMENTE igual. En cuanto el segundo vuelo cubra un poco más de
-- terreno por el norte, todas las fracciones apuntan unos metros más
-- allá, y no hay forma de detectarlo: los puntos siguen dibujándose,
-- solo que sobre el árbol de al lado.
--
-- Una latitud y una longitud no tienen ese problema. Son el sitio
-- mismo, no una posición dentro de una foto concreta. Sobreviven a
-- cualquier ortofoto futura, a que no haya ninguna, y a que se cambie
-- de proveedor de mapas.
--
-- ── Y por qué ahora ──────────────────────────────────────────────────
--
-- Porque hoy no hay ortofoto. El vuelo de dron que existe no tiene ni
-- una sola toma cenital (docs/inventario-dron.md), así que el mapa
-- lleva meses mostrando «El mapa aún no está disponible».
--
-- Con coordenadas reales el mapa funciona YA, sobre imagen satelital
-- pública, y la ortofoto —cuando llegue— se superpone encima como una
-- capa más. Ninguna ficha habrá que volver a marcarla.
--
-- ── Las fracciones NO se borran ──────────────────────────────────────
--
-- `x_relativa` e `y_relativa` se conservan. Hay quince jornadas y una
-- ficha en la base, y tirar columnas con datos para «dejarlo limpio»
-- es la clase de gesto que se lamenta seis meses después. Lo que se
-- hace es dejar de exigirlas.
-- ---------------------------------------------------------------------

alter table punto_mapa
  add column if not exists latitud  numeric,
  add column if not exists longitud numeric;

comment on column punto_mapa.latitud is
  'Latitud real (WGS84). Es el sitio, no una posición dentro de una foto: sobrevive a cualquier ortofoto futura.';
comment on column punto_mapa.longitud is
  'Longitud real (WGS84). Negativa en Colombia.';


-- ---------------------------------------------------------------------
-- La versión de imagen deja de ser obligatoria
--
-- Un punto geográfico no pertenece a ninguna ortofoto. Exigirle una
-- versión sería pedirle que declare a qué foto pertenece un árbol.
-- ---------------------------------------------------------------------
alter table punto_mapa alter column imagen_base_version drop not null;

alter table punto_mapa alter column x_relativa drop not null;
alter table punto_mapa alter column y_relativa drop not null;


-- ---------------------------------------------------------------------
-- Un punto tiene que decir DÓNDE, de una de las dos formas
--
-- Sin esto, quitar los `not null` deja la puerta abierta a filas que no
-- localizan nada: un punto de mapa sin posición, que se inserta sin
-- error y no se puede dibujar en ninguna parte.
-- ---------------------------------------------------------------------
alter table punto_mapa drop constraint if exists punto_dice_donde;

alter table punto_mapa add constraint punto_dice_donde check (
  (latitud is not null and longitud is not null)
  or (x_relativa is not null and y_relativa is not null and imagen_base_version is not null)
);


-- ---------------------------------------------------------------------
-- El punto cae en Medellín, o no se guarda
--
-- FR-042 pedía que fuera imposible marcar fuera de la imagen. El
-- equivalente geográfico es esto.
--
-- La caja es generosa a propósito —unos nueve kilómetros de lado, con
-- el colegio en el centro— porque su trabajo no es recortar el campus,
-- que ya lo hace la interfaz con el polígono del KML. Su trabajo es
-- atrapar los dos errores que de verdad ocurren:
--
--   · La latitud y la longitud intercambiadas. Daría latitud −75,6,
--     que aquí no pasa.
--   · El signo perdido. Daría longitud +75,6: China occidental.
--
-- Ambos producen un punto perfectamente válido para PostgreSQL y
-- absurdo para cualquiera que mire el mapa.
-- ---------------------------------------------------------------------
alter table punto_mapa drop constraint if exists punto_dentro_de_medellin;

alter table punto_mapa add constraint punto_dentro_de_medellin check (
  latitud is null
  or (latitud between 6.20 and 6.28 and longitud between -75.65 and -75.57)
);


-- ---------------------------------------------------------------------
-- Las vistas públicas, con las coordenadas nuevas
--
-- Se conservan `x_relativa` e `y_relativa` en la salida: no cuestan
-- nada y evitan romper cualquier cosa que todavía las lea.
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
  p.latitud,
  p.longitud,
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

comment on view ficha_publica is
  'Fichas publicadas. Nunca incluye correos (FR-051). Las coordenadas llegan nulas si la ficha aún no tiene punto: quien las pinte debe descartarlas.';

grant select on ficha_publica to anon, authenticated;


drop view if exists punto_destacado_publico;

create view punto_destacado_publico as
select
  l.id   as lugar_id,
  l.nombre,
  p.latitud,
  p.longitud,
  p.x_relativa,
  p.y_relativa
from punto_destacado d
join lugar_medicion l on l.id = d.lugar_id
join punto_mapa     p on p.id = l.punto_mapa_id;

comment on view punto_destacado_publico is
  'Lugares señalados como puntos de seguimiento de calidad del aire. El público ve CUÁLES son, nunca sus valores (A-010d).';

grant select on punto_destacado_publico to anon, authenticated;
