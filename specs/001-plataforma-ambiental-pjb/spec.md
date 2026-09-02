# Feature Specification: NIDO PJB — Mapa de Biodiversidad y Registro de Mediciones

**Feature Branch**: `001-plataforma-ambiental-pjb`

**Created**: 2026-08-28

**Última actualización**: 2026-08-28 (decisiones de nombre, acceso y migración + 5 clarificaciones de sesión)

**Status**: Listo para planeación — sin marcadores pendientes

**Input**: User description: "Existe un proyecto escolar que utiliza Maqueta de la estación Meteorológica fija del parque San José (dentro del colegio), junto con una nube SIATA. Instrumentos de medición meteorológicos (de plástico) los cuales permiten una comprensión didáctica de la medición de variables climáticas. Se requiere una aplicación versión escritorio y móvil en la cual se tenga un Mapa de Biodiversidad Escolar dinámico e interactivo elaborado por los estudiantes, adicional de un login para los 10 integrantes del proyecto que permita acceder con correo institucional a los tableros de resultados y registrar nuevas mediciones e inventario de la biodiversidad del cole para que muestre en el mapa y también aparte cada uno con su foto y detalle. El mapa puede verlo cualquier persona. Propon nombres para el proyecto ya que el logo nos gusta pero el nombre debe ser más adecuado y que contenga las siglas del colegio: PJB. Que cuente con un diseño fresco y minimalista."

---

## Contexto

La plataforma se llama **NIDO PJB** — *Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío*. Vivirá en el dominio **institutopedrojustoberrio.com**.

El Instituto Salesiano Pedro Justo Berrío (siglas **PJB**) desarrolla un proyecto escolar de ciencias ambientales que combina tres elementos físicos ya existentes:

1. **Maqueta de la estación meteorológica fija** del parque San José, ubicado dentro del colegio.
2. **Instrumentos de medición meteorológicos didácticos** (construidos en plástico por los estudiantes) que hacen tangible cómo se miden las variables climáticas.
3. **Medidores portátiles de calidad del aire** (identificados por número de serie) con los que los estudiantes toman jornadas de medición en distintos espacios del colegio, reportando hoy a través de un formulario en línea cuyos resultados se consolidan en la hoja de cálculo `MEDIDORES.xlsx`.

El proyecto se apoya conceptualmente en la nube de datos de **SIATA** (Sistema de Alerta Temprana del Valle de Aburrá) como referente de calidad del aire de la ciudad.

Hoy el flujo de datos es: formulario en línea → hoja de cálculo → gráficas manuales. No existe mapa de biodiversidad digital, ni fichas de especies, ni tableros consultables por los estudiantes.

### Datos históricos existentes (evidencia de `MEDIDORES.xlsx`)

Esta especificación se construyó sobre el archivo real, que contiene:

- **22 jornadas de medición** entre el **15 de agosto de 2025** y el **22 de octubre de 2025**.
- **135 registros de medición individuales** (hoja `LongData`, ya en formato largo).
- Hasta **7–8 mediciones por jornada**, tomadas cada 10 minutos entre las 12:00 p.m. y las 3:00 p.m.
- **11 variables por medición**: hora, PM1 (µg/m³), PM2.5 (µg/m³), PM10 (µg/m³), formaldehído HCHO (µg/m³), TVOC (µg/m³), humedad relativa (%), temperatura (°C), número de partículas por litro (per/L), CO₂ (ppm) e índice AQI.
- **5 lugares de medición**: Taller de Mecánica Industrial (34 registros), Taller de Mecánica Automotriz (33), Ebanistería (14), «Op» (12, etiqueta incompleta o abreviada), Artes Gráficas (5).
- **7 estudiantes** que han tomado mediciones, identificados hoy por el alias de su correo personal.
- **Medidores** identificados por número de serie, anotados de forma inconsistente como `31`–`34` y también como `9031`–`9034`.

De esos 135 registros, **98 son importables** —los que traen lugar y medidor, repartidos en 15 de las 22 jornadas— y **37 no**, por venir sin ninguno de los dos. Nótese que los 5 lugares de la lista de arriba suman exactamente 98: las 37 filas restantes no aparecen ahí porque no tienen lugar que contar. El desglose está en `contracts/import-export.md` §4b.

**Problemas de calidad de datos detectados** que la plataforma debe eliminar en adelante:

- Valores de temperatura capturados como texto (`27°`) en columnas numéricas.
- Valores de HCHO/TVOC capturados como texto con ceros a la izquierda (`0001`, `0000`).
- El mismo medidor identificado con dos series distintas (`32` frente a `9032`).
- Nombres de lugar con espacios sobrantes y variantes de mayúsculas (`Artes  graficas `).
- Un lugar con nombre truncado o ambiguo (`Op`).
- **37 registros sin lugar ni número de serie**, que por eso no se pueden ubicar ni comparar. Es el defecto de mayor impacto del archivo: cuesta el 27 % de los datos.
- Estructura ancha de 98 columnas con bloques repetidos por medición, imposible de mantener a mano.

---

## Clarifications

### Session 2026-08-28

- Q: ¿El mapa del colegio será un mapa geográfico real con coordenadas, o un plano ilustrado dibujado por ustedes? → A: Foto aérea o satelital del colegio como fondo, con los puntos marcados a mano encima (opción D)
- Q: ¿Una ficha de especie aparece de inmediato en el mapa público, o necesita aprobación previa del responsable? → A: Revisión previa solo en la primera publicación; después el estudiante edita y sus cambios salen directo (opción B)
- Q: ¿Debe aparecer el nombre del estudiante autor en las fichas del mapa público? → A: Lo decide el propio estudiante, ficha por ficha (opción D)
- Q: ¿«Versión escritorio y móvil» significa un sitio web adaptable o programas instalables por dispositivo? → A: Un solo sitio web adaptable, instalable en el celular como ícono y con funcionamiento sin conexión para el registro en campo (opción B)
- Q: ¿Contra qué referencia oficial se clasifican los valores de calidad del aire? → A: ICA colombiano de la Resolución 2254 de 2017, el mismo que usa SIATA (opción B)
- Q: ¿De dónde sale la imagen base del mapa? → A: Tomas aéreas de dron sobre el colegio, hechas por el propio proyecto, con navegación inmersiva solo en puntos con biodiversidad o alta contaminación
- Q: ¿Qué formato tiene el material de dron para las vistas inmersivas? → A: Material variado; el formato se decidirá tras inventariar lo existente, así que el sistema debe admitir panorámica 360°, foto de alto detalle y video (opción D)
- Q: ¿Quién decide qué punto es de alta contaminación? → A: Lo marca manualmente el responsable del proyecto (opción B)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar el mapa de biodiversidad sin cuenta (Priority: P1)

Cualquier persona —un estudiante de otro grado, un acudiente, un docente visitante, un jurado de feria de ciencias— abre la aplicación en su celular o computador y ve de inmediato el mapa del colegio con los puntos de biodiversidad marcados por los estudiantes. Toca un punto y se abre la ficha de esa especie con su foto, nombre común, nombre científico y la descripción que escribieron los estudiantes. Puede filtrar el mapa por tipo de organismo y buscar por nombre. No necesita registrarse ni iniciar sesión en ningún momento.

**Why this priority**: Es la cara pública del proyecto y su mayor valor de divulgación. Funciona por sí sola sin ningún otro módulo: con un inventario semilla cargado ya constituye un producto entregable y demostrable en una feria escolar.

