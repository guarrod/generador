# Estado, supuestos y plan de entregas

Léelo antes de tocar código. Recoge lo que no se deduce leyendo el repo: qué
llega en esta entrega, qué falta, y las decisiones que ya están tomadas —
incluidas las que conviene revisar.

## Alcance de esta entrega

Dos generadores —**Pago de Servicios** y **Pago a Terceros**— y la barra de
pestañas para saltar entre ellos. Cada uno guarda sus datos por separado en
`localStorage`.

El formato de Pago a Terceros está transcrito campo por campo en
[formato-pago-terceros.md](formato-pago-terceros.md), porque la página del banco
no se puede consultar de forma automática.

## Lo que viene después

| Entrega | Contenido |
| ------- | --------- |
| 1 | Pago de Servicios, sin pestañas |
| 2 (esta) | + Pago a Terceros (Cash Management). Vuelve la barra de pestañas |
| 3 | + Recaudación Batch (RECAUDOS17_TC), formato de ancho fijo de 124 caracteres |

**No colapsen el array de generadores ni saquen `getActiveConfig()`.** Es lo que
hace que la entrega 3 sea agregar un objeto y no reescribir el render. Por la
misma razón quedan en el árbol algunos helpers que todavía no llama nadie: son
del generador que llega después.

## Supuestos abiertos

Cosas que hoy funcionan pero no están confirmadas contra el banco. Si alguna
resulta falsa, el archivo sale mal aunque la app no marque ningún error.

### El separador de campos no está documentado

El artículo del centro de ayuda de Banco Guayaquil describe los campos de Pago a
Terceros uno por uno, pero **nunca dice cómo se separan**: no menciona coma ni
punto y coma, no trae línea de ejemplo y no tiene adjuntos. La coma que usa el
generador —y toda la regla de "ningún campo de texto puede contener comas"— viene
del generador oficial del banco, no de esa fuente.

Pago de Servicios usa punto y coma (`exportSeparator: ';'`), heredado igual.

**Cómo cerrarlo:** conseguir un `.txt` que el banco ya haya aceptado y comparar
una línea contra la salida de la herramienta.

### El relleno trunca en silencio

`padLeft()` y `padRight()` cortan con `slice` cuando el valor es más largo que el
campo. Una cuenta de 11 dígitos se exporta con los primeros 10 —debitando otra
cuenta— y un monto de 12 enteros se exporta como **otro monto**. Hoy no se puede
llegar a eso desde la pantalla porque la validación bloquea la descarga antes,
pero es el último eslabón y ante un dato imposible elige el modo de falla más
peligroso: un valor plausible y equivocado, en vez de romper ruidosamente.

**Sugerencia:** que lancen una excepción en lugar de truncar. El costo es nulo y
convierte un error silencioso en uno visible.

### Un valor de `0.00` pasa la validación

Ninguna regla exige que el monto sea mayor a cero. El formato tampoco lo prohíbe,
pero una línea de pago por cero es casi siempre un error de carga.

### La cuenta de la empresa se carga por fila y nadie compara entre filas

El formato define la cuenta de la empresa por línea (campo 2), así que es una
columna más de la grilla. La regla verifica que sean hasta 10 dígitos, pero
**no** que todas las filas del archivo tengan la misma. Un dedazo en una fila del
medio arma una orden que debita dos cuentas distintas sin que nada lo marque.
Vale la pena una advertencia cuando una fila se aparta del resto.

## Decisiones conocidas

- **Tailwind se carga por CDN** (`cdn.tailwindcss.com`), que la propia
  documentación de Tailwind desaconseja para producción. Sirve para una
  herramienta interna sin build; si esto va a un entorno productivo real, hay que
  compilar el CSS.
- **Todo vive en `localStorage`**, sin backend: los datos no salen del navegador.
  Es una decisión de diseño, no una limitación pendiente.
- **La UI está en español** y así debe seguir. Los `id` de columnas y las claves
  de storage van en snake_case sin tildes.
- **No hay licencia declarada.** Falta definir la titularidad del código antes de
  compartirlo fuera del equipo.

## Cómo verificar un cambio

```bash
node tests/run.js
```

Las suites comprueban las reglas de validación y, sobre todo, **la línea que sale
al archivo**. Es la parte que el banco rechaza si se rompe, y la que no se nota
mirando la pantalla. Si tocan una regla o el formato de exportación, la suite
tiene que acompañar el cambio en el mismo commit.
