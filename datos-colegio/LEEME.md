# Datos del colegio

Esta carpeta guarda datos personales del equipo. **Nada de aquí se sube al
repositorio**, salvo la plantilla de ejemplo y este archivo.

Está en `.gitignore` porque el repositorio es público y contiene correos
institucionales de menores de edad.

## Cómo dar de alta al equipo

1. Copiar `equipo.ejemplo.csv` con otro nombre en esta misma carpeta, por
   ejemplo `equipo.csv`.
2. Rellenarlo con los datos reales.
3. Ejecutar: `pnpm cargar-equipo`

El script acepta cualquier `.csv` de esta carpeta que no sea la plantilla, así
que el nombre exacto da igual mientras haya solo uno.

### Las columnas

| Columna | Qué va | Valores |
|---|---|---|
| `correo` | El correo institucional | Debe ser del dominio configurado |
| `nombre` | Nombre visible en la aplicación | |
| `rol` | Qué puede hacer | `responsable` o `integrante` |
| `menor_edad` | Si es menor de edad | `si` o `no` |
| `alias_historico` | Su alias en `MEDIDORES.xlsx` | Vacío si no midió antes |

**Debe haber al menos un `responsable`**: es quien aprueba la primera
publicación de cada ficha de biodiversidad. Normalmente el docente.

### Sobre `alias_historico`

Es la columna que conecta cada persona con las mediciones que ya hizo. En el
archivo histórico las mediciones están firmadas con alias de correo personal;
esta columna dice cuál corresponde a cada estudiante.

Los siete alias reales están en la hoja `LongData` de `MEDIDORES.xlsx`, columna
**«Nombre del que midió»**. Ábrala y cópielos desde ahí.

> **No se transcriben en este archivo a propósito.** Son identificadores de
> cuentas personales de menores de edad, y este archivo sí se versiona en un
> repositorio público. En la plantilla aparecen como `alias-1`, `alias-2`…
> únicamente para mostrar la forma de la columna.

Quien no haya medido antes deja la columna vacía.

## Qué NO poner aquí

Nada que no sea estrictamente necesario para dar de alta al equipo. En
concreto:

- No hacen falta documentos de identidad ni fechas de nacimiento. La columna
  `menor_edad` con `si`/`no` es suficiente.
- Las autorizaciones firmadas de los acudientes **las custodia el colegio**,
  no esta carpeta. La aplicación solo registra que existen, desde
  `/admin/autorizaciones`.
