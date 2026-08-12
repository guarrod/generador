# CLAUDE.md

Notas para trabajar en este repo. Para qué hace la herramienta y el detalle de
los formatos de archivo, ver [README.md](README.md).

## Stack

HTML + CSS + JS vanilla, sin build, sin dependencias locales, sin backend.
Tailwind (CDN, configurado inline en el `<script>` de [index.html](index.html)),
Lucide para iconos, `localStorage` para persistencia.

No hay `package.json`, ni tests, ni linter. Para probar un cambio: abrir
`index.html` en el navegador y recargar.

La lógica de validación y exportación se puede probar sin navegador: `script.js`
solo toca el DOM en el bloque `// Event Listeners` y en `init()`, ambos al final
del archivo. Cortando el fuente ahí y evaluándolo con `node:vm` (con stubs de
`localStorage` y `document`) quedan accesibles las funciones y `APP_CONFIG` para
verificar reglas y líneas exportadas. Ojo: los `const` de nivel superior no
quedan en el global del contexto VM; hay que exponerlos a mano.

## Arquitectura

Todo se maneja desde `APP_CONFIG.generators` en [script.js](script.js): un array
donde cada objeto describe un generador completo. El resto del archivo es render
genérico sobre esa config.

**La regla principal: agregar un generador es agregar un objeto a ese array, no
escribir código de render.** Si un formato nuevo no entra en la config, la
solución es extender la config (una propiedad declarativa nueva) antes que
ramificar la lógica con `if (gen.id === '...')`.

Campos de un generador:

| Campo             | Para qué                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `id`, `label`     | Identificador y texto de la pestaña                                |
| `title`, `description` | Encabezado del panel                                          |
| `storageKey`, `metadataKey`, `filenameKey` | Claves de `localStorage`, prefijadas `bg_gen_<id>_` |
| `defaultFilename` | Nombre inicial del archivo (si el usuario lo puede editar)          |
| `filename`        | `(metadata) => string` para derivar el nombre. Deshabilita el campo |
| `exportType`      | Ausente → CSV separado por comas. `'fixedBatch'` → ancho fijo      |
| `exportRow`       | `(row, index, metadata, columns) => string` cuando la línea no es un volcado 1:1 de las columnas |
| `metadata`        | Campos generales sobre la grilla (opcional)                        |
| `columns`         | Columnas de la grilla. Si falta, se muestra "Próximamente"          |
| `recommendations` | Contenido del panel lateral: `items` + `tip` + `notice`            |

Cada columna: `id`, `label`, `placeholder`, `rule`, `error` (mensaje del
tooltip), `optional`, `options` (llena un `<datalist>`), `defaultValue`,
`exportValue`, `hidden` y `width` (clase Tailwind, ej. `w-24`, para fijar el
ancho de una columna angosta). La tabla no es `table-fixed`, así que el resto de las
columnas sin `width` se sigue repartiendo el espacio sobrante según su
contenido, como antes — `width` solo restringe las columnas que lo declaran.
Cada campo de metadata acepta además `type: 'date'`, `futureOnly` y
`defaultValue`.

Cinco puntos de extensión declarativos, todos opcionales y retrocompatibles:

- **`rule`** puede ser un regex (se valida solo el valor de la celda) o una
  función `(value, row) => boolean` para reglas que dependen de otras columnas
  de la misma fila. Con función, `optional` no aplica: la función decide también
  el caso vacío — por eso las columnas que deben estar vacías bajo cierta
  condición se expresan como `rule` y no como `optional`. Ver `isCellValid()`.
- **`exportValue(value, row)`** transforma una celda al exportar (mayúsculas,
  relleno, valores por defecto). El `value` llega ya trimmeado. Sin esto, la
  celda se exporta tal cual.
