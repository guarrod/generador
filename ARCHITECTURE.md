# Arquitectura

Cómo está armado el generador y qué hay que saber antes de tocarlo. Para qué
hace la herramienta y el detalle de los formatos de archivo, ver
[README.md](README.md); para lo que está pendiente o sin confirmar,
[docs/estado.md](docs/estado.md).

## Entregas

Esta entrega completa los tres generadores (Pago de Servicios, Pago a Terceros y
Recaudación Batch) con la barra de pestañas. El recorrido está en
[docs/estado.md](docs/estado.md).

Cada entrega agregó un objeto a `APP_CONFIG.generators` y **nunca tocó el
motor**: es la propiedad que conviene conservar cuando aparezca el próximo
formato.

## Stack

HTML + CSS + JS vanilla, sin build, sin dependencias locales, sin backend.
Tailwind (CDN, configurado inline en el `<script>` de [index.html](index.html)),
Lucide para iconos, `localStorage` para persistencia.

Sin dependencias y sin build: no hace falta `npm install`. Para ver un cambio,
abrir `index.html` en el navegador y recargar.

Para verificarlo:

```bash
node tests/run.js          # o npm test
node tests/run.js servicios  # solo las suites que coincidan
```

Las suites viven en [`tests/`](tests/) y corren con Node pelado. El truco está
en [`tests/harness.js`](tests/harness.js): `script.js` solo toca el DOM en el
bloque `// Event Listeners` y en `init()`, los dos al final del archivo, así que
el harness corta el fuente ahí y evalúa el resto en `node:vm` con stubs mínimos
de `localStorage` y `document`. Ojo con una trampa: los `const` y `function` de
nivel superior no quedan en el global del contexto de la VM; el harness los
expone solo, leyendo los nombres del propio fuente.

Lo que importa verificar es **la línea exportada**, no la pantalla: es lo que el
banco rechaza si se rompe y lo único que no se nota mirando la app.

## Arquitectura

Todo se maneja desde `APP_CONFIG.generators` en [script.js](script.js): un array
donde cada objeto describe un generador completo. El resto del archivo es render
genérico sobre esa config.

**La regla principal: agregar un generador es agregar un objeto a ese array, no
escribir código de render.** Si un formato nuevo no entra en la config, la
solución es extender la config (una propiedad declarativa nueva) antes que
ramificar la lógica con `if (gen.id === '...')`.

### Por qué esto importa para no romper otro formato

Cambiar el objeto de un generador **no puede** afectar a los demás: son datos
separados, con su propia clave de `localStorage`. El riesgo de romper Pago de
Servicios arreglando Pago a Terceros vive en un solo lugar: **las funciones que
los tres comparten** — `isCellValid`, `getExportValue`, `createEmptyRow`,
`getColumnDefault`, `isRowEmpty`, `handlePaste`, `validateGrid`,
`padLeft`/`padRight`.

De ahí la forma de trabajar:

1. **Primero intentá resolverlo en la config.** Si el cambio entra en el objeto
   del generador, no hay riesgo de arrastre y no hace falta más.
2. **Si tenés que tocar el motor, es un cambio de contrato para todos.** No es
   "un arreglo de Terceros": es un cambio que también le pasa a Servicios y a
   Recaudación. Decidilo a propósito.
3. **La suite es el criterio de aceptación.** `tests/motor.test.js` fija el
   contrato de esas funciones contra generadores de mentira, y cada generador
   tiene un *golden file* que fija su archivo byte a byte. Si tocás el motor y
   el golden de otro formato se mueve, ese archivo cambió — y el banco lo va a
   notar aunque en la pantalla no se vea nada.

Ejemplo real: para que el secuencial de Pago a Terceros se numerara solo,
`defaultValue` pasó a aceptar una función además de un valor fijo. Eso tocó
`createEmptyRow()`, que usan los tres generadores. Entró sin romper nada porque
el cambio fue aditivo —`getColumnDefault()` sigue devolviendo lo mismo para los
valores fijos— y las suites de los otros dos formatos lo confirmaron.

Campos de un generador:

