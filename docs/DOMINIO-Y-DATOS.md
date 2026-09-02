# Dónde vive la aplicación y dónde viven los datos

Respuesta a dos preguntas concretas: en qué dirección queda NIDO PJB y dónde
se guardan los datos.

---

## Resumen

| | Dónde | Costo |
|---|---|---|
| **La aplicación** (páginas, mapa, formularios) | Vercel | Gratis |
| **Los datos** (fichas, mediciones, cuentas) | Supabase | Gratis |
| **Las fotos** de las fichas | Supabase Storage | Gratis |
| **Las teselas del mapa y los clips** | Vercel, como archivos estáticos | Gratis |
| **El dominio** | El que ya tienen, en cPanel | Ya pagado |

**El hosting de cPanel se queda como está.** No se cancela ni se toca: solo se
cambia a dónde apunta una dirección DNS.

---

## 1. ¿Por qué Vercel y no el cPanel que ya tienen?

NIDO PJB está hecho con Next.js, que necesita **un servidor Node.js
ejecutándose de forma continua** para tres cosas:

- El middleware que protege las rutas privadas y refresca la sesión.
- Las acciones de servidor (aprobar una ficha, registrar una autorización).
- El renderizado en servidor de las páginas que dependen de quién las mira.

El cPanel del colegio corre **LiteSpeed**, pensado para PHP y para archivos
estáticos. Algunos planes compartidos permiten aplicaciones Node, pero en la
práctica dan problemas con las versiones, los reinicios y la memoria, y quien
tenga que mantener esto en dos años se lo encontraría roto sin saber por qué.

Vercel está hecho por el mismo equipo que Next.js. El plan gratuito cubre de
sobra un proyecto escolar: 100 GB de transferencia al mes, HTTPS incluido y
despliegue automático cada vez que se sube un cambio a GitHub.

> El cPanel sigue sirviendo para lo que ya hace: el correo institucional y
> cualquier otro sitio que el colegio quiera alojar ahí.

---

## 2. ¿Dominio raíz o subdominio?

### Lo que hay hoy

Verifiqué el dominio antes de recomendar nada:

| Dirección | Qué sirve ahora |
|---|---|
| `institutopedrojustoberrio.com` | **Nada.** Un listado de carpetas («Index of /») con `cgi-bin` y `wp` |
| `institutopedrojustoberrio.com/wp/` | Un WordPress **vacío**: «My Blog – My WordPress Blog», con la entrada de ejemplo sin editar |
| `social.institutopedrojustoberrio.com` | Subdominio aparte, con su propia carpeta |
| `virtual.institutopedrojustoberrio.com` | Subdominio aparte, con su propia carpeta |

**El dominio raíz está libre.** No hay ningún sitio institucional que se pueda
romper: hoy muestra un listado de directorios, que además conviene quitar
—deja ver la estructura del servidor a cualquiera—.

### La decisión

Va en el **dominio raíz**, como pidieron. Es viable porque no hay nada real
que reemplazar.

**Lo único que conviene tener en cuenta**: si algún día el colegio quiere una
página institucional en `institutopedrojustoberrio.com`, habría que mover NIDO
PJB a un subdominio, y todos los enlaces que los estudiantes hayan compartido
dejarían de funcionar.

Si eso llegara a pasar, la alternativa que menos rompe es un subdominio desde
el principio —`nido.institutopedrojustoberrio.com`—, siguiendo el patrón que
ya usan con `social.` y `virtual.`. La aplicación funciona igual en cualquiera
de los dos: solo cambia una variable.

Queda anotado; la decisión tomada es el dominio raíz.

---

## 3. Pasos para el dominio, en cPanel

La aplicación se despliega primero en Vercel (bloque 4.1 y 4.2 de
[PASO-A-PASO.md](./PASO-A-PASO.md)). Después:

### 3.1 Añadir el dominio en Vercel

**Vercel → el proyecto → Settings → Domains**, y añadir los dos:

1. `institutopedrojustoberrio.com`
2. `www.institutopedrojustoberrio.com`

Vercel mostrará entonces **los valores DNS exactos** que hay que crear. Anótelos:
suele ser `76.76.21.21` para el registro A, pero **haga caso a lo que muestre
Vercel**, no a esta guía, porque a veces asigna direcciones distintas.

### 3.2 Cambiar el DNS en cPanel

En cPanel: **Dominios → Zone Editor** (o «Editor de zona DNS»), y en
`institutopedrojustoberrio.com` → **Administrar**.