**Independent Test**: Se prueba completamente abriendo la aplicación en una sesión anónima, navegando el mapa, abriendo al menos tres fichas de especie distintas y aplicando un filtro, verificando que en ningún momento se solicita autenticación.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta que abre la aplicación por primera vez, **When** carga la pantalla inicial, **Then** ve el mapa del colegio con todos los puntos de biodiversidad publicados, sin pantalla de inicio de sesión previa.
2. **Given** el mapa cargado, **When** el visitante selecciona un punto de biodiversidad, **Then** se muestra la ficha con foto, nombre común, nombre científico, categoría y descripción elaborada por los estudiantes.
3. **Given** el mapa cargado, **When** el visitante aplica un filtro por categoría de organismo, **Then** el mapa muestra únicamente los puntos de esa categoría y el conteo visible se actualiza.
4. **Given** el mapa cargado, **When** el visitante busca por nombre común o científico, **Then** los resultados coincidentes se resaltan y el mapa se centra en el primero.
5. **Given** un visitante en un teléfono móvil, **When** usa gestos de acercar, alejar y desplazar sobre el mapa, **Then** el mapa responde de forma fluida y las fichas se leen sin desbordamiento horizontal.
6. **Given** una ficha de especie abierta, **When** el visitante comparte su enlace, **Then** quien reciba el enlace abre directamente esa ficha sin autenticarse.
7. **Given** el mapa cargado, **When** el visitante observa los puntos, **Then** distingue cuáles ofrecen vista inmersiva antes de abrirlos.
8. **Given** un punto con vista inmersiva, **When** el visitante la abre y luego la cierra, **Then** vuelve al mapa en la misma posición y nivel de acercamiento que tenía.
9. **Given** un punto sin material inmersivo disponible, **When** el visitante lo abre, **Then** ve su ficha o sus datos con normalidad, sin espacios vacíos ni mensajes de error.
10. **Given** un lugar marcado como de alta contaminación, **When** un visitante sin sesión lo abre, **Then** ve su categoría cualitativa de calidad del aire pero no los valores detallados ni los tableros.

---

### User Story 2 - Ingresar como integrante del proyecto con correo institucional (Priority: P2)

Uno de los 10 integrantes del proyecto abre la aplicación y entra con su correo institucional del colegio. Al autenticarse ve una zona privada con las opciones que un visitante no tiene: registrar mediciones, administrar el inventario de biodiversidad y consultar los tableros de resultados. Cierra sesión al terminar y la aplicación vuelve al modo público.

**Why this priority**: Es la puerta de entrada a todo lo que un visitante no puede hacer. Sin ella no hay forma de proteger el registro de datos ni de saber quién tomó cada medición, pero el mapa público ya funciona sin ella.

**Independent Test**: Se prueba intentando entrar con un correo institucional autorizado (éxito), con un correo institucional ajeno al equipo (rechazo) y con un correo fuera del dominio institucional (rechazo), verificando el mensaje mostrado en cada caso.

**Acceptance Scenarios**:

1. **Given** un integrante autorizado, **When** inicia sesión con su correo institucional, **Then** accede a la zona privada y ve su nombre e identidad en la interfaz.
2. **Given** una persona con correo institucional del colegio que no hace parte del equipo del proyecto, **When** intenta iniciar sesión, **Then** el acceso es denegado con un mensaje que explica que la cuenta no está autorizada para el proyecto.
3. **Given** una persona con un correo ajeno al dominio institucional, **When** intenta iniciar sesión, **Then** el acceso es denegado indicando que solo se admiten correos institucionales.
4. **Given** un integrante con sesión iniciada, **When** cierra sesión, **Then** las funciones privadas dejan de estar disponibles y el mapa público sigue accesible.
5. **Given** un integrante que cerró la aplicación sin cerrar sesión, **When** la vuelve a abrir dentro del periodo de sesión válido, **Then** continúa autenticado sin volver a ingresar credenciales.
6. **Given** un visitante sin sesión, **When** intenta abrir directamente el enlace de un tablero o del formulario de registro, **Then** es redirigido al inicio de sesión y, tras autenticarse, llega a la pantalla que había solicitado.

---

### User Story 3 - Registrar una jornada de mediciones desde el sitio (Priority: P2)

Un integrante está de pie en el Taller de Mecánica Industrial con el medidor portátil en la mano. Abre la aplicación en su celular, inicia una jornada eligiendo el lugar y el medidor que está usando, y va registrando cada lectura: la aplicación le pide las once variables y le sugiere la hora automáticamente. Registra siete lecturas espaciadas cada diez minutos. Si una lectura queda fuera de rango razonable, la aplicación se lo advierte antes de guardar. Al terminar cierra la jornada y ve el resumen de lo que acaba de registrar.

**Why this priority**: Reemplaza el formulario externo y la hoja de cálculo, y es donde se corrigen de raíz los problemas de calidad de datos detectados. Depende del inicio de sesión (US2) para saber quién midió.

**Independent Test**: Se prueba registrando una jornada completa de siete mediciones en un lugar conocido, verificando que quedan almacenadas con autor, lugar, medidor, fecha y hora, y que los valores fuera de rango y los formatos inválidos son rechazados o advertidos.

**Acceptance Scenarios**:

1. **Given** un integrante autenticado, **When** inicia una nueva jornada, **Then** debe seleccionar el lugar de medición de una lista predefinida y el medidor de una lista de equipos registrados, sin poder escribir texto libre en ninguno de los dos campos.
2. **Given** una jornada abierta, **When** el integrante registra una medición, **Then** el sistema captura las once variables y asocia automáticamente la fecha, la hora, el autor autenticado, el lugar y el medidor de la jornada.
3. **Given** el formulario de medición, **When** el integrante escribe un valor con símbolos no numéricos (por ejemplo `27°`), **Then** el sistema lo rechaza o lo normaliza a número antes de guardar, y nunca almacena texto en un campo numérico.
4. **Given** el formulario de medición, **When** un valor queda fuera del rango físicamente plausible de esa variable, **Then** el sistema muestra una advertencia y exige confirmación explícita antes de guardar.
5. **Given** una medición ya guardada, **When** el integrante detecta un error, **Then** puede corregirla y el sistema conserva registro de que fue modificada, por quién y cuándo.
6. **Given** un integrante midiendo en un sitio sin conexión estable, **When** registra mediciones, **Then** los datos se conservan localmente y se sincronizan automáticamente al recuperar conexión, sin pérdida ni duplicación.
7. **Given** una jornada con mediciones registradas, **When** el integrante la cierra, **Then** ve un resumen con el número de mediciones, el rango horario y los valores promedio de la jornada.

---

### User Story 4 - Consultar los tableros de resultados (Priority: P3)

Un integrante prepara la presentación del proyecto. Entra a los tableros y ve la evolución de PM2.5 a lo largo de las jornadas, comparada entre el Taller de Mecánica Industrial y Ebanistería. Cambia la variable a CO₂, ajusta el rango de fechas al último mes y descarga los datos filtrados para anexarlos al informe. Los valores se muestran con su clasificación de calidad del aire para que cualquiera entienda si son altos o bajos.

**Why this priority**: Convierte los datos en conclusiones y sustenta el informe del proyecto, pero requiere que ya existan datos registrados (US3) o migrados.

**Independent Test**: Se prueba con el histórico cargado, seleccionando cada variable, comparando dos lugares, cambiando el rango de fechas y exportando el resultado, verificando que los totales coinciden con el conteo de registros del histórico.