| Campo             | Para qué                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `id`, `label`     | Identificador y texto de la pestaña                                |
| `title`, `description` | Encabezado del panel                                          |
| `storageKey`, `metadataKey`, `filenameKey`, `secuenciaKey` | Claves de `localStorage`, prefijadas `bg_gen_<id>_` |
| `defaultFilename` | Nombre inicial del archivo, `string` o `() => string` (vía `getDefaultFilename()`) para proponer uno que dependa del día. El campo sigue editable |
| `filename`        | `(metadata, gen) => string` para derivar el nombre. **Esconde el campo** (ver abajo) |
| `exportType`      | Ausente → campos separados (ver `exportSeparator` / `exportRow`). `'fixedBatch'` → ancho fijo |
| `exportRow`       | `(row, index, metadata, columns) => string` cuando la línea no es un volcado 1:1 de las columnas |
| `metadata`        | Campos generales sobre la grilla (opcional)                        |
| `columns`         | Columnas de la grilla. Si falta, se muestra "Próximamente"          |
| `recommendations` | Contenido del panel lateral: `items` + `tip` + `notice`            |

Cada columna: `id`, `label`, `placeholder`, `rule`, `error` (mensaje del
tooltip), `optional`, `options` (**convierte la celda en un `<select>`** — ver
más abajo; **solo para conjuntos cerrados**, los que el formato enumera entero:
`CTA`/`CHQ`/`EFE`, `CTE`/`AHO`, `C`/`R`/`P`. Un campo cuya lista real vive fuera
de la app, como el código de institución financiera —que es el Anexo 4 del
banco—, no lleva `options`: sugerir un par de valores lo haría parecer cerrado y
el usuario tiene que poder cargar cualquiera), `defaultValue`,
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
  derivados intercalados. Es el caso de Pago a Terceros, donde la grilla pide 10
  de los 20 campos y `exportRow` pone los otros 10 en su posición: los que el
  formato fija (`PA`, `USD`), la cuenta de la empresa —que viene de `metadata`
  porque es una sola para todo el archivo—, el secuencial —que es `index`, la
  posición de la línea— y el código, que el formato define como copia de otro
  campo de la misma línea. Dentro conviene usar
  `getExportValue(findColumn(columns, id), row)` para no duplicar lo que ya
  declara `exportValue`.

  **Un campo derivado no se pide, así que tampoco se valida.** Vale para él la
  misma condición que para `hidden`: lo que se exporta tiene que ser válido pase
  lo que pase en el resto de la fila. Si sale de otra columna, se hereda su
  validación (el código de Pago a Terceros sale del Nº de cuenta o del Nº de ID,
  las dos validadas); si sale de `metadata`, lo cubre `validateMetadata()`, que
  bloquea la descarga igual que una celda en rojo. Lo que **no** está cubierto es
  que el campo de origen entre en el largo del de destino — ver el caso del campo
  5 en [docs/estado.md](docs/estado.md).
- **`defaultValue`** presetea la celda en lugar de dejarla vacía (`CTA` en la
  Forma de Pago de Pago de Servicios). Acepta un valor fijo o una **función del
  número de fila** — `index => String(index + 1)` para una columna que se numere
  sola —, y las dos formas pasan por `getColumnDefault()`. Hoy ningún generador
  instalado usa la forma de función: la usaba el secuencial de Pago a Terceros,
  antes de pasar a derivarse en `exportRow`. Queda porque el punto de extensión
  ya está y `motor.test.js` lo verifica. Se aplica en dos momentos, y
  hacen falta los dos: `createEmptyRow(gen, index)` para cada fila nueva (lo
  usan `addRows` y el pegado desde Excel — si agregás otro camino que cree
  filas, tiene que pasar por ahí **con el índice que le va a tocar**) y
  `applyColumnDefaults()` al cargar el generador, que rellena las celdas vacías
  de las filas que ya venían de `localStorage`. Sin lo segundo el preseteo no
  aparece en los datos guardados antes de declararlo.
  Un valor escrito por el usuario nunca se pisa, pero si vacía la celda vuelve
  a tomar el default en la próxima carga — misma semántica que
  `applyMetadataDefaults()` para la metadata.