| Acción | Tipo | Nombre | Valor |
|---|---|---|---|
| **Editar** el que ya existe | `A` | `institutopedrojustoberrio.com` | El valor que muestre Vercel |
| **Editar** el que ya existe | `CNAME` | `www` | `cname.vercel-dns.com` |

### 3.3 Lo que NO hay que tocar

Esto es lo importante:

- **Los registros `MX`.** Son los del correo institucional. Si los cambia, el
  colegio deja de recibir correo. No se tocan.
- **Los registros `TXT`** (SPF, DKIM, verificaciones). También son del correo.
- **`social.` y `virtual.`** Cada subdominio tiene su propio registro en la
  zona DNS. Cambiar el del dominio raíz no los afecta: siguen sirviendo desde
  cPanel exactamente igual.

Solo se cambia la dirección del dominio raíz y la de `www`.

### 3.4 Esperar y comprobar

Los cambios de DNS tardan entre unos minutos y unas horas. Vercel emite el
certificado HTTPS solo, sin costo, en cuanto detecta los registros.

Cuando en Vercel el dominio aparezca con un visto verde, abra
`https://institutopedrojustoberrio.com`: debe verse NIDO PJB.

### 3.5 Después: quitar el listado de directorios

Aunque el dominio ya apunte a Vercel, conviene arreglar lo que quedó en
cPanel. En **Índices** (o «Indexes») desactive el listado de directorios: hoy
cualquiera puede ver la estructura de carpetas del servidor.

---

## 4. Dónde viven los datos: Supabase

### 4.1 Por qué Supabase y no la base de datos de cPanel

El cPanel incluye MySQL, que serviría para guardar filas. Pero el proyecto
necesita tres cosas más que MySQL no da por sí solo:

**Seguridad a nivel de fila (RLS).** Es lo que hace que el mapa sea público y
las mediciones no, expresado como reglas de la base de datos y no como
condicionales repartidos por el código. Si mañana alguien se equivoca al
escribir una pantalla, PostgreSQL sigue negando el acceso. Con MySQL habría
que confiar en que nadie se olvide nunca de comprobar los permisos.

**Autenticación por enlace mágico**, sin contraseñas que gestionar. Importa
tratándose de menores de edad: nada que olvidar, nada que reutilizar de otro
sitio, nada que filtrar.

**Almacenamiento de fotos** con permisos, para las fichas de biodiversidad.

Supabase da las tres en un solo servicio. Para un equipo escolar, un servicio
en lugar de cuatro es la diferencia entre mantenible y abandonado.

### 4.2 Crear el proyecto

