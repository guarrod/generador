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

Hay un script que publica `main` en un servidor por SSH. La configuración es
local y no se versiona:

```bash
cp deploy.env.example deploy.env   # completar con el host y el directorio
./deploy.sh
```

Hace `git push` de `main` y después `git pull` en el servidor, que tiene que ser
un clon git de este mismo repo.

## Generadores disponibles

Se eligen con las pestañas de arriba. Cada uno guarda sus datos por separado, así
que se puede saltar de uno a otro sin perder nada. La entrega siguiente suma
Recaudación Batch; ver [`docs/estado.md`](docs/estado.md) antes de simplificar la
arquitectura multi-generador.

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

**El archivo lleva siempre los 20 campos del formato, pero la grilla pide solo
13**: los otros siete no se completan a mano y viajan con su valor fijo o
vacíos, que es lo que el banco espera cuando no se usan. Las posiciones del
archivo no se mueven.

Las 13 que se cargan:

| Columna | Regla | Obligatorio |
| ------- | ----- | ----------- |
| Cuenta Empresa | Hasta 10 dígitos; se completa con ceros a la izquierda al exportar | Sí |
| Secuencial | Se numera solo desde 1; editable | Sí |
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
| Referencia | Hasta 200 caracteres: el nº de factura | Sí |

Las 7 que no se ven, y con qué se exportan:

| Campo | Va al archivo con |
| ----- | ----------------- |
| Cód. Orientación (1) | `PA`, el único código de servicio del formato |
| Moneda (6) | `USD`, la única moneda del formato |
| Dirección (15) · Ciudad (16) · Teléfono (17) | Vacío — son opcionales |
| Localidad de pago (18) | Vacío = "cualquier localidad" |
| Ref. Adicional (20) | Vacío |

> Con Ref. Adicional oculta no se puede pedir la **notificación por correo al
> beneficiario** (`|proveedor@mail.com`), que es la única vía que da el formato.
> Para habilitarla hay que volver a mostrar esa columna.

Mostrar cualquiera de las siete es borrarle el `hidden: true` en `APP_CONFIG` y
devolverle su item en `recommendations`. El archivo exportado no cambia — ver
[`ARCHITECTURE.md`](ARCHITECTURE.md).

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
styles.css        Lo que no cubre Tailwind: fondo punteado, date picker, scrollbars
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