- **`filename(metadata, gen)`** deriva el nombre del archivo en vez de
  proponerlo. La diferencia con `defaultFilename` no es cosmética: un nombre
  propuesto se edita y se guarda en `filenameKey`; uno derivado **esconde el
  campo entero** (`loadGenerator()` le pone `hidden` al contenedor). Un campo
  deshabilitado ocupa lugar en la barra para no dejar hacer nada.

  Es lo que usa Pago a Terceros: `PAGOS_MULTICASH_<AAAAMMDD de hoy>_<##>`.

  **El `##` lo lleva la app**, porque ya no hay campo donde subirlo a mano y
  Banca Empresas rechaza dos cargas con el mismo nombre en la misma fecha.
  `getFileSequence(gen)` da el número del próximo archivo y `bumpFileSequence()`
  lo sube después de generarlo, sobre `secuenciaKey`. Tres decisiones ahí:
  - Se guarda **la fecha junto al número** (`AAAAMMDD:3`), para volver a 1 solo
    cuando cambia el día en vez de arrastrar una cuenta que crece para siempre.
  - Va en `localStorage` y no en memoria: tiene que sobrevivir a recargar.
  - **`resetGrid()` no lo borra.** Cuenta archivos que ya salieron, y volver a
    `01` después de un reset armaría el nombre repetido que el banco rechaza.

  El relleno usa `padStart`, **no `padLeft`**: padLeft trunca con `slice`, así
  que el archivo 100 del día saldría `_10` y chocaría con el del décimo.
- **`hidden`** saca la columna de la grilla sin sacarla del archivo: se sigue
  inicializando en cada fila y se sigue exportando en su posición, con su
  `defaultValue` o vacía. Sirve para no cargar la pantalla con campos que el
  usuario no completa, sin mover una sola posición del formato.

  **La condición para que sea seguro:** una columna oculta **no se valida** —
  nadie puede corregir un error que no ve, y la descarga nunca se bloquearía por
  ella— y el usuario **no puede cambiarle el valor**, así que la celda se queda
  para siempre con lo que le puso `defaultValue`, o vacía. Esconderla es seguro
  si y solo si **ese** valor es válido, y tiene que serlo pase lo que pase en el
  resto de la fila, porque las reglas de función miran las otras celdas.

  Eso se cumple de tres formas:

  | Forma | Ejemplo |
  | ----- | ------- |
  | La columna es `optional` | **Monto Máx**, de Pago de Servicios: es la única columna oculta hoy |
  | Tiene un `defaultValue` constante que cumple su regla | Una columna que el formato fija en un solo valor |
  | Su regla de función acepta el vacío siempre | Una columna que el formato acepta en blanco bajo cualquier condición |

  Las dos últimas están anotadas como análisis hecho, no como descripción del
  código: si vuelve a plantearse esconder una columna así, el invariante lo
  verifica solo.

  **`hidden` no es la única forma de sacar una columna de la grilla, y no siempre
  es la que corresponde.** Esconderla la deja en `columns`, así que se sigue
  guardando y exportando por fila: sirve cuando el valor es de la fila y el
  usuario no tiene nada que decidir. Cuando el valor no es de la fila —es del
  archivo, de la posición de la línea, o copia de otra columna— la columna se
  saca de `columns` y el campo se arma en `exportRow`. Es lo que hace Pago a
  Terceros con 10 de sus 20 campos.

  No hace falta acordarse: `tests/motor.test.js` recorre las columnas ocultas de
  todos los generadores y verifica el invariante. Si alguien esconde una columna
  que puede quedar inválida, falla ahí y no en un archivo que el banco rechaza.

  **Para volver a mostrar una columna** alcanza con borrarle el `hidden: true` y
  devolverle su item en `recommendations`. El archivo exportado no cambia.

El corte entre "lo que se ve" y "lo que se exporta" es `getVisibleColumns()`:
lo usan `renderHeader`, `renderGrid`, `validateGrid` y `handlePaste` (el pegado
desde Excel se mapea contra lo visible, que es lo que el usuario tiene delante).
`addRows` y el export siguen recorriendo `gen.columns` completo. Si agregás un
camino que indexe celdas del DOM contra columnas, tiene que usar
`getVisibleColumns()` o los índices se desalinean.