**Acceptance Scenarios**:

1. **Given** un integrante autenticado con datos disponibles, **When** abre los tableros, **Then** ve la serie temporal de cada variable medida a lo largo de las jornadas.
2. **Given** un tablero abierto, **When** filtra por uno o varios lugares de medición, **Then** las visualizaciones muestran solo esos lugares y permiten compararlos entre sí.
3. **Given** un tablero abierto, **When** ajusta el rango de fechas, **Then** todas las visualizaciones del tablero se actualizan de forma consistente al mismo rango.
4. **Given** un valor de calidad del aire mostrado, **When** el integrante lo observa, **Then** viene acompañado de su categoría cualitativa interpretable (por ejemplo buena, moderada, dañina) y no solo del número crudo.
5. **Given** un tablero filtrado, **When** el integrante solicita exportar, **Then** obtiene los datos correspondientes al filtro aplicado en un formato abierto de hoja de cálculo.
6. **Given** una variable sin datos en el rango seleccionado, **When** se muestra su visualización, **Then** aparece un mensaje explícito de ausencia de datos en lugar de una gráfica vacía o engañosa.
7. **Given** un integrante consultando en móvil, **When** abre un tablero, **Then** las gráficas se adaptan a la pantalla y las tablas anchas se desplazan dentro de su propio contenedor sin romper el diseño de la página.

---

### User Story 5 - Documentar una especie en el inventario de biodiversidad (Priority: P3)

Un integrante encuentra un árbol que aún no está en el mapa. Desde el celular toma su foto, marca su ubicación tocando la imagen aérea del colegio, escribe el nombre común, el nombre científico, la categoría y una descripción de lo que observó. Envía la ficha a revisión; el docente responsable la aprueba y el nuevo punto aparece en el mapa que ve cualquier persona, con su propia página de foto y detalle. De ahí en adelante el estudiante puede corregir y ampliar esa ficha por su cuenta, y sus cambios se ven de inmediato.

**Why this priority**: Alimenta el mapa público en el tiempo y convierte el inventario en un trabajo vivo de los estudiantes, pero el mapa puede lanzarse con un inventario inicial cargado.

**Independent Test**: Se prueba creando una ficha nueva con foto y ubicación, enviándola a revisión, aprobándola con la cuenta del responsable, y verificando desde una sesión anónima que el punto aparece en el mapa y que su página de detalle es accesible; luego editándola para comprobar que el cambio sale sin nueva aprobación.

**Acceptance Scenarios**:

1. **Given** un integrante autenticado, **When** crea una ficha de biodiversidad, **Then** puede capturar o cargar al menos una fotografía, ubicar el registro tocando su posición sobre la imagen aérea del colegio y completar nombre común, nombre científico, categoría y descripción.
2. **Given** una ficha nueva y completa, **When** el integrante la envía a revisión, **Then** queda en estado «en revisión», no aparece aún en el mapa público y el responsable la ve en su lista de pendientes.
3. **Given** una ficha en revisión, **When** el responsable la aprueba, **Then** el nuevo punto queda visible en el mapa público y su página de detalle es accesible sin autenticación.
4. **Given** una ficha en revisión, **When** el responsable la rechaza indicando un motivo, **Then** vuelve a borrador y su autor ve el motivo del rechazo.
5. **Given** una ficha ya aprobada y publicada, **When** un integrante la edita, **Then** los cambios se reflejan de inmediato en el mapa y en la página de detalle, sin nueva aprobación, y queda registrado quién la modificó y cuándo.
6. **Given** una ficha a la que le faltan campos obligatorios, **When** el integrante intenta publicarla, **Then** el sistema impide la publicación e indica con precisión qué falta.
7. **Given** una fotografía tomada desde un celular moderno, **When** se carga a la ficha, **Then** el sistema la almacena y la muestra sin que su tamaño degrade la carga del mapa ni de la página de detalle.
8. **Given** una ficha publicada por error o con información incorrecta, **When** un integrante la despublica, **Then** desaparece del mapa público conservando su historial para el equipo.

---

### User Story 6 - Conocer la estación fija y los instrumentos didácticos (Priority: P4)

Un visitante que recorre el mapa quiere entender de dónde salen los datos. Encuentra en el mapa el punto de la estación meteorológica fija del parque San José y, al abrirlo, ve la maqueta, la explicación de qué mide la estación y una sección que presenta cada instrumento didáctico construido por los estudiantes —pluviómetro, veleta, anemómetro y demás— con su foto, qué variable mide y cómo funciona. También encuentra la referencia a la red SIATA como fuente de contexto para la calidad del aire de la ciudad.

**Why this priority**: Aporta el sentido pedagógico que da razón de ser al proyecto, pero es contenido explicativo que puede publicarse después del núcleo funcional.

**Independent Test**: Se prueba abriendo el punto de la estación fija desde una sesión anónima y recorriendo la sección de instrumentos didácticos, verificando que cada uno tiene foto, variable asociada y explicación.

**Acceptance Scenarios**:

1. **Given** el mapa público, **When** un visitante selecciona el punto de la estación meteorológica fija del parque San José, **Then** ve su descripción, la maqueta y las variables climáticas que representa.
2. **Given** la sección de instrumentos didácticos, **When** un visitante la recorre, **Then** cada instrumento se presenta con su fotografía, la variable que mide y una explicación en lenguaje escolar.
3. **Given** la referencia a SIATA, **When** un visitante la consulta, **Then** entiende qué es la red y cómo se relaciona con las mediciones del colegio.

---

### Edge Cases

