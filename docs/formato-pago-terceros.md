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
  - **El generador NO usa este nombre.** Baja
    `PAGOS_MULTICASH_AAAAMMDD_##.txt`, confirmado por el equipo — igual que el
    separador, es un punto donde lo que pide el banco en la práctica no coincide
    con lo que dice este artículo. Ver [estado.md](estado.md).
- **Una línea por beneficiario**, con los 20 campos en el orden de la tabla.

> **El artículo no dice cuál es el separador de campos.** No menciona ninguno, no
> trae línea de ejemplo y no tiene adjuntos. El generador separa con
> **tabulación**, confirmado por el equipo, no por esta fuente. Ver
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

La grilla pide 10 de los 20 campos: los 9 que cambian de un beneficiario a otro
(7, 8, 9, 10, 11, 12, 13, 14 y 19) más el correo opcional, que llena el 20. Los
otros 10 los completa el generador al exportar, en su posición:

| Campo | Con qué se llena | Por qué no se pide |
| ----- | ---------------- | ------------------ |
| 1 · Código Orientación | `PA` | Es el único valor que define el artículo |
| 2 · Cuenta Empresa | El campo general de arriba de la grilla, con ceros a la izquierda hasta 10 | Es la cuenta que se debita: una sola para todo el archivo, no una por línea |
| 3 · Secuencial Pago | La posición de la línea: 7 dígitos desde `0000001` | Es el orden del archivo. **Ojo:** el artículo lo vincula al desglose de rubros de los pagos en ventanilla; si hay que expresar esos desgloses, vuelve a ser una columna |
| 4 · Comprobante | En blanco | Opcional |
| 5 · Código | Con `CTA`, el campo 11 tal como sale (ceros incluidos). Con `CHQ` o `EFE`, el campo 13 | El artículo lo define como copia de otro campo de la misma línea |
| 6 · Moneda | `USD` | Es la única moneda que define el artículo |
| 15, 16, 17 · Dirección, Ciudad, Teléfono | En blanco | Opcionales |
| 18 · Localidad de pago | En blanco | Con `CTA` el artículo la exige en blanco, y en ventanilla en blanco significa "cualquier localidad" |

El campo 20 (Referencia Adicional) es el único de estos que sí es columna: la
grilla lo pide como **Correo Beneficiario**, y `formatTerceroCorreo()` le agrega
el pipe al exportar (`proveedor@mail.com` sale `|proveedor@mail.com`). Vacío,
sale vacío.

Dos cosas que el artículo deja ver y conviene no perder:

- **El campo 5 puede no entrar en su propio largo.** Está declarado en
  Alfanumérico/20, pero se deriva del 11, que admite hasta 30 en otra
  institución. Ver [estado.md](estado.md).
- El `NN` del nombre **no es un campo del registro**: es parte del nombre del
  archivo, así que se edita en el campo del nombre, no en la grilla.