**Una celda es un `<input>`, salvo que la columna declare `options`: ahí es un
`<select>`** (`createCellInput()` / `createCellSelect()`). El datalist que había
antes no servía: el navegador filtra sus opciones por lo que la celda ya tiene
escrito, así que con `CTE` cargado la lista ofrecía solo `CTE` y no había forma
de llegar a `AHO` sin borrar a mano primero. Tres cosas que el select respeta:

- **Lleva opción vacía (`—`).** En estos formatos el vacío significa algo —con
  `CHQ` o `EFE` el tipo de cuenta debe ir vacío—, así que tiene que poder
  elegirse; antes había que borrar la celda con la tecla de retroceso.
- **Un valor que no está entre las opciones se agrega como una opción más**
  (`getCellOptions()`). Pasa con lo pegado desde Excel —`cte` en minúscula, que
  la regla acepta— y con un dato mal cargado. Sin eso el select mostraría un
  valor distinto del que guarda `gridData`: la celda diría una cosa y el archivo
  saldría con otra. La validación sigue pintando la celda como siempre.
- **No recibe el evento `paste`**, porque un `<select>` no lo dispara. El pegado
  masivo no cambia —empieza en la primera columna, que es un input en los dos
  generadores— pero un pegado que arranque justo en una columna con `options` no
  entra. Si alguna vez hace falta, la salida es un combo (input + select
  superpuesto), no volver al datalist.

Su estilo vive en `styles.css` como `select.cell`, con selector de tipo y no
dentro de `getBaseInputClass()`: la validación reasigna la clase entera del
control en cada tecleo y `cell` es lo único que sobrevive a los tres estados.

`isRowEmpty(row, gen)` decide dos cosas a la vez: qué filas van al archivo
(`getNonEmptyRows`) y cuáles se saltea la validación por estar en blanco. Mide
contra **las columnas que el generador declara hoy**, no contra las claves que
tiene el objeto. La diferencia aparece al sacar una columna: su valor sigue en lo
que hay guardado en `localStorage`, así que una fila que en pantalla se ve vacía
seguiría contando como registro —y la grilla no borra filas, así que bloquearía
la descarga para siempre— o viajaría al archivo como una línea de campos vacíos.

`validateGrid()` clasifica cada celda en tres estados, no dos: válida, **pendiente**
(vacía e inválida — el usuario todavía no llegó) y error (tiene un valor que no
cumple la regla). Solo el error pinta de rojo y tiñe la fila; el pendiente usa
borde punteado. Los dos bloquean la descarga por igual, así que el corte entre
ambos es puramente visual: `isCellValid()` sigue devolviendo un booleano y la
distinción se hace mirando si el valor está vacío. Vale igual para reglas de
regex y de función.

**Una regla de función no marca error mientras la celda de la que depende siga
vacía.** Es el caso de Tipo y Nº de cuenta en Pago a Terceros, que se leen contra
Forma de Pago (`faltaFormaPago()`): con la forma de pago sin elegir, la regla
caía en la rama de ventanilla y pintaba de rojo una cuenta correcta, con el
mensaje de CHQ/EFE —una opción que el usuario no había elegido— y sin nada que
tocar en esa celda para arreglarlo. El usuario no cometió ningún error: le falta
decidir. No abre ningún agujero, porque la celda que decide queda **pendiente** y
bloquea la descarga igual; al elegirla, las dependientes se revalidan contra la
rama que corresponda.

Si agregás una regla que mira otra columna, empezala por ese caso. La excepción
que hay hoy es el Nº de ID contra Tipo ID: ahí la celda que decide solo cambia el
**largo** esperado, el campo se pide siempre, y el mensaje dice exactamente qué
hacer ("Elige primero el Tipo ID"), así que el rojo es accionable.

**Los campos generales usan los mismos tres estados**, vía `getMetadataState()`.
No es cosmético: un campo general arranca vacío y se ve apenas se abre la app, así
que con dos estados la primera pantalla recibe al usuario en rojo por un error
que todavía no cometió. `validateMetadata()` devuelve el desglose
(`{ hasErrors, pending }`) en vez de un booleano porque los dos números van a
lugares distintos: el error tiene su propio mensaje de estado y el pendiente se
suma a la cuenta de campos que faltan de la grilla — para el usuario son lo
mismo, cosas que completar antes de descargar.