- **Lugar de medición ambiguo en el histórico**: el valor `Op` no corresponde a ningún lugar identificable. Debe resolverse a un nombre completo antes de migrar, o marcarse explícitamente como «lugar sin identificar» y quedar excluido de las comparaciones entre lugares.
- **Mismo medidor con dos series**: los medidores `31`–`34` y `9031`–`9034` deben consolidarse en una identidad única por equipo, o quedar declarados como equipos distintos si efectivamente lo son.
- **Autor de medición sin correo institucional**: los 7 estudiantes que registraron el histórico lo hicieron con correos personales, mientras que la aplicación exige correo institucional. Cada registro histórico debe quedar atribuido al integrante correcto.
- **Medición fuera del horario habitual**: las jornadas históricas ocurren entre las 12:00 p.m. y las 3:00 p.m.; el sistema no debe impedir registrar fuera de ese horario, pero sí destacarlo como atípico.
- **Dos integrantes registrando la misma jornada al tiempo**: si dos personas abren una jornada para el mismo lugar y medidor simultáneamente, el sistema debe evitar mediciones duplicadas o advertir del solapamiento.
- **Sin conexión durante toda la jornada**: si el dispositivo nunca recupera conexión, los datos deben permanecer disponibles localmente y no perderse al cerrar la aplicación.
- **Foto muy pesada o de formato no soportado**: debe rechazarse con un mensaje claro o adaptarse automáticamente, sin dejar la ficha a medio guardar.
- **Punto de biodiversidad fuera de los límites del colegio**: al ubicar un registro fuera del predio escolar, el sistema debe advertirlo antes de guardar.
- **Mapa sin ningún punto publicado**: la primera carga con inventario vacío debe mostrar un estado inicial explicativo, no un mapa en blanco sin contexto.
- **Ficha olvidada en revisión**: si una ficha lleva demasiado tiempo esperando aprobación, debe destacarse en la lista del responsable para que no quede el trabajo del estudiante en el limbo.
- **Único responsable ausente**: si la persona que aprueba no está disponible, ninguna ficha nueva puede publicarse; debe poder designarse más de un responsable.
- **Variable no registrada en una medición**: los datos históricos tienen celdas vacías; el sistema debe distinguir «no medido» de «medido en cero» tanto al almacenar como al graficar.
- **Medición sin PM2.5 ni PM10**: si faltan ambas variables, no puede calcularse el ICA de esa medición; debe indicarse como categoría no disponible en lugar de asumir «buena».
- **AQI del medidor divergente del ICA calculado**: cuando ambos valores no coincidan, la aplicación debe mostrarlos por separado y etiquetados, sin corregir uno con el otro.
- **Integrante que egresa del colegio**: debe poder revocarse su acceso conservando la autoría de sus mediciones y fichas.
- **Autorización de acudiente retirada**: si el colegio revoca la autorización de un integrante, el nombre de esa persona debe dejar de mostrarse en todas sus fichas y en la página de créditos, sin que ello despublique las fichas ni borre su autoría interna.
- **Integrante que retira su nombre después de publicar**: la ficha debe permanecer publicada y pasar a atribuirse al equipo, sin perder su historial.
- **Visitante con conexión lenta**: el mapa debe volverse utilizable progresivamente en lugar de bloquear la pantalla hasta cargar todo el inventario, y no debe traer ningún material inmersivo hasta que el visitante lo pida.
- **Punto de contaminación bajo techo**: los talleres no pueden documentarse con dron; si no hay captura interior disponible, el punto debe funcionar sin vista inmersiva en lugar de mostrar una toma del tejado que no aporta nada.
- **Video o panorámica que el dispositivo no reproduce**: debe mostrarse la fotografía de respaldo con un aviso comprensible, nunca un error técnico.
- **Lugar marcado como de alta contaminación cuyos datos mejoran**: la marca es manual y no se retira sola; debe quedar visible para el responsable que los datos ya no la respaldan, para que decida si la mantiene.
- **Ficha de biodiversidad despublicada en un punto con vista inmersiva**: al dejar de existir registros publicados en ese punto, la vista inmersiva debe dejar de ofrecerse salvo que el punto siga marcado por contaminación.

---

## Requirements *(mandatory)*

### Identidad y marca

- **FR-001**: La plataforma DEBE presentarse con el nombre **NIDO PJB**, y su lectura completa —*Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío*— DEBE aparecer al menos una vez en la pantalla pública de presentación.
- **FR-002**: La plataforma DEBE conservar el ave multicolor y la barra cromática de calidad del aire del logo actual como base de su identidad visual, sustituyendo únicamente el texto de la marca.
- **FR-003**: La interfaz DEBE seguir un estilo fresco y minimalista: predominio de espacio en blanco, tipografía legible, color usado con intención para comunicar estado ambiental y no como decoración, y ausencia de elementos ornamentales que compitan con el contenido.
- **FR-004**: La paleta DEBE derivarse de la barra cromática del logo (verde → amarillo → naranja → rojo → morado) y esa escala DEBE usarse de forma consistente para representar niveles de calidad del aire en todas las pantallas.

### Acceso público

- **FR-005**: El mapa de biodiversidad y las fichas de especie DEBEN ser accesibles sin autenticación ni registro previo.
- **FR-006**: El mapa DEBE presentarse sobre una imagen aérea o satelital del predio del colegio como fondo fijo, y DEBE permitir acercar, alejar, desplazarse y seleccionar puntos individuales sobre ella.
- **FR-006a**: La ubicación de cada punto DEBE marcarse manualmente tocando la imagen y DEBE almacenarse referida a esa imagen, de modo que un mismo punto quede siempre en el mismo lugar del colegio en todos los dispositivos y niveles de acercamiento.
- **FR-006b**: La imagen de fondo DEBE provenir de las tomas aéreas de dron del propio proyecto y tener resolución suficiente para distinguir a simple vista los espacios del colegio (patios, bloques, zonas verdes, árboles individuales) al máximo nivel de acercamiento previsto.
- **FR-006e**: El mapa DEBE cargar la imagen aérea de forma progresiva, mostrando primero una vista general utilizable y trayendo el detalle solo del área y el nivel de acercamiento que el visitante esté mirando, de modo que el peso de las tomas de dron no comprometa el tiempo de carga exigido en SC-002.
- **FR-006c**: Si la imagen de fondo se reemplaza por una versión más reciente, los puntos ya marcados DEBEN conservar su posición relativa sobre el predio, sin quedar desplazados.
- **FR-007**: El mapa DEBE permitir filtrar los puntos por categoría de organismo.
- **FR-008**: El mapa DEBE permitir buscar registros por nombre común o nombre científico.
- **FR-009**: Cada registro de biodiversidad DEBE tener una página de detalle propia y direccionable de forma independiente, con al menos una fotografía y su descripción completa.
- **FR-010**: La información de la estación meteorológica fija del parque San José y de los instrumentos didácticos DEBE ser consultable públicamente.

### Vistas inmersivas y puntos destacados del mapa

- **FR-010a**: El mapa DEBE ofrecer una **vista inmersiva** únicamente en puntos seleccionados —los que tengan registros de biodiversidad publicados y los lugares marcados como de alta contaminación—; el resto del predio se recorre solo en la vista aérea general.
- **FR-010b**: La vista inmersiva DEBE admitir, como mínimo, tres tipos de medio, y cada punto DEBE declarar cuál usa: **panorámica de 360°** navegable, **foto de alto detalle** con acercamiento profundo, y **video corto**. Un mismo punto PUEDE tener más de un medio asociado.
- **FR-010c**: La vista inmersiva DEBE ser opcional por punto: un punto sin material disponible DEBE seguir siendo plenamente funcional mostrando su ficha o sus datos, sin espacios vacíos ni errores.
- **FR-010d**: El material de la vista inmersiva NO DEBE restringirse a capturas de dron: los espacios interiores DEBEN poder documentarse con capturas hechas desde un dispositivo móvil (ver A-010b).
- **FR-010e**: El mapa DEBE señalar visualmente qué puntos tienen vista inmersiva disponible antes de que el visitante los abra.
- **FR-010f**: El material de las vistas inmersivas NO DEBE descargarse hasta que el visitante decida abrir una, para no penalizar la carga inicial del mapa.
- **FR-010g**: El visitante DEBE poder salir de la vista inmersiva y regresar al mapa en la misma posición y nivel de acercamiento en que estaba.
- **FR-010h**: Si un medio inmersivo no puede reproducirse en el dispositivo del visitante, el sistema DEBE mostrar en su lugar la fotografía de la ficha con un aviso comprensible, nunca un error técnico.
- **FR-010i**: La vista inmersiva DEBE ser accesible sin autenticación, igual que el resto del mapa público.
- **FR-010j**: El responsable del proyecto DEBE poder marcar y desmarcar manualmente qué lugares de medición se destacan en el mapa como de **alta contaminación**.
- **FR-010k**: Esa marca DEBE ser exclusivamente manual: el sistema NO DEBE activarla ni desactivarla por su cuenta a partir de los datos medidos.
- **FR-010l**: Al marcar un lugar, el sistema DEBE mostrar al responsable el resumen de las mediciones de ese lugar —promedios de PM2.5 y PM10 y su categoría ICA— para que la decisión se tome con los datos a la vista.
- **FR-010m**: El sistema DEBE registrar qué responsable marcó cada punto y en qué fecha.

### Autenticación y autorización

