// El motor compartido, sin pasar por ningún generador real.
//
// Por qué existe esta suite: cambiar el objeto de un generador en APP_CONFIG no
// puede afectar a los otros — son datos separados. El riesgo de romper un
// formato tocando otro está acá, en las funciones que los tres comparten. Un
// arreglo pensado para un generador que toca `isCellValid`, `getExportValue` o
// `createEmptyRow` cambia el comportamiento de todos a la vez.
//
// Estas verificaciones fijan el contrato de esas funciones contra generadores
// de mentira. Si alguien necesita cambiarlo, el test falla y obliga a decidirlo
// a propósito en vez de descubrirlo en producción.
const { cargarApp } = require('./harness.js');

// Generador artificial: no es ninguno de los reales, así que no depende de qué
// entrega esté instalada.
const FALSO = {
    id: '_motor', label: 'Motor', title: 'x', description: 'x',
    storageKey: '_motor_data',
    columns: [
        { id: 'libre', label: 'Libre', rule: /^[^,]{1,10}$/, error: 'x' },
        { id: 'opcional', label: 'Opcional', rule: /^\d{0,4}$/, error: 'x', optional: true },
        { id: 'preseteada', label: 'Preseteada', rule: /^\w+$/, error: 'x', defaultValue: 'FIJO' },
        { id: 'numerada', label: 'Numerada', rule: /^\d+$/, error: 'x', defaultValue: i => String(i + 1) },
        { id: 'transformada', label: 'Transformada', rule: /^[a-z]+$/i, error: 'x', exportValue: v => v.toUpperCase() },
        { id: 'condicional', label: 'Condicional', error: 'x', rule: (valor, fila) => fila.libre === 'con' ? valor !== '' : valor === '' },
        { id: 'escondida', label: 'Escondida', rule: /^.*$/, error: 'x', optional: true, hidden: true },
    ],
};