**La lista de errores del pie** (`collectErrors()` + `renderErrorList()`) es la
tercera salida de la validación, junto al pintado de las celdas y el mensaje de
estado. Entra una línea por cada campo o celda que impide descargar, con la
ubicación en una etiqueta —`Fila 3`, numerada desde 1 como la ve el usuario, o
`General` para los campos de arriba de la grilla, que van primero—, el nombre
del campo, el valor y el mensaje de la columna. Lo que la define:

- **Los pendientes entran recién después del primer intento de descarga**
  (`intentoDescarga`, el cuarto argumento `incluirPendientes`). Antes, vacío es
  "todavía no llegué" y listarlo llenaría el panel de campos que el usuario ni
  tocó; después, ya dijo que terminó y necesita ver todo lo que lo separa del
  archivo, no solo lo que escribió mal. La bandera se apaga al cambiar de
  generador, al resetear y después de una descarga exitosa.
- **Cada entrada lleva un `estado`**, que es lo que estructura el panel:
  `'error'` es un valor mal cargado —se corrige— y `'falta'` es un obligatorio
  todavía vacío —se completa—. Son dos trabajos distintos, así que se ven
  distinto: rojo y ámbar, con el color en un filete a la izquierda de la línea,
  en la etiqueta de ubicación y en el valor. Las clases salen enteras de
  `ESTILO_ESTADO`, como las de los inputs. La cabecera toma el color del estado
  más grave que haya en la lista: si lo único que pasa es que falta completar,
  el panel entero va en ámbar — recibir en rojo a quien no se equivocó, solo no
  terminó, es el mismo error que pintar de rojo una celda vacía.
- **Lo que está en error muestra el valor tal como se escribió**, en
  monoespaciada, para poder compararlo contra la planilla de la que salió. Lo
  que falta no tiene valor que mostrar: en su lugar va `sin completar`.
- **Si no hay ningún registro, la lista lo dice.** Es el único motivo de bloqueo
  que no es una celda, y sin esa entrada presionar Descargar con la grilla vacía
  no mostraría nada. Va sin etiqueta de ubicación —no es de ninguna fila— y el
  render deja el hueco en su lugar, para que la columna no se rompa cuando
  convive con otras líneas.
- **Recorre `getVisibleColumns()`**, igual que la validación. Listar el error de
  una columna oculta dejaría al usuario con la descarga bloqueada y sin dónde
  tocar para arreglarlo.
- **`collectErrors()` va sobre los datos, no sobre los inputs pintados.** Por eso
  se verifica sin navegador (`motor.test.js`): la lista es lo que el usuario lee
  para corregir, y si nombra la fila equivocada manda a arreglar un dato que
  estaba bien.

**El botón de descarga no se deshabilita nunca.** Quien decide si el archivo sale
es `exportTxt()`, con el booleano que devuelve `validateGrid()`: si algo bloquea,
no descarga y hace `scrollIntoView` al panel. Un botón apagado no explica qué
falta —y con la grilla desplazada a lo ancho, la celda roja puede ni verse—;
la lista sí, y solo aparece cuando hace falta. `statusMessage` sigue mostrando el
resumen al lado del botón.

El panel se esconde solo cuando no queda ningún error, incluido el cambio a un
generador sin columnas. El valor que se muestra lo escribió el usuario: va por
`escapeHtml()`. El ícono del título vive estático en `index.html` a propósito —
`renderErrorList()` corre en cada tecleo y reescribir un `data-lucide` obligaría
a un `lucide.createIcons()` por letra.

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
si cambiás una regla o el label de una columna, el item que le corresponde va en
el mismo commit. Hay dos formas válidas y conviven: **una por columna** (Pago de
Servicios: mismo label y mismo orden que la grilla, es lo más fácil de auditar) o
**por tema** (Pago a Terceros, donde las reglas cruzan columnas — "Cuenta
destino" cubre forma de pago, institución, tipo y número, y separarlo en cuatro
items perdería la relación). Elegí una y respetala dentro del generador. Las
columnas `hidden` no llevan item — si hace falta explicar por qué no están, va
en el `notice` (es el caso del Monto Máx de Pago de Servicios).

## Convenciones

