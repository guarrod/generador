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

## Deploy

Vive en `https://guarrod.com/generador/`, servido estático desde
`/var/www/demos/generador/` en el VPS (`pulsar`), que es un clon git del
mismo repo. Publicar:

```bash
./deploy.sh
```

Hace `git push` a `main` y después `git pull` en el servidor. Requiere el
alias SSH `pulsar` configurado.

## Generadores disponibles

Se eligen con las pestañas de arriba. Cada uno guarda sus datos por separado,
así que podés saltar de uno a otro sin perder nada.

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

Genera el archivo de pagos masivos a proveedores: una línea por beneficiario,
campos separados por comas. Sigue el
[formato publicado por Banco Guayaquil](https://ayudaempresas.bancoguayaquil.com/hc/es/articles/11032985670804--Cu%C3%A1l-es-el-formato-para-cargar-una-orden-de-Cash-Management-para-pago-a-terceros-en-mi-Banca-Empresas).

El nombre del archivo se arma solo: `BENEFICIARIO_<AAAAMMDD de hoy>_<NN>.txt`.
Subí la secuencia (`NN`) si mandás más de un archivo el mismo día — Banca
Empresas rechaza dos cargas con el mismo nombre en la misma fecha.

Campos generales (se repiten igual en todas las líneas, por eso se piden una
sola vez):

- **Cuenta de la empresa** — hasta 10 dígitos; al exportar se completa con
  ceros a la izquierda.
- **Secuencia del archivo** — el `NN` del nombre. Arranca en `01`.

Tres de los 20 campos del formato no se piden porque son siempre los mismos o
se deducen: el código de orientación (`PA`), la moneda (`USD`) y el secuencial
de pago (se numera solo desde 1, en el orden de las filas).

| Columna             | Regla                                                       | Obligatorio     |
| ------------------- | ----------------------------------------------------------- | --------------- |
| Comprobante         | Hasta 20 alfanuméricos                                      | No              |
| Código              | Hasta 20 alfanuméricos: cuenta o identificación del proveedor | Sí             |
| Valor               | Hasta 11 enteros y 2 decimales (`12645.76`)                 | Sí              |
| Forma Pago          | `CTA` cuenta, `CHQ` cheque, `EFE` efectivo                  | Sí              |
| Cód. Institución    | 4 o 15 caracteres (`0017` = BG)                             | Sí              |
| Tipo Cuenta         | `CTE` o `AHO`                                               | Solo con `CTA`  |
| Nº Cuenta           | BG: hasta 10 dígitos. Otros bancos: hasta 30 alfanuméricos   | Solo con `CTA`  |
| Tipo ID             | `C` cédula, `R` RUC, `P` pasaporte                          | Sí              |
| Nº ID               | Cédula 10 dígitos, RUC 13, pasaporte hasta 13               | Sí              |
| Nombre Beneficiario | Hasta 40 caracteres                                         | Sí              |
| Referencia          | Hasta 200 caracteres: el nº de factura                      | Sí              |

Cinco campos opcionales del formato están **ocultos por ahora**: Dirección,
Ciudad, Teléfono, Localidad de pago y Ref. Adicional. El archivo los sigue
incluyendo vacíos, en su posición, así que las 20 posiciones se mantienen
intactas. Para volver a mostrarlos alcanza con sacarles el `hidden` en
`APP_CONFIG`.

Hay reglas que dependen de la forma de pago y la grilla las controla en vivo:

- Con **`CTA`**: Tipo y Nº de cuenta son obligatorios.
- Con **`CHQ`** o **`EFE`**: Tipo y Nº de cuenta tienen que ir vacíos, y la
  institución financiera debe ser `0017`.
- El largo del Nº de ID cambia según el Tipo de ID.
- El Nº de cuenta se completa con ceros a 10 dígitos solo si la institución es
  `0017`; en otros bancos va tal cual.

Al exportar: el valor se convierte a 13 dígitos sin punto (`12645.76` →
`0000001264576`) y los códigos pasan a mayúsculas.

El formato permite notificar al beneficiario por correo escribiendo el pipe y la
dirección en **Ref. Adicional** (`|proveedor@mail.com`), pero esa columna está
oculta hoy, así que la notificación no se puede cargar desde la grilla.

> Como el archivo separa campos por comas, **ningún campo de texto puede
> contener comas**. La grilla las marca como error.

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
index.html    Layout: header, pestañas, grilla, panel de recomendaciones
script.js     APP_CONFIG (definición de cada generador) + toda la lógica
styles.css    Lo que no cubre Tailwind: fondo punteado, date picker, scrollbars
assets/       logo.png
```

## Agregar un generador

No hace falta tocar la lógica de render: agregá un objeto a
`APP_CONFIG.generators` en [`script.js`](script.js) con sus columnas, reglas de
validación y recomendaciones. La pestaña, la grilla, la validación y la
persistencia salen de ahí. Ver [`CLAUDE.md`](CLAUDE.md) para el detalle de cada
campo de la config.