- **FR-011**: El sistema DEBE permitir el ingreso únicamente a integrantes autorizados del proyecto usando su correo institucional del colegio, y DEBE tratar el dominio institucional como un valor configurable por el responsable del proyecto, sin requerir cambios técnicos para modificarlo (ver A-006).
- **FR-012**: El sistema DEBE rechazar el ingreso de correos ajenos al dominio institucional y de correos institucionales que no pertenezcan al equipo del proyecto, con mensajes distinguibles entre ambos casos.
- **FR-013**: El sistema DEBE soportar al menos 10 cuentas de integrante y permitir que el responsable del proyecto agregue o revoque integrantes desde la propia aplicación, sin intervención técnica.
- **FR-013a**: El alta de un integrante DEBE hacerla el responsable del proyecto registrando su correo institucional en una lista de autorizados; NO DEBE existir autorregistro.
- **FR-014**: El sistema DEBE distinguir al menos dos niveles de permiso: integrante (registra mediciones y fichas) y responsable del proyecto (además administra el equipo, los lugares y los medidores, y aprueba la primera publicación de cada ficha de biodiversidad).
- **FR-014a**: El ingreso DEBE hacerse con contraseña, sin depender de que llegue un correo (R-005a). El responsable del proyecto entrega la contraseña inicial y DEBE poder restablecer la de cualquier integrante que la olvide, sin intervención técnica y sin usar el correo. Cada integrante DEBE poder cambiar la suya desde la aplicación.
- **FR-015**: Toda función de registro, edición y consulta de tableros DEBE requerir sesión iniciada.
- **FR-016**: El sistema DEBE mantener la sesión iniciada entre usos de la aplicación y ofrecer cierre de sesión explícito.

### Registro de mediciones

- **FR-017**: El sistema DEBE permitir registrar una medición con las once variables del instrumento: hora, PM1, PM2.5, PM10, formaldehído HCHO, TVOC, humedad relativa, temperatura, número de partículas por litro, CO₂ e índice AQI.
- **FR-018**: El sistema DEBE almacenar cada valor numérico como número, rechazando o normalizando cualquier entrada con símbolos o formato de texto.
- **FR-019**: El sistema DEBE agrupar las mediciones en jornadas, asociando a cada jornada un lugar, un medidor, una fecha y el integrante que la realizó.
- **FR-020**: El sistema DEBE permitir al menos 8 mediciones dentro de una misma jornada, sin imponer un máximo rígido.
- **FR-021**: El lugar de medición DEBE seleccionarse de un catálogo administrado y nunca escribirse como texto libre.
- **FR-022**: El medidor DEBE seleccionarse de un catálogo de equipos registrados con identidad única, y nunca escribirse como texto libre.
- **FR-023**: El sistema DEBE registrar automáticamente fecha, hora y autor de cada medición, permitiendo ajustar la hora cuando la captura se haga en diferido.
- **FR-024**: El sistema DEBE validar cada variable contra un rango físicamente plausible y advertir antes de guardar valores fuera de rango, sin impedirlo de forma absoluta.
- **FR-025**: El sistema DEBE distinguir explícitamente entre una variable no medida y una variable medida con valor cero.
- **FR-026**: El sistema DEBE permitir corregir mediciones ya guardadas conservando registro de la modificación, su autor y su fecha.
- **FR-027**: El sistema DEBE permitir registrar mediciones sin conexión y sincronizarlas automáticamente al recuperarla, sin pérdida ni duplicación de registros.
- **FR-027a**: El integrante DEBE ver en todo momento si está trabajando sin conexión y cuántas mediciones tiene pendientes de sincronizar.
- **FR-027b**: Las mediciones pendientes DEBEN sobrevivir al cierre de la aplicación y al reinicio del dispositivo.

### Migración del histórico e importación de datos

- **FR-028**: El sistema DEBE incorporar las mediciones históricas registradas entre agosto y octubre de 2025 que traigan lugar y medidor, conservando lugar, medidor, autor, fecha y hora de cada una. Sobre el archivo real son 98 de 135, agrupadas en 15 jornadas: las 37 restantes carecen de lugar y de medidor en el origen y se rechazan de forma explícita y motivada (FR-031), no en silencio.
- **FR-029**: La migración DEBE normalizar los nombres de lugar, unificar las identidades duplicadas de medidores y convertir a número los valores capturados como texto.
- **FR-030**: La migración DEBE atribuir cada registro histórico al integrante correspondiente del equipo, vinculando con el correo institucional de su titular cada uno de los alias de correo personal del histórico que tenga titular identificado.
- **FR-030a**: El sistema DEBE conservar la vinculación alias personal → integrante institucional como un dato consultable, de modo que la trazabilidad del histórico pueda auditarse después de la migración.
- **FR-030b**: La migración DEBE importar sin autor los registros cuyo alias no tenga titular identificado, y aquellos que no traigan alias, descartando el alias en bruto en lugar de almacenarlo. Un correo personal sin titular a quien corresponda es un dato personal sin finalidad, y conservarlo contradiría la minimización que exige el tratamiento de datos de menores.
- **FR-031**: Todo registro histórico que no pueda normalizarse con certeza DEBE quedar marcado como dato dudoso y excluible de los análisis, en lugar de descartarse silenciosamente.
- **FR-031a**: El sistema DEBE permitir importar archivos de hoja de cálculo con la estructura del histórico para cargas masivas, de forma repetible y no solo en la migración inicial.
- **FR-031b**: Toda importación DEBE aplicar las mismas validaciones y normalizaciones que el registro manual, y DEBE presentar una previsualización con los registros aceptados, los corregidos y los rechazados antes de confirmarse.
- **FR-031c**: El sistema DEBE detectar y evitar la duplicación de registros ya existentes al reimportar un archivo.

### Tableros de resultados

- **FR-032**: El sistema DEBE mostrar la evolución temporal de cada variable a lo largo de las jornadas registradas.
- **FR-033**: El sistema DEBE permitir comparar la misma variable entre distintos lugares de medición.
- **FR-034**: El sistema DEBE permitir filtrar por rango de fechas, por lugar y por variable, aplicando el filtro de forma consistente a todo el tablero.
- **FR-035**: El sistema DEBE clasificar los valores de calidad del aire según el **Índice de Calidad del Aire (ICA) colombiano de la Resolución 2254 de 2017**, la misma escala que usa SIATA, y DEBE mostrar la categoría resultante junto al valor numérico en todas las pantallas.
- **FR-035a**: La escala de categorías del ICA DEBE representarse con los colores de la barra del logo (FR-004), de modo que un mismo nivel se vea igual en el mapa, en los tableros y en las fichas.
- **FR-035b**: El sistema DEBE aplicar la clasificación del ICA únicamente a las variables que esa norma contempla —**PM2.5 y PM10**—, y NO DEBE inventar categorías de calidad del aire para las variables que la norma no cubre (PM1, HCHO, TVOC, CO₂, partículas por litro, temperatura y humedad).
- **FR-035c**: Para las variables sin categoría oficial, el sistema DEBE presentar el valor con su unidad y una referencia orientativa en lenguaje escolar, indicando explícitamente que no corresponde a una categoría normativa.
- **FR-035d**: El sistema DEBE distinguir entre el **AQI que reporta el propio medidor** —registrado como una variable más del instrumento— y el **ICA calculado por la aplicación** a partir de PM2.5 y PM10, sin mezclarlos ni presentarlos como si fueran lo mismo.
- **FR-035e**: El sistema DEBE mostrar en algún punto de la interfaz cuál es la norma de referencia usada, para que el dato sea verificable por un lector externo.
- **FR-036**: El sistema DEBE permitir exportar los datos filtrados en un formato abierto de hoja de cálculo.
- **FR-037**: El sistema DEBE indicar explícitamente la ausencia de datos en un rango en lugar de presentar una visualización vacía.