- Estilos con clases de Tailwind inline en el markup y en los template strings.
  `styles.css` es solo para lo que Tailwind no cubre (fondo punteado, date
  picker nativo, y el desplazamiento horizontal de la grilla: el
  `min-width: max-content` que hace desbordar la tabla en vez de comprimirla, y
  la barra de scroll con estilo propio en claro y oscuro).
- Funciones y estado como globales en `script.js`; sin módulos ni bundler. Las
  pestañas usan `onclick` inline, así que las funciones que se llamen desde el
  HTML generado tienen que quedar en el scope global.
- La UI está toda en español. Los `id` de columnas y las claves de storage, en
  snake_case sin tildes.
- Las clases de los inputs salen de `getBaseInputClass()`, `getErrorInputClass()`,
  `getPendingInputClass()` y `getMetadataInputClass(field, state)` — la
  validación las reasigna enteras, no toca clases sueltas. Si agregás estilos a
  un input, van ahí. Los tres estados de un campo general comparten el padding a
  propósito: si difieren, el campo cambia de tamaño al validarse. Misma idea en `getSidebarToggleClass()` para el botón de Ayuda.
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

## Formatos de campos separados (`exportSeparator` o `exportRow`)

Pago de Servicios y Pago a Terceros exportan campos separados con extensión
`.txt`. **Cada formato usa un separador distinto y no hay uno "por defecto" que
sirva:**

| Generador | Separador | Dónde se declara |
| --------- | --------- | ---------------- |
| Pago de Servicios | punto y coma `;` | `exportSeparator: ';'` |
| Pago a Terceros | tabulación `\t` | el `.join('\t')` de su `exportRow` |

Consecuencia, en los dos: **ningún campo de texto puede contener el separador de
su formato**, o el archivo se desalinea. Los campos libres lo previenen con
reglas del tipo `/^[^\t]{1,40}$/` en lugar de contar solo el largo — si agregás
un campo de texto, seguí esa forma, con el carácter que use ese generador. Al
revés también importa: cuando Pago a Terceros pasó de coma a tabulación, la coma
dejó de ser un carácter prohibido, y las reglas tuvieron que dejarla entrar
—`Proveedor, S.A.` es una razón social como cualquier otra—.

Pago de Servicios no tiene `exportRow`, así que cae en el `join` genérico de
`exportTxt()`, que usa `gen.exportSeparator` (por defecto `,`). Es la única forma
declarativa hoy: un generador nuevo sin `exportRow` que necesite otro separador
solo tiene que declarar `exportSeparator`. Pago a Terceros arma la línea a mano,
así que el separador vive en su `exportRow` — si algún día lo necesita otro
formato, ahí conviene pasarle `gen` a `exportRow` en vez de repetir el carácter.

Los campos con largo fijo dentro de la línea (el valor de 13 dígitos de Pago a
Terceros, la cuenta de empresa de 10) se arman con `padLeft` en `exportValue` o
en `exportRow`, no en la validación: la grilla acepta lo que el usuario escribe
natural (`12645.76`) y el relleno pasa al exportar.

**Los ceros a la izquierda nunca se le piden al usuario.** Excel se los come a
todo lo que le parezca un número, así que una planilla real llega con la cédula
`0912378320` convertida en `912378320` y el código `0017` en `17`. Pedirle que
los reponga a mano es pedirle que arregle la planilla fila por fila. La regla es
que **la regla acepta el valor sin ceros y `exportValue` los repone**
(`formatTerceroAccount`, `formatTerceroId`, `formatTerceroInstitucion`). Dos
cosas que van con eso:

- **El relleno completa, no arregla.** Las reglas siguen exigiendo un valor
  plausible: la cédula acepta 9 o 10 dígitos porque lo que falta es el cero de la
  provincia, pero una de 8 se sigue marcando en rojo. Rellenar cualquier cosa
  cambiaría un error visible por un dato plausible y equivocado, que es el peor
  de los dos.
- **Si el valor se usa para decidir, se compara ya rellenado.** El código de
  institución no se rellena solo al exportar: `isBancoGuayaquil()` lo normaliza
  antes de comparar, o escribir `17` haría que la cuenta del campo 11 se validara
  contra la regla de otra institución y saliera sin sus ceros.

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
