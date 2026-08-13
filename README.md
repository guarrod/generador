# Generador Pro — Banco Guayaquil

Herramienta interna para armar archivos TXT de carga masiva. Se llenan los
datos en una grilla tipo hoja de cálculo (con validación en vivo) y se descarga
el archivo con el formato que espera cada proceso del banco.

Es una app estática: HTML + CSS + JavaScript vanilla, sin build ni backend.
Todo corre en el navegador y los datos quedan en `localStorage` — nada se envía
a ningún servidor.

## Cómo correrlo

Abrí [`index.html`](index.html) en el navegador. Nada más.

Si preferís servirlo (o vas a publicarlo), cualquier servidor estático sirve:

```bash
python -m http.server 8000
# → http://localhost:8000
```

> Tailwind, Lucide y la fuente Nunito Sans se cargan por CDN, así que hace
> falta conexión a internet la primera vez.

## Verificar un cambio

```bash
node tests/run.js     # o npm test
```

Sin dependencias: no hace falta `npm install`. Las suites comprueban las reglas
de validación y, sobre todo, la línea que sale al archivo — que es lo que el
banco rechaza si se rompe y lo único que no se nota mirando la pantalla. Detalle
en [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Deploy

Es un sitio estático: alcanza con servir la carpeta desde cualquier servidor.

Hay un script que publica por SSH. La configuración es local y no se versiona:

```bash
cp deploy.env.example deploy.env   # completar con el host y los directorios

./deploy.sh            # main → producción
./deploy.sh preview    # la rama actual → la URL de vista previa
```

Los dos modos hacen lo mismo: `git push` de la rama y después `git pull` en el
servidor, que tiene que ser un clon git de este mismo repo. La diferencia es a
qué directorio y con qué rama.

**La vista previa** sirve para mostrar una rama sin tocar producción — por
ejemplo la entrega siguiente, mientras se revisa. Publica **la rama en la que
estés parado**, y si cambiás de rama la preview la sigue. Se apoya en un segundo
clon en el servidor, que se crea una sola vez (ver `deploy.env.example`); a
partir de ahí el script lo mantiene al día.

Los dos avisan si hay cambios sin commitear, porque lo que se publica es el
commit y no lo que tenés en el editor.

## Generadores disponibles

Se eligen con las pestañas de arriba. Cada uno guarda sus datos por separado, así
que se puede saltar de uno a otro sin perder nada.

### 1. Pago de Servicios

Genera el archivo de carga masiva de servicios: una línea por registro, campos
separados por punto y coma (`;`).

| Columna      | Regla                                | Obligatorio |
| ------------ | ------------------------------------ | ----------- |
| Código       | Hasta 50 alfanuméricos               | Sí          |
| Descripción  | Hasta 100 alfanuméricos y espacios   | Sí          |
| Forma Pago   | `CTA` (débito) o `TAR` (tarjeta)     | Sí          |
| Tipo Cta     | `CTE` o `AHO`                        | Sí          |
| Nº Cta/Tar   | Hasta 20 dígitos                     | Sí          |
| Email        | Formato de correo                    | No          |
| Teléfono     | Hasta 10 dígitos                     | No          |

Hoy el archivo se usa solo para pagos con **débito en cuenta**, así que
`Forma Pago` viene preseteada en `CTA` — en cada fila nueva y también en las
celdas que estén vacías al abrir — y `Tipo Cta` solo acepta los tipos de
cuenta. La celda se sigue pudiendo editar.

Al exportar: `Forma Pago` y `Tipo` se pasan a mayúsculas. Hay un campo **Monto
Máx** oculto (hasta 7 dígitos) que no se muestra en la grilla: vacío se
completa con `999999999`; si tiene valor se le agregan los centavos (`00`).

### 2. Pago a Terceros (Cash Management)

Genera el archivo de pagos masivos a proveedores: una línea por beneficiario.
Sigue el formato publicado por Banco Guayaquil, transcrito campo por campo en
[`docs/formato-pago-terceros.md`](docs/formato-pago-terceros.md) — vale la pena
tenerlo al lado, porque la página del banco no se puede consultar de forma
automática.

**Los 20 campos del formato son las 20 columnas de la grilla, en su orden**: la
línea del archivo es la fila tal cual. No hay columnas ocultas ni campos sueltos
arriba de la tabla, así que lo que se ve es lo que se exporta.

Tres campos vienen preseteados en cada fila nueva, y se pueden editar igual:

- **Cód. Orientación** en `PA` y **Moneda** en `USD`, los únicos valores que
  define el formato.
- **Secuencial**, numerado solo desde 1. Queda editable a propósito: el formato
  lo vincula al desglose de rubros de los pagos en ventanilla.

| Columna | Regla | Obligatorio |
| ------- | ----- | ----------- |
| Cuenta Empresa | Hasta 10 dígitos; se completa con ceros a la izquierda al exportar | Sí |
| Comprobante | Hasta 20 caracteres, sin comas | No |
| Código | Hasta 20 caracteres: cuenta del proveedor con `CTA`, identificación en ventanilla | Sí |
| Valor | Hasta 11 enteros y 2 decimales (`12645.76` → `0000001264576`) | Sí |
| Forma Pago | `CTA` cuenta, `CHQ` cheque, `EFE` efectivo | Sí |
| Cód. Institución | 4 o 15 caracteres (`0017` = BG) | Sí |
| Tipo Cuenta | `CTE` o `AHO` | Solo con `CTA` |
| Nº Cuenta | BG: hasta 10 dígitos, con ceros a la izquierda. Otros bancos: hasta 30, sin relleno | Solo con `CTA` |
| Tipo ID | `C` cédula, `R` RUC, `P` pasaporte | Sí |
| Nº ID | Cédula 10 dígitos, RUC 13, pasaporte hasta 13 | Sí |
| Nombre Beneficiario | Hasta 40 caracteres | Sí |
| Dirección · Ciudad · Teléfono | Hasta 40 / 20 / 20 caracteres | No |
| Localidad Pago | Hasta 20 caracteres; en blanco con `CTA` | No |
| Referencia | Hasta 200 caracteres: el nº de factura | Sí |
| Ref. Adicional | Hasta 100 caracteres. Con `\|correo@dominio.com` se notifica al beneficiario | No |

Reglas que dependen de la forma de pago, controladas en vivo:

- Con **`CTA`**: Tipo y Nº de cuenta son obligatorios.
- Con **`CHQ`** o **`EFE`**: Tipo y Nº de cuenta van vacíos y la institución debe
  ser `0017`.
- El largo del Nº de ID cambia según el Tipo de ID, que hay que elegir primero.

El nombre del archivo se propone como `BENEFICIARIO_<AAAAMMDD de hoy>_01` y queda
editable: subí el `NN` para el segundo archivo del día, porque Banca Empresas
rechaza dos cargas con el mismo nombre en la misma fecha.

> El archivo separa campos por comas, así que **ningún campo de texto puede
> contener comas**. La grilla las marca como error. Ojo: el separador es un
> supuesto heredado, no está en la documentación del banco — ver
> [`docs/estado.md`](docs/estado.md).

### 3. Recaudación Batch (RECAUDOS17_TC)

Genera el archivo de Cobros / Facturación en formato de **ancho fijo, 124
caracteres por línea**: una cabecera seguida de una línea por registro.

Antes de la grilla se piden dos campos generales:

- **Fecha de ejecución** — tiene que ser futura (el selector no deja elegir hoy
  ni fechas pasadas).
- **Código de empresa** — el que entrega Banco Guayaquil, hasta 5 caracteres.

El nombre del archivo se arma solo: `REM_<AAAAMMDD de hoy>_<CÓDIGO EMPRESA>.txt`.

**Cabecera (124 caracteres)**

| Pos | Largo | Contenido                                    |
| --- | ----- | -------------------------------------------- |
| 1   | 2     | `01` (tipo de registro)                      |
| 3   | 3     | `REC`                                        |
| 6   | 5     | `00017`                                      |
| 11  | 5     | Código de empresa, completado con espacios   |
| 16  | 2     | `01`                                         |
| 18  | 8     | Fecha de generación (AAAAMMDD)               |
| 26  | 8     | Fecha de ejecución (AAAAMMDD)                |
| 34  | 8     | Cantidad de registros, con ceros a izquierda |
| 42  | 15    | Total a cobrar en centavos, con ceros        |
| 57  | 68    | Espacios de relleno                          |

**Detalle (124 caracteres, uno por registro)**

| Pos | Largo | Contenido                                        |
| --- | ----- | ------------------------------------------------ |
| 1   | 2     | `02` (tipo de registro)                          |
| 3   | 2     | Novedad: `01` nueva deuda / `02` actualizar       |
| 5   | 15    | Código de cliente, completado con espacios       |
| 20  | 40    | Nombre del cliente, completado con espacios      |
| 60  | 10    | Valor a cobrar en centavos, con ceros            |
| 70  | 8     | Fecha máxima de pago (hoy + 1 mes)               |
| 78  | 10    | Valor mínimo en centavos (vacío → ceros)         |
| 88  | 10    | Valor de retención en centavos (vacío → ceros)   |
| 98  | 15    | Referencia, completada con espacios              |
| 113 | 6     | Periodo (AAAAMM)                                 |
| 119 | 2     | Secuencia: `01` a `04`                           |
| 121 | 4     | Espacios de relleno                              |

Los montos se escriben con 2 decimales (`220.00`) y al exportar se convierten a
centavos sin punto (`0000022000`).

## Uso

- **Pegar desde Excel**: copiá el rango y pegá directamente en la primera celda.
  Reconoce columnas separadas por tabulaciones y crea las filas que falten.
- **Validación en vivo**: las celdas con un valor que no cumple la regla se
  marcan en rojo; las que solo están **pendientes** (obligatorias y todavía
  vacías) llevan un borde punteado, para que empezar a llenar una fila no la
  pinte entera de rojo. En los dos casos el detalle aparece al pasar el mouse, y
  el pie de la grilla indica cuántos campos faltan. El botón de descarga se
  habilita solo cuando no queda nada rojo ni pendiente y hay al menos un
  registro.
- **Guardado automático**: todo queda en `localStorage` del navegador (datos,
  campos generales, nombre de archivo, tema y estado del panel lateral). Se
  recupera al volver a abrir.
- **Resetear**: borra los datos del generador activo. Pide confirmación.
- Las filas vacías se ignoran al exportar.

## Estructura

```
index.html        Layout: header, grilla, panel de recomendaciones
script.js         APP_CONFIG (definición de cada generador) + toda la lógica
styles.css        Lo que no cubre Tailwind: fondo punteado, date picker, scroll de la grilla
assets/           logo.png
tests/            Suites de verificación (node tests/run.js) y fixtures
docs/estado.md    Alcance, supuestos abiertos y decisiones conocidas
docs/formato-*.md Los formatos del banco, transcritos de la fuente oficial
ARCHITECTURE.md   Cómo está armado y cómo extenderlo
```

## Agregar un generador

No hace falta tocar la lógica de render: agregá un objeto a
`APP_CONFIG.generators` en [`script.js`](script.js) con sus columnas, reglas de
validación y recomendaciones. La grilla, la validación y la persistencia salen
de ahí. Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) para el detalle de cada campo
de la config.

Ojo: en esta entrega no hay barra de pestañas, así que un segundo objeto en el
array quedaría sin forma de llegar — la app siempre muestra el primero. Reponer
la navegación es parte de la entrega 2; ver [`docs/estado.md`](docs/estado.md).