### Inventario de biodiversidad

- **FR-038**: El sistema DEBE permitir crear, editar, enviar a revisión, publicar y despublicar registros de biodiversidad a los integrantes autenticados.
- **FR-038a**: Cada registro de biodiversidad DEBE tener un estado explícito entre: **borrador**, **en revisión**, **publicado** y **despublicado**. Solo los registros en estado publicado son visibles en el mapa público.
- **FR-038b**: Un registro que nunca ha sido publicado DEBE pasar por aprobación del responsable del proyecto: el integrante lo envía a revisión y solo el responsable puede aprobarlo y publicarlo por primera vez.
- **FR-038c**: Una vez aprobado por primera vez, las ediciones posteriores del mismo registro DEBEN publicarse directamente sin nueva aprobación.
- **FR-038d**: Al rechazar un registro en revisión, el responsable DEBE poder dejar un motivo, y el registro DEBE volver a estado borrador visible para su autor con ese motivo.
- **FR-038e**: El integrante autor DEBE poder ver en todo momento el estado de cada uno de sus registros y cuáles están pendientes de revisión.
- **FR-038f**: El responsable DEBE poder ver en un solo lugar todos los registros pendientes de revisión, con su antigüedad.
- **FR-039**: Cada registro DEBE contener al menos una fotografía, una ubicación sobre el mapa del colegio, nombre común, nombre científico, categoría y descripción.
- **FR-040**: El sistema DEBE permitir tomar la fotografía directamente con la cámara del dispositivo móvil o cargarla desde el dispositivo.
- **FR-041**: El sistema DEBE impedir la publicación de registros incompletos, señalando con precisión los campos faltantes.
- **FR-042**: El sistema DEBE advertir cuando la ubicación marcada quede fuera de los límites del predio escolar representado en la imagen de fondo, e impedir marcar puntos fuera del área de esa imagen.
- **FR-042a**: El sistema NO DEBE depender del GPS del dispositivo para ubicar los registros; la ubicación se marca siempre a mano sobre la imagen.
- **FR-043**: El sistema DEBE registrar autoría y fecha de creación y de última modificación de cada registro de biodiversidad.
- **FR-044**: Los registros despublicados DEBEN dejar de ser visibles públicamente conservando su información para el equipo.

### Plataformas y experiencia

- **FR-045**: La aplicación DEBE ser un único sitio web que se adapte tanto a pantalla de computador como de celular, con paridad funcional para las tareas de consulta, registro y tableros. NO DEBEN existir versiones separadas que haya que mantener por aparte.
- **FR-045a**: Cualquier persona DEBE poder abrir el mapa público con un simple enlace, sin instalar nada.
- **FR-045b**: Los integrantes DEBEN poder instalar la aplicación en su celular como un ícono en la pantalla de inicio, que la abra a pantalla completa sin la barra del navegador.
- **FR-045c**: Una vez instalada, la aplicación DEBE abrir y permitir registrar mediciones aunque el dispositivo esté sin conexión.
- **FR-045d**: Las actualizaciones DEBEN llegar a todos los dispositivos sin que nadie tenga que reinstalar ni descargar nada manualmente.
- **FR-046**: La versión móvil DEBE ser utilizable con una sola mano para el registro en campo, con campos numéricos que abran teclado numérico.
- **FR-047**: Ninguna pantalla DEBE requerir desplazamiento horizontal de la página; el contenido ancho DEBE desplazarse dentro de su propio contenedor.
- **FR-048**: La interfaz DEBE estar íntegramente en español.
- **FR-049**: El contraste de texto y los objetivos táctiles DEBEN cumplir criterios de accesibilidad para uso escolar.

### Datos y privacidad

- **FR-050**: El sistema DEBE conservar el histórico completo de mediciones sin borrado automático mientras dure el proyecto escolar.
- **FR-051**: Los correos institucionales de los integrantes NO DEBEN exponerse en las vistas públicas, en ninguna circunstancia y sin excepción configurable.
- **FR-051a**: Cada ficha de biodiversidad DEBE tener un ajuste propio que determina si el nombre de su autor se muestra al público, decidido por el propio autor ficha por ficha.
- **FR-051b**: Ese ajuste DEBE venir desactivado por omisión: si el autor no elige nada, la ficha se publica sin nombre visible.
- **FR-051c**: El autor DEBE poder activar o desactivar la visibilidad de su nombre en cualquier momento, también después de publicada la ficha, y el cambio DEBE reflejarse de inmediato en la vista pública.
- **FR-051d**: El sistema DEBE impedir activar la visibilidad del nombre de un integrante menor de edad mientras el responsable no haya registrado que existe autorización de su acudiente para ese fin.
- **FR-051e**: El responsable DEBE poder consultar qué integrantes tienen autorización registrada y qué fichas están mostrando nombre de autor al público.
- **FR-051f**: Cuando una ficha no muestre el nombre de su autor, DEBE atribuirse visiblemente al equipo del proyecto, no quedar sin atribución alguna.
- **FR-051g**: La aplicación DEBE tener una página pública de créditos que presente al equipo NIDO PJB; incluir allí a un integrante DEBE regirse por la misma condición de autorización de FR-051d.
- **FR-052**: Las fotografías publicadas NO DEBEN incluir personas identificables sin autorización, y el sistema DEBE advertirlo al momento de publicar.
- **FR-053**: El sistema DEBE permitir exportar la totalidad de los datos del proyecto para respaldo o entrega institucional.

### Key Entities