1. Entrar a [supabase.com](https://supabase.com) y crear una cuenta.
   Conviene usar un correo **institucional** y no personal: el proyecto debe
   sobrevivir a que un estudiante se gradúe.
2. **New project**:
   - **Name**: `nido-pjb`
   - **Database Password**: genérela y **guárdela en un lugar seguro**. No se
     puede recuperar después.
   - **Region**: **South America (São Paulo)** — la más cercana a Medellín.
3. Esperar unos dos minutos.

### 4.3 Crear las tablas

**SQL Editor → New query.** Copiar y pegar el contenido de estos cinco
archivos, **uno por uno y en este orden**, ejecutando cada uno antes de pasar
al siguiente:

| # | Archivo | Qué crea |
|---|---|---|
| 1 | `supabase/migrations/0001_esquema_inicial.sql` | Las 15 tablas |
| 2 | `supabase/migrations/0002_disparadores.sql` | Las reglas de integridad |
| 3 | `supabase/migrations/0003_rls_y_vistas.sql` | Los permisos y las vistas públicas |
| 4 | `supabase/migrations/0004_vista_integrantes_y_storage.sql` | Vista del equipo, almacenamiento de fotos |
| 5 | `supabase/seed/catalogos.sql` | Lugares, medidores y categorías |

> **El orden importa.** El paso 5 crea la fila de configuración con el dominio
> institucional, y los disparadores del paso 2 la consultan.

Si algún paso da error, **pare**: no siga con el siguiente. Los pasos
posteriores dependen de que el anterior haya funcionado.

### 4.4 Configurar el acceso — el paso que más se olvida

**Authentication → URL Configuration:**

| Campo | Valor |
|---|---|
| **Site URL** | `https://institutopedrojustoberrio.com` |
| **Redirect URLs** | `https://institutopedrojustoberrio.com/**` |
| | `https://*.vercel.app/**` |
| | `http://localhost:3000/**` |

**Si esto se queda en `localhost`, nadie puede entrar.** El correo con el
enlace llega bien, el enlace parece correcto, y al abrirlo desde el celular no
lleva a ninguna parte. No aparece ningún error que lo explique. Es el fallo
más silencioso de todo el despliegue.

También en **Authentication → Providers → Email**: desactivar
**«Enable sign ups»**. No debe haber autorregistro; el alta la hace el
responsable.

### 4.4b ⚠️ Configurar el envío de correo — SIN ESTO NADIE PUEDE ENTRAR

Supabase trae un servicio de correo propio, pero **no sirve para este
proyecto**. Su documentación lo dice: está pensado solo para explorar y
probar. Tiene dos límites que lo hacen inservible aquí:

| Límite | Consecuencia |
|---|---|
| **2 correos por hora** | Al tercer intento aparece `email rate limit exceeded` |
| **Solo entrega a miembros del equipo de Supabase** | Las invitaciones a los estudiantes **nunca llegan**, aunque el panel diga que se enviaron |

Y como el acceso a NIDO PJB es por enlace mágico —un correo por cada inicio de
sesión—, sin SMTP propio **ningún integrante puede entrar nunca**.

Con SMTP propio el límite sube a 30 correos por hora, ajustable. Para 10
personas sobra.

#### Opción A: usar el correo del colegio (recomendada)

El cPanel ya incluye correo en el dominio propio. Además de resolver el
problema, hace que los correos lleguen desde `@institutopedrojustoberrio.com`,
que a un acudiente le genera mucha más confianza que un remitente de
`supabase.co`.

**1. En cPanel** → *Cuentas de correo* → *Crear*:

- Dirección: `noreply@institutopedrojustoberrio.com`
- Contraseña: genérela y guárdela

**2. En esa cuenta** → botón *Conectar dispositivos* (o *Connect Devices*).
cPanel muestra ahí los datos exactos de su servidor. Normalmente son:

| Dato | Valor típico |
|---|---|
| Servidor saliente (SMTP) | `mail.institutopedrojustoberrio.com` |
| Puerto | `465` con SSL, o `587` con STARTTLS |
| Usuario | `noreply@institutopedrojustoberrio.com` (la dirección completa) |
| Contraseña | La que acaba de crear |

> **Use los valores que muestre cPanel, no los de esta tabla.** Cada servidor
> puede tener un nombre distinto.

**3. En Supabase** → *Project Settings → Authentication → SMTP Settings* →
activar *Enable Custom SMTP* y rellenar:

| Campo | Valor |
|---|---|
| Sender email | `noreply@institutopedrojustoberrio.com` |
| Sender name | `NIDO PJB` |
| Host | El que muestre cPanel |
| Port number | `465` |
| Username | `noreply@institutopedrojustoberrio.com` |
| Password | La de la cuenta de correo |

**4. Guardar** y enviarse una invitación de prueba a sí mismo para comprobar
que llega.

#### Opción B: un servicio de correo transaccional

Si el correo del cPanel no funciona —algunos alojamientos compartidos bloquean
el envío desde servidores externos, o su reputación de IP hace que los correos
caigan en la carpeta de no deseado—, use un servicio gratuito:

| Servicio | Plan gratuito |
|---|---|
| [Resend](https://resend.com) | 3.000 correos al mes, 100 al día |
| [Brevo](https://brevo.com) | 300 correos al día |

Ambos dan los mismos cuatro datos (host, puerto, usuario, contraseña) que se
pegan igual en Supabase. Resend además permite verificar el dominio del
colegio para que el remitente siga siendo `@institutopedrojustoberrio.com`.

#### Mientras tanto: dar de alta sin enviar correo

Para no gastar la cuota durante la configuración inicial, las cuentas se
pueden crear **sin enviar ninguna invitación**:

**Authentication → Users → Add user → Create new user**

- Escriba el correo institucional
- Marque **Auto Confirm User**
- Ponga cualquier contraseña: la aplicación no la usa, entra por enlace mágico

Esto crea la cuenta al instante, sin correo y sin tocar el límite. Sirve para
dejar listas las 10 cuentas mientras se resuelve el SMTP.

> Las invitaciones que hayan quedado en «Waiting for verification» sin haber
> configurado SMTP **no llegaron**. Bórrelas y vuelva a crear esas cuentas con
> *Create new user*.

---

### 4.5 Dar de alta a las 10 personas

Por cada integrante, dos pasos:

1. **Authentication → Users → Add user → Create new user**, con su correo
   institucional y **Auto Confirm User** marcado. (Si ya configuró el SMTP del
   paso 4.4b, también sirve *Invite user*.)
2. **Table Editor → `integrante` → Insert row**:
   - `id`: el mismo UUID del usuario recién creado (se copia de la lista de Users)
   - `correo`: el mismo correo
   - `nombre`: su nombre visible
   - `rol`: `integrante`, o `responsable` para quien apruebe las fichas
   - `es_menor_edad`: `true` para los estudiantes
   - `autorizacion_acudiente`: `false` hasta que exista la autorización firmada

**Debe haber al menos un `responsable`.** La base de datos impide quedarse sin
ninguno: es quien aprueba la primera publicación de cada ficha.

> Estos dos pasos se hacen en el panel a propósito. Crear cuentas desde la
> propia aplicación exigiría darle la clave de servicio de Supabase, que
> sortea todos los permisos de la base de datos. Un fallo en el código dejaría
> de estar contenido.

### 4.6 Conectar la aplicación con la base de datos

**Project Settings → API.** Copiar dos valores:

- **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
- **anon public** → una cadena larga que empieza por `eyJ...`

**En Vercel** → Settings → Environment Variables, añadir tres:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | El Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave `anon public` |
| `NEXT_PUBLIC_URL_SITIO` | `https://institutopedrojustoberrio.com` |

Después, **Deployments → el último → Redeploy**: las variables solo se aplican
en un despliegue nuevo.

**Para desarrollo en su computador**, cree `.env.local` con las mismas tres,
pero con `NEXT_PUBLIC_URL_SITIO=http://localhost:3000`.

> ⚠️ **La clave `service_role` NO se configura en Vercel.** Es la que sortea
> todos los permisos. Solo se usa a mano, desde su computador, para el script
> de migración del histórico.

---

## 5. Comprobar que todo quedó bien

### 5.1 Verificación automática

Antes que nada, un solo comando comprueba las tablas, los catálogos y —lo más
importante— **que los permisos protejan de verdad lo que deben proteger**:

```powershell
pnpm verificar
```

Usa la clave anónima, la misma que tendría cualquier persona en internet, y
comprueba que no puede leer las mediciones ni los correos del equipo. Si algo
sale marcado con ✖, dice exactamente qué migración volver a ejecutar.

### 5.2 Comprobación manual

Después, en este orden:

1. **`https://institutopedrojustoberrio.com` abre NIDO PJB** con candado de
   HTTPS.
2. **`https://www.institutopedrojustoberrio.com` redirige** al anterior.
3. **El correo institucional sigue llegando.** Envíese un correo de prueba.
4. **El mapa se ve sin iniciar sesión**, desde una ventana de navegación
   privada.
5. **Pida un enlace de acceso** con un correo institucional dado de alta.
   Mire la dirección del botón en el correo: debe empezar por
   `https://institutopedrojustoberrio.com/auth/callback`. Si empieza por
   `http://localhost`, falta el paso 4.4.
6. **Ejecute las pruebas de seguridad** con `pnpm test`. Las tres
   comprobaciones críticas —que un visitante no pueda leer las mediciones, que
   ningún correo salga en las páginas públicas, y que el mapa no pida cuenta—
   solo se pueden ejecutar con la base de datos en marcha. **Hasta ahora nunca
   se han ejecutado.**

---

## 6. Qué pasa si algo falla

| Síntoma | Causa casi segura |
|---|---|
| El dominio sigue mostrando el listado de carpetas | El DNS aún no propaga, o el registro `A` no se editó |
| Vercel dice «Invalid Configuration» | El registro `A` no coincide con el que pide Vercel |
| Sale un error de certificado | Aún no se ha emitido; espere unos minutos |
| El enlace de acceso lleva a localhost | Falta el paso 4.4 en Supabase |
| `email rate limit exceeded` al invitar | Falta el SMTP propio: paso 4.4b |
| La invitación dice «enviada» pero no llega | El servicio integrado solo entrega a miembros del equipo de Supabase. Paso 4.4b |
| Nadie recibe el enlace de acceso | Ídem: sin SMTP propio la aplicación no puede enviar correo |
| Nadie puede entrar y el enlace se ve bien | El correo no está en la tabla `integrante`, o `activo` es `false` |
| El mapa dice «aún no está disponible» | Falta la ortofoto: es correcto hasta que se vuele el dron |
| El correo institucional dejó de llegar | Se tocaron los registros `MX`. Restáurelos de inmediato |