- **`exportRow(row, index, metadata, columns)`** arma la línea completa cuando
  el orden de salida no coincide con las columnas o hay literales y valores
  derivados intercalados (es el caso de Pago a Terceros: mete `PA`, `USD` y el
  secuencial que la grilla no pide). Dentro conviene usar
  `getExportValue(findColumn(columns, id), row)` para no duplicar lo que ya
  declara `exportValue`.
- **`defaultValue`** presetea la celda en lugar de dejarla vacía (hoy: `CTA` en
  la Forma de Pago de Pago de Servicios). Se aplica en dos momentos, y hacen
  falta los dos: `createEmptyRow()` para cada fila nueva (lo usan `addRows` y
  el pegado desde Excel — si agregás otro camino que cree filas, tiene que
  pasar por ahí) y `applyColumnDefaults()` al cargar el generador, que rellena
  las celdas vacías de las filas que ya venían de `localStorage`. Sin lo
  segundo el preseteo no aparece en los datos guardados antes de declararlo.
  Un valor escrito por el usuario nunca se pisa, pero si vacía la celda vuelve
  a tomar el default en la próxima carga — misma semántica que
  `applyMetadataDefaults()` para la metadata.
- **`hidden`** saca la columna de la grilla sin sacarla del archivo: se sigue
  inicializando en cada fila y se sigue exportando (vacía) en su posición. Es
  para esconder campos opcionales de un formato de posiciones fijas. Solo en
  columnas opcionales: una columna oculta no se valida, y nadie podría corregir
  un error que no ve.

El corte entre "lo que se ve" y "lo que se exporta" es `getVisibleColumns()`:
lo usan `renderHeader`, `renderGrid`, `validateGrid` y `handlePaste` (el pegado
desde Excel se mapea contra lo visible, que es lo que el usuario tiene delante).
`addRows` y el export siguen recorriendo `gen.columns` completo. Si agregás un
camino que indexe celdas del DOM contra columnas, tiene que usar
`getVisibleColumns()` o los índices se desalinean.

`validateGrid()` clasifica cada celda en tres estados, no dos: válida, **pendiente**
(vacía e inválida — el usuario todavía no llegó) y error (tiene un valor que no
cumple la regla). Solo el error pinta de rojo y tiñe la fila; el pendiente usa
borde punteado. Los dos bloquean la descarga por igual, así que el corte entre
ambos es puramente visual: `isCellValid()` sigue devolviendo un booleano y la
distinción se hace mirando si el valor está vacío. Vale igual para reglas de
regex y de función.

Flujo de render: `init()` → `loadGenerator()` → `loadFromStorage()` +
`renderSidebar()` + `renderMetadataFields()` + `renderHeader()` + `renderGrid()`.
Cualquier edición dispara `updateCell`/`updateMetadata`, que guardan, revalidan y
actualizan los contadores.

El panel lateral tiene tres bloques, en este orden: `items` (uno por columna,
con `label` y `html` — el `html` se interpola tal cual, así que el contenido
lo escribimos nosotros, nunca el usuario; para resaltar un valor está el helper
`chip()`), `tip` (la nota gris en itálica) y `notice` (el aviso destacado en
color secundario, para lo que el usuario tiene que saber sí o sí). Los dos
últimos son texto plano vía `textContent` y se esconden solos si el generador
no los declara; su markup vive estático en `index.html`, solo `renderSidebar()`
les cambia el texto y la clase `hidden`.

**Los `items` describen la grilla, así que se mantienen a la par de `columns`:**
un item por columna visible, mismo label y mismo orden. Si cambiás una regla o
el label de una columna, el item que le corresponde va en el mismo commit. Las
columnas `hidden` no llevan item — si hace falta explicar por qué no están, va
en el `notice` (es el caso del Monto Máx de Pago de Servicios).

## Convenciones

- Estilos con clases de Tailwind inline en el markup y en los template strings.
  `styles.css` es solo para lo que Tailwind no cubre (fondo punteado, date
  picker nativo, ocultar scrollbars).
- Funciones y estado como globales en `script.js`; sin módulos ni bundler. Las
  pestañas usan `onclick` inline, así que las funciones que se llamen desde el
  HTML generado tienen que quedar en el scope global.
