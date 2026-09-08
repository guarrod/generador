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

### 2. Pago a Terceros (Pagar por archivo)

Genera el archivo de pagos masivos a proveedores: una línea por beneficiario.
Sigue el formato publicado por Banco Guayaquil, transcrito campo por campo en
[`docs/formato-pago-terceros.md`](docs/formato-pago-terceros.md) — vale la pena
tenerlo al lado, porque la página del banco no se puede consultar de forma
automática.

**La grilla pide 9 de los 20 campos del formato: los que cambian de un
beneficiario a otro.** Los otros 11 los completa el generador al exportar — el
formato los fija, los deriva de otro campo de la misma línea o los acepta en
blanco. Las 20 posiciones salen igual y en su orden: lo que cambia es quién las
llena.

Arriba de la grilla hay un campo general:

| Campo general | Regla | Obligatorio |
| ------------- | ----- | ----------- |
| Cuenta de la empresa | Hasta 10 dígitos; se completa con ceros a la izquierda al exportar | Sí |

Es la cuenta que se debita y es **una sola para todo el archivo**, por eso se
carga una vez y no en cada fila.

Y estas son las columnas:

| Columna | Regla | Obligatorio |
| ------- | ----- | ----------- |
| Valor | Hasta 11 enteros y 2 decimales (`12645.76` → `0000001264576`) | Sí |
| Forma Pago | `CTA` cuenta, `CHQ` cheque, `EFE` efectivo | Sí |
| Cód. Institución | 4 o 15 caracteres (`0017` = BG). Si escribís `17`, sale `0017` | Sí |
| Tipo Cuenta | `CTE` o `AHO` | Solo con `CTA` |
| Nº Cuenta | BG: hasta 10 dígitos; los ceros de la izquierda los pone el generador. Otros bancos: hasta 30, sin relleno | Solo con `CTA` |
| Tipo ID | `C` cédula, `R` RUC, `P` pasaporte | Sí |
| Nº ID | Cédula 10 dígitos, RUC 13, pasaporte hasta 13. Si falta el cero de la provincia, se repone al exportar | Sí |
| Nombre Beneficiario | Hasta 40 caracteres | Sí |
| Referencia | Hasta 200 caracteres: el nº de factura | Sí |

Lo que el generador pone solo, en la posición que le toca:

| Campo del formato | Con qué se llena |
| ----------------- | ---------------- |
| 1 · Cód. Orientación | `PA`, el único valor que define el formato |
| 2 · Cuenta Empresa | El campo general, con ceros a la izquierda hasta 10 dígitos |
| 3 · Secuencial | La posición de la línea en el archivo: 7 dígitos desde `0000001` |
| 4 · Comprobante | En blanco |
| 5 · Código | Con `CTA`, el **Nº Cuenta** de la fila tal como sale en el campo 11 (ceros incluidos). Con `CHQ` o `EFE`, el **Nº ID** |
| 6 · Moneda | `USD`, la única moneda que define el formato |
| 15, 16, 17 · Dirección, Ciudad, Teléfono | En blanco |
| 18 · Localidad Pago | En blanco, que para el banco significa *cualquier localidad* |
| 20 · Ref. Adicional | En blanco |

> El secuencial se numera sobre las filas que van al archivo, así que una fila
> vacía en el medio de la grilla no le deja un hueco.

> **El archivo no pide notificación por correo al beneficiario.** Ese aviso viaja
> en el campo 20 (`|proveedor@mail.com`) y es un dato de cada proveedor, así que
> fuera de la grilla no hay dónde cargarlo: con el campo en blanco, el banco no
> manda esos correos. Ver [`docs/estado.md`](docs/estado.md).

Reglas que dependen de la forma de pago, controladas en vivo:

- Con **`CTA`**: Tipo y Nº de cuenta son obligatorios.
- Con **`CHQ`** o **`EFE`**: Tipo y Nº de cuenta van vacíos y la institución debe
  ser `0017`.
- El largo del Nº de ID cambia según el Tipo de ID, que hay que elegir primero.

El nombre del archivo lo pone el generador y no se edita —por eso no hay campo
de nombre en esta pestaña—: `PAGOS_MULTICASH_<AAAAMMDD de hoy>_<##>`, donde el
`##` arranca en `01` y **sube con cada archivo que bajes en el día**. Banca
Empresas rechaza dos cargas con el mismo nombre en la misma fecha, así que el
contador lo lleva la app: al día siguiente vuelve a `01`.

> El archivo separa los campos con **tabulaciones**, el mismo carácter con el que
> Excel copia una fila. Así que la coma es un carácter válido —`Proveedor, S.A.`
> se carga sin problema— y lo que ningún campo de texto puede contener es una
> tabulación. Ojo: el separador no está en la documentación del banco, que no
> menciona ninguno — ver [`docs/estado.md`](docs/estado.md).

### 3. Recaudación Batch (RECAUDOS17_TC)

Genera el archivo de Cobros / Facturación en formato de **ancho fijo, 124
caracteres por línea**: una cabecera seguida de una línea por registro.

Antes de la grilla se piden dos campos generales:

- **Fecha de ejecución** — tiene que ser futura (el selector no deja elegir hoy
  ni fechas pasadas).
- **Código de empresa** — el que entrega Banco Guayaquil, hasta 3 caracteres. En el
  archivo viaja en un campo de 5 (posición 11, ver tabla de cabecera abajo);
  el sobrante se completa con espacios a la derecha.

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
  Reconoce columnas separadas por tabulaciones y crea las filas que falten. Las
  columnas de opción fija (Forma Pago, Tipo Cuenta, Tipo ID) son desplegables, y
  un desplegable no recibe el pegado: si querés pegar solo esa columna suelta,
  empezá el pegado en una columna de texto.
- **Validación en vivo**: las celdas con un valor que no cumple la regla se
  marcan en rojo; las que solo están **pendientes** (obligatorias y todavía
  vacías) llevan un borde punteado, para que empezar a llenar una fila no la
  pinte entera de rojo. En los dos casos el detalle aparece al pasar el mouse, y
  el pie de la grilla indica cuántos campos faltan.
- **Lista de errores**: al pie del panel aparece cada error con su fila, el
  campo, el valor cargado y el motivo, así no hay que ir a buscar la celda roja a
  lo ancho de la grilla.
- **Descargar valida**: el botón está siempre habilitado. Al presionarlo se
  revisa todo el formulario; si algo falta o está mal, no se descarga nada y la
  lista de abajo pasa a mostrar también **los campos que faltan completar** —y no
  solo los que están mal— para que se vea de una todo lo que separa del archivo.
  Antes del primer intento no se muestra nada de eso: un campo todavía vacío no
  es un error.
- **Los ceros a la izquierda no se cargan a mano**: Excel se los come al copiar,
  así que el generador los repone al exportar (`1234567` → `0001234567`,
  `912378320` → `0912378320`, `17` → `0017`).
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

La barra de pestañas sale del mismo array, así que el generador nuevo aparece
solo. Ver [`docs/estado.md`](docs/estado.md) antes de simplificar la
arquitectura multi-generador: la entrega 3 se apoya en ella.
