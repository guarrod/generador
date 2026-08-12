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

Esta entrega trae **un solo generador**, sin barra de pestañas. Las siguientes
suman uno cada una y reponen la navegación; ver
[`docs/estado.md`](docs/estado.md) antes de simplificar la arquitectura
multi-generador.

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
tests/            Suites de verificación (node tests/run.js)
docs/estado.md    Alcance, supuestos abiertos y decisiones conocidas
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
