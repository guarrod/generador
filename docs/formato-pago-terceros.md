# Formato de Pago a Terceros (Cash Management)

Transcripción del artículo del centro de ayuda de Banco Guayaquil, **consultado
el 2026-08-12, versión del artículo actualizada el 2026-08-09**:

> ¿Cuál es el formato para cargar una orden de Cash Management para pago a
> terceros en mi Banca Empresas?
> `https://ayudaempresas.bancoguayaquil.com/hc/es/articles/11032985670804`

Está acá porque **la página no es accesible de forma automática**: responde 403 a
cualquier cliente que no sea un navegador con sesión (protección de Cloudflare).
Si hay que reconfirmarla, abrila a mano en el navegador.

Cada regla del generador sale de esta tabla; los mensajes de error de la app
citan el número de campo para poder volver acá.

## El archivo

- **Formato:** `.txt`
- **Nombre:** `BENEFICIARIO_AAAAMMDD_NN.TXT`
  - `AAAAMMDD` — la fecha del día.
  - `NN` — número de secuencia, para cuando se envía más de un archivo por día.
  - Ejemplo: `BENEFICIARIO_20220204_01.TXT`
- **Una línea por beneficiario**, con los 20 campos en el orden de la tabla.

> **El artículo no dice cuál es el separador de campos.** No menciona coma ni
> punto y coma, no trae línea de ejemplo y no tiene adjuntos. La coma que usa el
> generador viene del generador oficial del banco, no de esta fuente. Ver
> [estado.md](estado.md).

## Los 20 campos

| # | Campo | Tipo / Longitud | Obligatorio | Observación del banco |
|---|-------|-----------------|-------------|------------------------|
| 1 | Código Orientación | Alfanumérico / 2 | Sí | Indica el código del servicio. `PA` = Pago |
| 2 | Cuenta Empresa | Numérico / 10 | Sí | Cuenta de la empresa que se usa para el servicio. Si no llega a 10 dígitos se completa con ceros a la izquierda: `1234567` → `0001234567` |
| 3 | Secuencial Pago | Numérico / 7 | Sí | Secuencial dentro de la orden, empieza en uno. Relacionado con el desglose de los rubros del pago; **esos desgloses solo aplican a pagos en ventanilla**. No hace falta completar con ceros |
| 4 | Comprobante de Pago | Alfanumérico / 20 | No | Número de comprobante, egreso, planilla, etc. No hace falta completar con ceros |
| 5 | Código | Alfanumérico / 20 | Sí | Con crédito en cuenta: el número de cuenta del proveedor. En ventanilla: su número de identificación. También admite código de beneficiario o de proveedor |
| 6 | Moneda | Alfanumérico / 3 | Sí | `USD` = Dólares |
| 7 | Valor | Numérico / 13 | Sí | 11 enteros y 2 decimales. `12.645,76` viaja como `0000001264576` |
| 8 | Forma de Pago | Alfanumérico / 3 | Sí | `CTA` crédito a cuenta · `CHQ` cheque · `EFE` efectivo |
| 9 | Código de Institución Financiera | Alfanumérico / 4 **o** / 15 | Sí | Con `EFE` o `CHQ`: el código de BG, `0017`. Con `CTA`: si el pago es local, 4 dígitos (ver el Anexo 4 del banco para la lista de instituciones) |
| 10 | Tipo de Cuenta | Alfanumérico / 3 | Sí, con `CTA` | `CTE` corriente · `AHO` ahorros. **Con `CHQ` o `EFE` no debe ser llenado** |
| 11 | Número de Cuenta | Numérico / 10 **o** Alfanumérico / 30 | Sí, con `CTA` | Si la cuenta es de Banco Guayaquil son 10 dígitos y se completa con ceros a la izquierda. Si es de otra institución **no** se rellena. **Con `CHQ` o `EFE` no debe ser llenado** |
| 12 | Tipo ID Cliente Beneficiario | Alfanumérico / 1 | Sí | `C` cédula · `R` RUC · `P` pasaporte |
| 13 | Número ID Cliente Beneficiario | Alfanumérico / 13 **o** / 10 | Sí | Cédula: 10 dígitos (`0912378320`). RUC: 13 dígitos (`0912378320001`). Pasaporte: hasta 13 caracteres (`PX39582`) |
| 14 | Nombre del Cliente Beneficiario | Alfanumérico / 40 | Sí | Nombre del beneficiario |
| 15 | Dirección Beneficiario | Alfanumérico / 40 | No | |
| 16 | Ciudad Beneficiario | Alfanumérico / 20 | No | |
| 17 | Teléfono Beneficiario | Alfanumérico / 20 | No | |
| 18 | Localidad de pago | Alfanumérico / 20 | No | Con `CTA` debe ir con blancos. Con `EFE` o `CHQ`: en blanco = cualquier localidad, o `QUITO`, `GUAYAQUIL`, `CUENCA`, `AMBATO`, `RIOBAMBA`, `LOJA`, `ESMERALDAS`, `IBARRA`, etc. |
| 19 | Referencia | Alfanumérico / 200 | Sí | Referencia del pago: número de factura. Si se manda notificación por correo al tercero, **este campo es el que se imprime como número de factura** |
| 20 | Referencia Adicional | Alfanumérico / 100 | No | Referencia adicional. Para enviar un correo al beneficiario: primero el pipe y después la dirección — `|proveedor@mail.com` |

## Cómo se leyó "Alfanumérico"

En este artículo **significa texto, no `[A-Za-z0-9]`**. Lo demuestra el propio
documento: el campo 18 es "Alfanumérico / 20" y sus ejemplos llevan espacios
(`QUITO, GUAYAQUIL`), el 14 son razones sociales (`Proveedor S.A.`) y el 20 es
"Alfanumérico / 100" pero exige un pipe y una arroba.

Por eso las columnas de texto del generador validan "cualquier carácter menos el
separador", con el largo de la tabla, y no un alfanumérico estricto.

## Lo que la herramienta resuelve sola

Tres campos no se piden en la grilla vacíos sino preseteados, porque el artículo
los fija o los deriva. Se pueden editar igual:

- **Campo 1** viene en `PA`, el único código de orientación que define el
  artículo.
- **Campo 6** viene en `USD`, la única moneda que define el artículo.
- **Campo 3** se numera solo desde 1 en el orden de las filas. Queda editable a
  propósito: el artículo lo vincula al desglose de rubros de los pagos en
  ventanilla, y con el número fijo no habría forma de expresarlos.

El `NN` del nombre **no es un campo del registro**: es parte del nombre del
archivo, así que se edita en el campo del nombre, no en la grilla.