- **Integrante**: miembro autorizado del equipo. Identificado por su correo institucional, con nombre, nivel de permiso, condición de mayor o menor de edad y marca de si tiene autorización de acudiente registrada para aparecer públicamente. Es autor de mediciones y de fichas de biodiversidad. Puede desactivarse conservando su autoría.
- **Lugar de medición**: espacio del colegio donde se toman lecturas (Taller de Mecánica Industrial, Taller de Mecánica Automotriz, Ebanistería, Artes Gráficas y el lugar hoy anotado como `Op`). Tiene nombre canónico y ubicación en el mapa.
- **Medidor**: equipo portátil de medición, con identidad única, número de serie y estado de disponibilidad. Un mismo equipo no puede tener dos identidades.
- **Jornada de medición**: sesión de trabajo de campo. Agrupa varias mediciones consecutivas y se asocia a un lugar, un medidor, una fecha y un integrante.
- **Medición**: lectura individual dentro de una jornada. Contiene la hora y las diez variables ambientales, cada una con valor numérico o marca explícita de no medida.
- **Registro de biodiversidad**: organismo documentado por los estudiantes. Contiene fotografía, ubicación marcada a mano sobre la imagen aérea del colegio, nombre común, nombre científico, categoría, descripción, estado de publicación (borrador, en revisión, publicado o despublicado), autoría y el ajuste de si esa autoría se muestra al público.
- **Imagen base del mapa**: toma aérea de dron del predio escolar que sirve de fondo al mapa. Tiene una versión vigente y define el sistema de referencia sobre el que se posicionan todos los puntos.
- **Vista inmersiva**: material navegable asociado a un punto concreto del mapa. Tiene un tipo (panorámica 360°, foto de alto detalle o video), un origen (dron o dispositivo móvil) y el punto al que pertenece. Es opcional: un punto puede no tener ninguna.
- **Punto destacado de contaminación**: lugar de medición que el responsable ha marcado manualmente para resaltarlo en el mapa público. Guarda quién lo marcó y cuándo.
- **Categoría de biodiversidad**: clasificación usada para filtrar el mapa (por ejemplo árbol, arbusto, ave, insecto, planta ornamental).
- **Categoría ICA**: nivel de calidad del aire según la escala de la Resolución 2254 de 2017, con su nombre, su rango de valores y su color. Se calcula a partir de PM2.5 y PM10, y es distinta del AQI que reporta el medidor.
- **Punto de interés didáctico**: la estación meteorológica fija del parque San José y cada instrumento construido por los estudiantes, con foto, variable asociada y explicación.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante sin cuenta abre el mapa y consulta la ficha completa de una especie en menos de 30 segundos desde que entra a la aplicación, sin ver ninguna pantalla de inicio de sesión.
- **SC-002**: El mapa muestra sus puntos y queda utilizable en menos de 3 segundos en una conexión móvil típica del colegio, sin importar el peso total de las tomas de dron.
- **SC-002a**: Abrir el mapa no descarga ningún material de vista inmersiva; solo se trae el de la vista que el visitante decide abrir.
- **SC-002b**: Una vista inmersiva abre y queda navegable en menos de 5 segundos en una conexión móvil típica del colegio.
- **SC-002c**: Todo punto del mapa sin material inmersivo se abre y se usa con normalidad; una revisión de todos los puntos arroja cero espacios vacíos y cero errores.
- **SC-003**: Los 10 integrantes logran iniciar sesión con su correo institucional al primer intento, sin asistencia técnica.
- **SC-004**: Un integrante registra una medición completa de once variables en menos de 60 segundos desde el celular, estando de pie en el sitio de medición.
- **SC-005**: Una jornada completa de 7 mediciones se registra en menos de 10 minutos de trabajo efectivo, frente al proceso actual de formulario y consolidación manual.
- **SC-006**: El 100 % de los valores numéricos almacenados quedan como números, sin ningún registro con símbolos o texto en campos numéricos.
- **SC-007**: Los registros históricos que traen lugar y medidor —98 de los 135 del archivo— quedan disponibles en la aplicación, normalizados, en 15 jornadas. Los 37 restantes no se importan y quedan enumerados con su motivo, de modo que 98 + 37 devuelve exactamente el conteo del archivo de origen y ningún registro desaparece sin dejar rastro.
- **SC-008**: Cero medidores con identidad duplicada y cero lugares con variantes de nombre tras la migración.
- **SC-009**: Un integrante obtiene la comparación de una variable entre dos lugares en un rango de fechas en menos de 4 interacciones.
- **SC-010**: Un integrante prepara y envía a revisión una ficha de biodiversidad con foto y ubicación en menos de 3 minutos desde el celular, y el punto aparece en el mapa público en el momento en que el responsable la aprueba.
- **SC-010a**: El responsable revisa y resuelve una ficha pendiente en menos de 1 minuto desde que la abre, y ninguna ficha lleva más de una semana esperando revisión.
- **SC-010b**: Ninguna ficha muestra el nombre de su autor al público sin que ese autor lo haya activado explícitamente y tenga autorización registrada; una revisión de todas las fichas publicadas arroja cero excepciones.
- **SC-010c**: Un estudiante activa o retira la visibilidad de su nombre en una ficha en menos de 3 interacciones, y el cambio se ve en la vista pública de inmediato.
- **SC-011**: Las mediciones registradas sin conexión se sincronizan al 100 % al recuperar conexión, sin duplicados ni pérdidas, incluso si la aplicación se cerró o el dispositivo se reinició entre tanto.
- **SC-011a**: Un integrante instala la aplicación en su celular en menos de 1 minuto y sin ayuda, y a partir de ahí la abre desde el ícono de su pantalla de inicio.
- **SC-011b**: Una jornada completa de 7 mediciones se registra íntegramente en modo avión y se sincroniza sin pérdida al restablecer la conexión.
- **SC-012**: Un estudiante ajeno al proyecto entiende, solo con lo que ve en la aplicación, qué variable mide cada instrumento didáctico y si un valor de calidad del aire es bueno o malo.
- **SC-012a**: La categoría de calidad del aire que muestra la aplicación para un valor dado de PM2.5 o PM10 coincide exactamente con la que arroja la tabla del ICA de la Resolución 2254 de 2017, comprobado sobre al menos un valor por cada categoría de la escala.
- **SC-012b**: Ninguna variable ajena al ICA (PM1, HCHO, TVOC, CO₂, partículas por litro, temperatura, humedad) aparece con una categoría de calidad del aire; una revisión de todas las pantallas arroja cero casos.
- **SC-013**: Todas las pantallas se usan sin desplazamiento horizontal en un teléfono de 360 px de ancho.
- **SC-014**: El equipo agrega o revoca un integrante sin necesidad de intervención de un desarrollador.
- **SC-015**: Una importación de hoja de cálculo muestra su previsualización de aceptados, corregidos y rechazados antes de confirmarse, y reimportar el mismo archivo no genera ni un solo registro duplicado.
- **SC-016**: Tras la migración están las 98 mediciones históricas que traían lugar y medidor, en 15 jornadas, cada una con su fecha, hora, lugar, medidor y valores. Las 79 cuyo alias tiene titular identificado quedan atribuidas a su integrante por correo institucional; las 19 restantes quedan sin autor de forma explícita y consultable, y de ninguna de ellas se conserva el alias de correo personal. Las 37 rechazadas por falta de lugar y medidor aparecen enumeradas con su motivo en el informe de la migración.

---

## Assumptions

