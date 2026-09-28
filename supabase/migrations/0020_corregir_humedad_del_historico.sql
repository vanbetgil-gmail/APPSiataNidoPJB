-- ---------------------------------------------------------------------
-- SIATA PJB — 0020: la humedad del histórico estaba dividida por cien
--
-- FR-018, FR-025.
--
-- ── El fallo ─────────────────────────────────────────────────────────
--
-- Al comparar el formulario de Google con lo que quedó guardado apareció
-- esto, en la jornada del 27 de agosto de 2025:
--
--     formulario          base de datos
--     humedad = 40%       humedad_relativa = 0.4
--     humedad = 37%       humedad_relativa = 0.37
--     humedad = 36        humedad_relativa = 36
--
-- Las dos primeras están mal por un factor de cien. La tercera está
-- bien, y esa diferencia dice exactamente dónde se rompió.
--
-- ── Por qué ocurrió ──────────────────────────────────────────────────
--
-- Los datos se importaron desde `MEDIDORES.xlsx`, no desde el formulario.
-- Cuando alguien escribe «40%» en Excel, la celda NO guarda el texto
-- «40%»: guarda el número 0,4 y le pone formato de porcentaje. Lo que se
-- ve en pantalla es 40%; lo que hay dentro es 0,4.
--
-- `scripts/migrar-historico.ts` leía el valor interno —lo correcto para
-- cualquier otra columna— y para estas celdas eso significaba quedarse
-- con la fracción. Las celdas que se escribieron sin el símbolo, como
-- «36», entraron bien. De ahí que solo esté mal una parte.
--
-- **31 de 96 lecturas de humedad**, un tercio del total.
--
-- ── Por qué nadie lo vio ─────────────────────────────────────────────
--
-- Porque 0,4 es un número perfectamente válido. No rompe ninguna
-- restricción, no da error y no se sale del rango 0–100 que admite la
-- humedad relativa. Lo único que hace es arrastrar hacia abajo el
-- promedio de los tableros, en silencio.
--
-- ── Por qué el umbral es 1 ───────────────────────────────────────────
--
-- Porque una humedad relativa por debajo del 1 % no existe en Medellín
-- ni en ningún taller: haría falta un desecador de laboratorio. Cualquier
-- valor entre 0 y 1 es, con certeza, una fracción mal leída.
--
-- Repetir esta migración es inofensivo: después de corregirlos, los
-- valores pasan de 1 y dejan de cumplir la condición.
-- ---------------------------------------------------------------------

update medicion
set humedad_relativa = humedad_relativa * 100
where humedad_relativa > 0
  and humedad_relativa <= 1;


-- ---------------------------------------------------------------------
-- Dos lecturas donde la humedad acabó en la columna de temperatura
--
-- El mismo día 27 de agosto, medición 5:
--
--     formulario:  humedad = 0      temp = 37%
--     base:        humedad = 0      temperatura = 0.37
--
-- Quien llenó el formulario puso el porcentaje de humedad en la casilla
-- de la temperatura. La otra está el 19 de septiembre, con 0,29.
--
-- Una temperatura de 0,37 °C en Medellín es imposible, así que no hay
-- duda de qué son. Se recupera la humedad y la temperatura se deja en
-- NULO: no se sabe, y `null` significa exactamente eso (FR-025).
--
-- La fila queda marcada como dudosa para que los tableros la señalen y
-- nadie la tome después por un dato limpio.
--
-- IMPORTANTE: va DESPUÉS de la corrección de arriba. Estas filas tienen
-- humedad 0, que aquella no toca, así que no se corrigen dos veces.
-- ---------------------------------------------------------------------

update medicion
set
  humedad_relativa = temperatura * 100,
  temperatura      = null,
  dato_dudoso      = true,
  nota_dudoso      = coalesce(nota_dudoso || ' · ', '') ||
    'Corregido: el porcentaje de humedad se había escrito en la casilla de temperatura. La temperatura de esta lectura no se conoce.'
where temperatura > 0
  and temperatura <= 1;