module.exports = {
    nombre: 'Motor compartido',
    correr({ check }) {
        const t = cargarApp();
        const app = t.app;
        const col = id => FALSO.columns.find(c => c.id === id);

        // ── isCellValid: regex, opcional y regla de función ──────────────────
        check('regex: cumple', app.isCellValid(col('libre'), 'hola', {}), true);
        check('regex: no cumple', app.isCellValid(col('libre'), 'a'.repeat(11), {}), false);
        check('obligatoria vacía es inválida', app.isCellValid(col('libre'), '', {}), false);
        check('optional: vacía es válida', app.isCellValid(col('opcional'), '', {}), true);
        check('optional: con valor sigue validándose', app.isCellValid(col('opcional'), 'abc', {}), false);
        // Con regla de función, `optional` no aplica: la función decide también
        // el caso vacío. Es lo que permite exigir que una celda esté vacía.
        check('función: exige valor cuando corresponde', app.isCellValid(col('condicional'), 'algo', { libre: 'con' }), true);
        check('función: exige vacío cuando corresponde', app.isCellValid(col('condicional'), 'algo', { libre: 'sin' }), false);
        check('función: vacío válido si la regla lo dice', app.isCellValid(col('condicional'), '', { libre: 'sin' }), true);
        check('sin rule, cualquier valor vale', app.isCellValid({ id: 'x' }, 'lo que sea', {}), true);

        // ── getExportValue: trimea y aplica exportValue ──────────────────────
        check('exporta la celda tal cual', app.getExportValue(col('libre'), { libre: 'hola' }), 'hola');
        check('trimea antes de exportar', app.getExportValue(col('libre'), { libre: '  hola  ' }), 'hola');
        check('aplica exportValue', app.getExportValue(col('transformada'), { transformada: 'abc' }), 'ABC');
        check('exportValue recibe el valor ya trimmeado', app.getExportValue(col('transformada'), { transformada: ' abc ' }), 'ABC');
        check('celda ausente exporta vacío', app.getExportValue(col('libre'), {}), '');

        // ── defaultValue: valor fijo y función del número de fila ────────────
        check('sin defaultValue nace vacía', app.getColumnDefault(col('libre'), 0), '');
        check('defaultValue fijo', app.getColumnDefault(col('preseteada'), 0), 'FIJO');
        check('defaultValue fijo no depende de la fila', app.getColumnDefault(col('preseteada'), 7), 'FIJO');
        check('defaultValue función, fila 1', app.getColumnDefault(col('numerada'), 0), '1');
        check('defaultValue función, fila 8', app.getColumnDefault(col('numerada'), 7), '8');

        const fila = app.createEmptyRow(FALSO, 3);
        check('createEmptyRow crea todas las columnas', Object.keys(fila).sort(), FALSO.columns.map(c => c.id).sort());
        check('createEmptyRow aplica los preseteos', [fila.preseteada, fila.numerada], ['FIJO', '4']);
        check('createEmptyRow deja vacío lo demás', [fila.libre, fila.transformada], ['', '']);
        check('incluye las columnas ocultas', 'escondida' in fila, true);

        // ── hidden: fuera de la grilla, dentro del archivo ───────────────────
        check('getVisibleColumns saca las ocultas', app.getVisibleColumns(FALSO).map(c => c.id),
            FALSO.columns.filter(c => c.id !== 'escondida').map(c => c.id));
        check('pero siguen en columns', FALSO.columns.length, app.getVisibleColumns(FALSO).length + 1);

        // ── Los campos generales tienen los mismos tres estados que la grilla ─
        // Vacío es "pendiente", no error: el campo arranca vacío y pintarlo de
        // rojo apenas se abre la app le señala al usuario un error que todavía no
        // cometió. Los dos bloquean la descarga igual, así que el corte es
        // visual — pero es el que hace que la app no reciba a nadie en rojo.
        const campoGeneral = { id: 'general', label: 'General', rule: /^\d{1,4}$/, error: 'x' };
        const estadoCon = valor => { t.setMetadata({ general: valor }); return app.getMetadataState(campoGeneral); };
        check('campo general vacío: pendiente, no error', estadoCon(''), 'pending');
        check('campo general con espacios: pendiente', estadoCon('   '), 'pending');
        check('campo general que no cumple la regla: error', estadoCon('12345'), 'error');
        check('campo general que la cumple: válido', estadoCon('123'), 'valid');
        check('el pendiente no se pinta de rojo', app.getMetadataInputClass(campoGeneral, 'pending').includes('red'), false);
        check('el pendiente va punteado, como en la grilla', app.getMetadataInputClass(campoGeneral, 'pending').includes('border-dashed'), true);
        check('el error sí se pinta de rojo', app.getMetadataInputClass(campoGeneral, 'error').includes('border-red-500/50'), true);
        // El input no puede cambiar de tamaño al pasar de un estado a otro.
        check('los tres estados tienen el mismo padding',
            new Set(['valid', 'pending', 'error'].map(s => app.getMetadataInputClass(campoGeneral, s).includes('p-3'))), new Set([true]));
        t.setMetadata({});

        // ── isRowEmpty: se mide contra las columnas declaradas ───────────────
        // La fila vacía decide dos cosas: qué filas van al archivo y cuáles
        // bloquean la descarga por incompletas. Se mira columna por columna y no
        // `Object.values(row)` porque los datos guardados conservan las claves de
        // una config anterior: al sacar una columna, su valor queda en
        // localStorage y una fila que en pantalla se ve vacía seguiría contando
        // como registro — sin forma de borrarla, porque la grilla no borra filas.
        check('sin ninguna celda con valor está vacía', app.isRowEmpty({}, FALSO), true);
        check('una celda con valor la hace no vacía', app.isRowEmpty({ libre: 'algo' }, FALSO), false);
        // Con preseteos la fila nueva ya trae contenido: cuenta como registro
        // desde que se crea. Es lo de siempre, queda fijado acá.
        check('los preseteos hacen que la fila nueva cuente', app.isRowEmpty(app.createEmptyRow(FALSO, 0), FALSO), false);
        check('los espacios no cuentan como valor', app.isRowEmpty({ libre: '   ' }, FALSO), true);
        check('una clave que ya no es columna no la hace no vacía', app.isRowEmpty({ columna_vieja: 'PA' }, FALSO), true);
        check('la columna oculta sí cuenta', app.isRowEmpty({ escondida: 'algo' }, FALSO), false);
        check('un generador sin columnas no tiene filas con contenido', app.isRowEmpty({ libre: 'algo' }, { id: 'x' }), true);

        // ── padLeft / padRight: no son simétricos ────────────────────────────
        check('padLeft rellena con ceros a la izquierda', app.padLeft('123', 6), '000123');
        check('padRight rellena con espacios a la derecha', app.padRight('abc', 6), 'abc   ');
        check('padLeft con número', app.padLeft(7, 3), '007');
        check('padLeft de valor vacío', app.padLeft('', 3), '000');
        check('padRight de valor vacío', app.padRight('', 3), '   ');
        // Documentado en docs/estado.md como supuesto abierto: hoy TRUNCAN. Si
        // alguien los cambia para que fallen fuerte, este test tiene que cambiar
        // con él — y ahí se ve que afecta a los tres generadores, no a uno.
        check('padLeft trunca si el valor es más largo (hoy)', app.padLeft('123456', 3), '123');
        check('padRight trunca si el valor es más largo (hoy)', app.padRight('abcdef', 3), 'abc');

        // ── formatDate ───────────────────────────────────────────────────────
        check('formatDate es AAAAMMDD', app.formatDate(new Date(2026, 0, 5)), '20260105');
        check('formatDate rellena mes y día', app.formatDate(new Date(2026, 11, 31)), '20261231');

        // ── El nombre del archivo ────────────────────────────────────────────
        check('defaultFilename string', app.getDefaultFilename({ defaultFilename: 'archivo' }), 'archivo');
        check('defaultFilename función', app.getDefaultFilename({ defaultFilename: () => 'dinamico' }), 'dinamico');
        check('sin defaultFilename', app.getDefaultFilename({}), '');
        check('filename función deshabilita el campo', app.hasAutoFilename({ filename: () => 'x' }), true);
        check('defaultFilename no lo deshabilita', app.hasAutoFilename({ defaultFilename: () => 'x' }), false);

        // ── Invariante de `hidden` ───────────────────────────────────────────
        // Una columna oculta no se valida —nadie puede corregir un error que no
        // ve, y la descarga no se bloquearía nunca por ella— y el usuario no
        // puede cambiarle el valor: la celda se queda para siempre con lo que le
        // puso `defaultValue`, o vacía. Esconderla es seguro si y solo si ESE
        // valor es válido, y lo tiene que ser pase lo que pase en el resto de la
        // fila, porque las reglas de función miran las otras celdas.
        //
        // Cubre las tres formas de que lo sea: la columna es `optional`, tiene un
        // `defaultValue` que cumple su propia regla, o su regla de función acepta
        // el vacío en cualquier caso (es lo de Localidad de pago: con CTA el
        // formato la exige en blanco, y con CHQ o EFE en blanco significa
        // "cualquier localidad").
        //
        // Recorre TODOS los generadores instalados: si alguien esconde una
        // columna que puede quedar inválida, falla acá y no en un archivo que el
        // banco rechaza.
        const filasRepresentativas = g => {
            const filas = [{}];
            (g.columns || []).filter(c => c.options).forEach(c =>
                c.options.forEach(opcion => filas.push({ [c.id]: opcion })));
            return filas;
        };
        app.APP_CONFIG.generators.forEach(g => {
            const filas = filasRepresentativas(g);
            (g.columns || []).filter(c => c.hidden).forEach(c => {
                const valor = app.getColumnDefault(c, 0);
                const rotas = filas.filter(fila => !app.isCellValid(c, valor, fila));
                check(`oculta y segura · ${g.id} → ${c.label}`, rotas, []);
            });
        });

        // ── Los generadores instalados no comparten estado ───────────────────
        const generadores = app.APP_CONFIG.generators;
        const claves = generadores.flatMap(g => [g.storageKey, g.metadataKey, g.filenameKey].filter(Boolean));
        check('cada generador guarda en su propia clave', claves.length, new Set(claves).size);
        check('los ids son únicos', generadores.length, new Set(generadores.map(g => g.id)).size);
        check('todas las claves llevan prefijo propio', claves.every(k => k.startsWith('bg_gen_')), true);
    },
};