- **A-001**: El nombre **NIDO PJB** queda decidido; el logo actual (ave multicolor y barra de calidad del aire) se conserva y solo cambia el texto de la marca.
- **A-002**: El archivo `APPIdea.png` mencionado en la solicitud no está presente en el proyecto; la especificación se construyó sin él. Si contiene un boceto de la interfaz, deberá revisarse antes de la fase de diseño.
- **A-003**: El equipo del proyecto son 10 personas: los 7 estudiantes que ya aparecen tomando mediciones en el histórico más 3 integrantes adicionales.
- **A-004**: El correo `luis.tapia@udea.edu.co` presente en el archivo corresponde a un acompañante académico externo y no a un integrante escolar del equipo.
- **A-005**: Los datos de mediciones son de carácter escolar y público; no contienen información personal sensible más allá de la autoría de cada registro.
- **A-005a**: Se asume que la mayoría de los 10 integrantes son menores de edad. La recolección y custodia de las autorizaciones de los acudientes es responsabilidad del colegio; la aplicación solo registra si esa autorización existe y condiciona a ella la exposición pública del nombre (FR-051d).
- **A-006**: El colegio cuenta con correos institucionales para los 10 integrantes. La aplicación se publicará en el **dominio raíz** **institutopedrojustoberrio.com** —decisión confirmada por el equipo el 2026-08-31—, con `www` redirigiendo a él. Apuntar los registros A y CNAME no afecta a los MX, así que el correo institucional del dominio sigue funcionando igual. El dominio de los correos institucionales se asume `@salesianos.edu.co` —el que usa hoy el equipo docente y con el que se solicitó este trabajo—; si el colegio emite las cuentas del proyecto bajo `@institutopedrojustoberrio.com`, basta cambiar el valor configurable de FR-011 sin ningún otro ajuste a la especificación.
- **A-006a**: ~~El responsable del proyecto entregará antes de la migración dos listas: los 10 correos institucionales autorizados y la correspondencia entre los alias personales del histórico y sus titulares.~~ **Resuelto el 2026-09-02.** Se entregaron los 10 correos institucionales. De los 8 alias del archivo, 5 tienen titular identificado; 2 no lo tienen y el equipo decidió importar sus mediciones sin autor (FR-030b); el octavo resultó ser un correo externo de la hoja en bruto, que la importación no lee.
- **A-007**: SIATA se usa como referente de contexto y contenido pedagógico; esta especificación no asume ninguna integración automática con sus servicios. La escala de clasificación sí se alinea con la suya: el ICA de la Resolución 2254 de 2017 (FR-035).
- **A-007a**: El AQI que traen los medidores portátiles se conserva tal cual como dato del instrumento, pero no se asume que coincida con el ICA colombiano: los equipos suelen calcularlo con la escala estadounidense de la EPA. Por eso ambos se muestran por separado (FR-035d).
- **A-008**: La maqueta de la estación fija y los instrumentos de plástico son objetos físicos que se representan en la aplicación como contenido explicativo, no como fuentes de datos automatizadas.
- **A-009**: Las jornadas seguirán realizándose de forma manual con medidores portátiles; no se asume ningún sensor conectado que envíe datos por sí solo.
- **A-010**: El mapa se apoya en **tomas aéreas de dron sobre el colegio, realizadas por el propio proyecto**. Al ser material propio, no hay dependencia de proveedores externos de cartografía, ni costos de licencia, ni restricciones de uso; y al no usarse un servicio de mapas con coordenadas geográficas, tampoco hay captura automática por GPS. Las tomas de dron son un insumo previo al desarrollo del mapa y su calidad condiciona directamente la del producto final.
- **A-010a**: Además de la vista aérea general, el proyecto dispone de material de dron con el que se ofrecerá una **navegación inmersiva en puntos seleccionados** —no en todo el predio—, concretamente donde haya registros de biodiversidad o niveles altos de contaminación.
- **A-010b** ~~(supuesto corregido el 2026-08-31)~~: se asumía que un dron solo podía captar la cubierta de los talleres y que sus interiores habría que grabarlos con celular. **El inventario del material lo desmiente**: `TomaTalleres.mp4` es un vuelo FPV que recorre por dentro la nave del Taller de Mecánica Industrial. El dron sí entra. Quedan sin material los otros tres talleres (Automotriz, Ebanistería, Artes Gráficas). Ver `docs/inventario-dron.md`.
- **A-010c** ~~(resuelto el 2026-08-31)~~: el inventario del material está hecho. **El formato es `video`**: los seis archivos son 1920×1080 H.264 convencional, sin metadatos esféricos, así que `panorama_360` NO es posible con el material actual. Hay 10 clips generados en `public/inmersivas/`. Ver `docs/inventario-dron.md`.
- **A-010e**: **La imagen base del mapa es el sistema de coordenadas del proyecto, no un fondo decorativo.** Las coordenadas relativas 0–1 sobreviven a un cambio de resolución pero NO a un cambio de encuadre, altura o ángulo. Si se marcan fichas sobre una imagen y luego se sustituye por otra tomada desde otro punto de vista, todos los puntos quedan en sitios arbitrarios y hay que recolocarlos a mano. Por tanto la ortofoto definitiva debe fijarse ANTES de documentar la primera especie. Es la decisión menos reversible del proyecto.
- **A-010f**: El material de dron actual **no sirve como imagen base**: ninguna de las seis tomas es cenital y ninguna cubre el predio completo. Hace falta un vuelo nuevo con el gimbal a −90°, o una ortofoto pública de GeoMedellín. Ver `docs/inventario-dron.md`.
- **A-010d**: El mapa público muestra qué lugares están marcados como de alta contaminación y su categoría cualitativa, pero **los valores detallados y los tableros siguen requiriendo sesión iniciada** (FR-015). Señalar públicamente que un taller del colegio tiene aire dañino es una decisión con implicaciones institucionales; se asume el criterio conservador y conviene que el colegio lo confirme antes de publicar.
- **A-011**: El volumen de datos previsible es pequeño (cientos de mediciones por año escolar y decenas de fichas), sin exigencias de alto rendimiento.
- **A-012**: El proyecto es un trabajo escolar continuado; la plataforma debe ser mantenible por estudiantes y docentes tras la entrega inicial.

---

## Out of Scope

- Ingesta automática de datos desde sensores conectados o desde los servicios de SIATA.
- Registro público abierto: ninguna persona ajena al equipo crea cuenta por sí misma.
- Aplicaciones nativas empaquetadas y publicadas en tiendas (Google Play, App Store) o instaladores de escritorio para Windows.
- Comentarios, valoraciones o cualquier interacción social de los visitantes sobre el mapa.
- Traducción de la interfaz a otros idiomas.
- Identificación automática de especies a partir de la fotografía.
- Notificaciones o alertas automáticas por superación de umbrales de calidad del aire.
- Integración con plataformas académicas del colegio o con sistemas de calificación.

---

## Decisiones Tomadas

Resueltas por el equipo el 2026-08-28.

| # | Decisión | Efecto en la especificación |
|---|----------|------------------------------|
| 1 | El proyecto se llama **NIDO PJB** — *Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío*. Se conserva el logo actual y solo cambia el texto de la marca. | FR-001, FR-002, A-001 |
| 2 | Acceso restringido por correo institucional. El responsable del proyecto da de alta manualmente a los 10 integrantes; no hay autorregistro. Los alias personales del histórico con titular identificado se vinculan a su correo institucional; los que no lo tienen se descartan y sus mediciones quedan sin autor. La aplicación se publica en **institutopedrojustoberrio.com**. | FR-011, FR-013, FR-013a, FR-030, FR-030a, FR-030b, A-006, A-006a |
| 3 | La aplicación **reemplaza** el formulario en línea actual: todas las mediciones nuevas se registran en ella. Además conserva la importación de hojas de cálculo como vía de respaldo permanente para cargas masivas. | FR-028 a FR-031c, SC-015 |

### Pendientes de entrega del equipo (datos, no decisiones)

Ninguno bloquea la planeación, pero los tres se necesitan antes de migrar:

1. ~~La lista de los **10 correos institucionales** autorizados.~~ Entregada el 2026-09-02.
2. ~~La **correspondencia** entre los alias del histórico y sus titulares.~~ Resuelta el 2026-09-02: 5 vinculados, 2 sin titular (FR-030b), 1 que no era un alias de estudiante.
3. El nombre real del lugar anotado como **`Op`** en 12 registros históricos. *(Los 12 son de un alias sin titular, así que se importarán sin autor pero siguen necesitando el nombre del lugar.)*
4. El **inventario del material de dron**: qué tomas existen, en qué formato (panorámica 360°, foto, video), de qué puntos del colegio y con qué resolución. De ahí sale la elección de formato de las vistas inmersivas (A-010c) y la toma que servirá de imagen base del mapa.
5. La confirmación institucional de si el mapa público puede señalar talleres del colegio como puntos de alta contaminación (A-010d).

Adicionalmente, el archivo `APPIdea.png` referenciado en la solicitud original no se encontró en el proyecto (ver A-002); si contiene un boceto de la interfaz, conviene aportarlo antes de la fase de diseño.
