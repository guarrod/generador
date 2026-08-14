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

### El campo 5 puede no entrar en su propio largo

El campo 5 (Código) no se carga: el artículo lo define como copia de otro campo
de la misma línea —con `CTA` el número de cuenta del proveedor, en ventanilla su
identificación— así que el generador lo deriva.

El problema es del propio documento del banco: declara el campo 5 en
**Alfanumérico/20** y el 11 en **Alfanumérico/30** para cuentas de otra
institución financiera. Una cuenta de más de 20 caracteres entra en el campo 11 y
no en el 5.

Hoy sale **completa**, aunque se pase del largo: cortarla mandaría al archivo un
número de cuenta plausible y equivocado, que es el peor de los dos errores. La
grilla no lo marca, porque la cuenta que el usuario cargó es válida.

**Cómo cerrarlo:** preguntar al banco qué gana cuando los dos campos no pueden
decir lo mismo. Mientras tanto es un caso raro —solo con `CTA` en una institución
que no es BG y una cuenta de más de 20—, pero conviene saberlo antes de que
aparezca.

## Decisiones conocidas

- **La grilla de Pago a Terceros pide 9 de los 20 campos.** Los otros 11 los arma
  `exportRow`: los que el formato fija (1 `PA`, 6 `USD`), los que deriva (3, el
  secuencial; 5, el código) y los opcionales, que viajan vacíos (4, 15, 16, 17,
  18 y 20). Las 20 posiciones salen igual. Consecuencias que conviene tener
  presentes:
  - **El banco no le avisa por correo al beneficiario.** Ese aviso viaja en el
    campo 20 (`|proveedor@mail.com`), el único lugar del formato donde va la
    dirección. Es un dato de cada proveedor, no del archivo, así que —a
    diferencia de la cuenta de la empresa— no se puede reponer con un campo
    general: para volver a mandarlos, el campo 20 tiene que ser columna otra vez.
    Ya pasó una vez: el commit `9eeb199` revirtió un cambio parecido por este
    motivo.
  - **La cuenta de la empresa es del archivo, no de la fila.** El formato la
    define por línea (campo 2), pero es siempre la misma: la que se debita. Al
    subirla a campo general se carga una vez y desaparece la posibilidad de que
    un dedazo en una fila del medio arme una orden que debite dos cuentas
    distintas — antes nada lo marcaba.
  - **El secuencial ya no se puede editar.** Se numera sobre las líneas del
    archivo. El artículo lo vincula al desglose de rubros de los pagos en
    ventanilla; si alguna vez hay que expresar esos desgloses, vuelve a ser una
    columna.
  - **La localidad de pago viaja siempre en blanco**, que para el banco es
    "cualquier localidad". Si hace falta dirigir un pago en ventanilla a una
    ciudad, vuelve a ser una columna.
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

Corre sola en cada push y en cada pull request
([.github/workflows/tests.yml](../.github/workflows/tests.yml)), sobre cualquier
rama y sin instalar nada.

Las suites comprueban las reglas de validación y, sobre todo, **la línea que sale
al archivo**. Es la parte que el banco rechaza si se rompe, y la que no se nota
mirando la pantalla. Si tocan una regla o el formato de exportación, la suite
tiene que acompañar el cambio en el mismo commit.

Están organizadas alrededor del riesgo de arrastre entre formatos:

- **`motor.test.js`** fija el contrato de las funciones compartidas contra
  generadores de mentira, así que no depende de qué entrega esté instalada. Es
  la que avisa cuando un arreglo pensado para un formato le cambia el
  comportamiento a los otros.
- **Una suite por generador**, cada una con un **golden file**: un fixture que se
  pega como desde Excel y el `.txt` exacto que tiene que salir. Si el motor
  cambia y mueve un solo carácter de ese archivo, falla.

Ver [ARCHITECTURE.md](../ARCHITECTURE.md) para cuándo un cambio pertenece a la
config y cuándo es un cambio de contrato para todos los generadores.