- La UI está toda en español. Los `id` de columnas y las claves de storage, en
  snake_case sin tildes.
- Las clases de los inputs salen de `getBaseInputClass()`, `getErrorInputClass()`,
  `getPendingInputClass()` y `getMetadataInputClass()` — la validación las
  reasigna enteras, no toca clases sueltas. Si agregás estilos a un input, van
  ahí. Misma idea en `getSidebarToggleClass()` para el botón de Ayuda.
- Los datos del usuario que se interpolan en HTML pasan por `escapeHtml()`.

## Formatos de ancho fijo

`buildBatchHeader()` y `buildBatchDetail()` arman las líneas como un array de
tramos que se concatena. **Cada línea tiene que dar exactamente 124 caracteres**:
si tocás un tramo, sumá los largos de nuevo y ajustá el relleno final.

Cuidado con los helpers, que no son simétricos:

- `padRight(valor, n)` → rellena con **espacios** a la derecha (texto).
- `padLeft(valor, n)` → rellena con **ceros** a la izquierda (números).

Ambos truncan con `slice` si el valor se pasa de largo.

Los montos se guardan con 2 decimales y se exportan en centavos vía
`formatBatchAmount()` (saca el separador y rellena a 10 con ceros). El total de
la cabecera se suma con `BigInt` para no perder precisión.

Las fechas viven en dos representaciones: `AAAAMMDD` compacto en `currentMetadata`
y `AAAA-MM-DD` en el `<input type="date">`. Convertir siempre con
`compactDateToInput()` / `dateInputToCompact()`.

## Formatos separados por comas (o `exportSeparator`)

Pago de Servicios y Pago a Terceros exportan CSV con extensión `.txt`, igual que
el generador oficial de Banco Guayaquil (que usa `tableToCsv`). Consecuencia:
**ningún campo de texto puede contener el separador**, o el archivo se
desalinea. Los campos libres lo previenen con reglas del tipo `/^[^,]{1,40}$/`
en lugar de contar solo el largo — si agregás un campo de texto, seguí esa
forma (con el carácter del separador que use ese generador).

Pago a Terceros arma la línea a mano en `exportRow` con `.join(',')`. Pago de
Servicios no tiene `exportRow`, así que cae en el `join` genérico de
`exportTxt()`, que usa `gen.exportSeparator` (por defecto `,`) — Pago de
Servicios lo fija en `;`. Es la única forma de separador declarativa hoy;
un generador nuevo sin `exportRow` que necesite otro separador solo tiene que
declarar `exportSeparator`.

Los campos con largo fijo dentro de la línea (el valor de 13 dígitos de Pago a
Terceros, la cuenta de empresa de 10) se arman con `padLeft` en `exportValue` o
en `exportRow`, no en la validación: la grilla acepta lo que el usuario escribe
natural (`12645.76`) y el relleno pasa al exportar.

## Cosas a tener en cuenta

- `downloadText()` revoca la URL del blob recién a los 1000ms (`setTimeout`),
  no apenas después de `a.click()`. Si el navegador tiene activado "preguntar
  dónde guardar cada archivo", ese diálogo nativo es asíncrono; revocar antes
  de que el usuario elija carpeta corta la descarga a medias.
- `buildBatchHeader()` hace `currentMetadata.fecha_ejecucion.trim()` sin
  guarda. Hoy no rompe porque el botón de descarga se deshabilita cuando la
  metadata es inválida, pero es una dependencia implícita entre validación y
  exportación.
- `defaultExport` en las columnas de valor mínimo y retención no lo lee nadie:
  el valor por defecto está hardcodeado en `formatBatchAmount()`.
- La fecha máxima de pago del detalle es "hoy + 1 mes" fija, calculada en el
  momento de exportar.
- El color primario está definido dos veces y no coinciden: `#160f41` en
  `styles.css` y `#160441` en el config de Tailwind.
