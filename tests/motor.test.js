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

        // ── collectErrors: la lista que se muestra al pie ────────────────────
        // Es lo que el usuario lee para saber qué corregir, así que lo que
        // importa no es cuántas entradas hay sino que cada una apunte a la celda
        // correcta: si nombra otra fila, manda a arreglar un dato que estaba
        // bien. Va sobre los datos, no sobre los inputs, y por eso se puede
        // verificar acá.
        const errores = (gen, filas, metadata = {}) => app.collectErrors(gen, filas, metadata);
        const filaSana = app.createEmptyRow(FALSO, 0);

        check('sin filas no hay errores', errores(FALSO, []), []);
        check('una fila válida no aporta errores', errores(FALSO, [filaSana]), []);
        check('una celda inválida entra con su estado, ubicación, campo, valor y mensaje',
            errores(FALSO, [{ ...filaSana, libre: 'a,b' }]),
            [{ estado: 'error', ubicacion: 'Fila 1', campo: 'Libre', valor: 'a,b', mensaje: 'x' }]);
        check('el valor va trimmeado, como lo valida la grilla',
            errores(FALSO, [{ ...filaSana, libre: '  a,b  ' }])[0].valor, 'a,b');
        // Las filas se numeran como las ve el usuario, desde 1.
        check('la numeración arranca en 1',
            errores(FALSO, [filaSana, filaSana, { ...filaSana, libre: 'a,b' }])[0].ubicacion, 'Fila 3');
        // Vacío es pendiente, no error: la lista quedaría llena de campos que el
        // usuario todavía no tocó. Cuántos faltan ya lo dice statusMessage.
        check('la celda obligatoria vacía no entra en la lista',
            errores(FALSO, [{ ...filaSana, libre: '' }]), []);
        check('la fila entera vacía tampoco',
            errores(FALSO, [app.createEmptyRow({ id: 'x', columns: FALSO.columns }, 0), {}]), []);
        check('varios errores de una misma fila entran todos',
            errores(FALSO, [{ ...filaSana, libre: 'a,b', opcional: 'abc' }]).map(e => e.campo),
            ['Libre', 'Opcional']);

        // Una columna oculta no se puede corregir desde la pantalla: listar un
        // error suyo deja al usuario con la descarga bloqueada y sin dónde
        // tocar. Por eso la lista recorre las visibles, igual que la validación.
        const CON_OCULTA_ROTA = {
            ...FALSO,
            columns: [...FALSO.columns, { id: 'rota', label: 'Rota', rule: /^$/, error: 'x', hidden: true }],
        };
        check('la columna oculta no entra en la lista',
            errores(CON_OCULTA_ROTA, [{ ...filaSana, rota: 'algo' }]), []);

        // Los campos generales comparten la lista con la grilla: para el usuario
        // son lo mismo, cosas que tiene que arreglar antes de descargar. Van
        // primero porque uno solo puede invalidar el archivo entero.
        const CON_GENERAL = { ...FALSO, metadata: [{ id: 'general', label: 'General', rule: /^\d{1,4}$/, error: 'x' }] };
        check('un campo general inválido entra con ubicación propia',
            errores(CON_GENERAL, [], { general: '12345' }),
            [{ estado: 'error', ubicacion: 'General', campo: 'General', valor: '12345', mensaje: 'x' }]);
        check('el campo general vacío no entra', errores(CON_GENERAL, [], { general: '' }), []);
        check('los campos generales van antes que la grilla',
            errores(CON_GENERAL, [{ ...filaSana, libre: 'a,b' }], { general: '12345' }).map(e => e.ubicacion),
            ['General', 'Fila 1']);
        check('un generador sin metadata no rompe la lista', errores(FALSO, [], { general: '12345' }), []);

        // ── Después de presionar Descargar entra también lo que falta ───────
        // El botón está siempre habilitado y las validaciones corren al
        // presionarlo. Ahí el corte cambia: hasta ese momento un campo vacío es
        // "todavía no llegué" y no se lista; después del intento el usuario ya
        // dijo que terminó, y necesita ver todo lo que lo separa del archivo.
        const conPendientes = (gen, filas, metadata = {}) => app.collectErrors(gen, filas, metadata, true);

        check('la celda vacía obligatoria sí entra después del intento',
            conPendientes(FALSO, [filaSana]).map(e => e.campo), ['Libre', 'Transformada']);
        // El estado es lo que separa "está mal cargado" de "falta completarlo";
        // el mensaje sigue siendo el de la columna, sin prefijos.
        check('y se distingue por su estado', conPendientes(FALSO, [filaSana])[0].estado, 'falta');
        check('sin cambiarle el mensaje a la columna', conPendientes(FALSO, [filaSana])[0].mensaje, 'x');
        check('la que falta no muestra valor', conPendientes(FALSO, [filaSana])[0].valor, '');
        // Una columna sin `error` propio necesita decir algo igual. La segunda
        // columna va llena para que la fila cuente como registro: si no, la
        // única entrada sería la de la grilla vacía.
        const SIN_MENSAJE = { columns: [{ id: 'x', label: 'X', rule: /^\d+$/ }, { id: 'lleno', label: 'Lleno' }] };
        check('sin mensaje de columna, uno por defecto',
            conPendientes(SIN_MENSAJE, [{ x: '', lleno: 'algo' }])[0].mensaje, 'Este campo es obligatorio');
        // Vacía y válida no falta: la opcional no tiene por qué completarse.
        check('la columna opcional vacía no entra',
            conPendientes(FALSO, [filaSana]).some(e => e.campo === 'Opcional'), false);
        check('el error y lo pendiente conviven en la misma lista',
            conPendientes(FALSO, [{ ...filaSana, libre: 'a,b' }]).map(e => e.campo), ['Libre', 'Transformada']);
        check('el campo general vacío entra como falta',
            conPendientes(CON_GENERAL, [filaSana], { general: '' })[0],
            { estado: 'falta', ubicacion: 'General', campo: 'General', valor: '', mensaje: 'x' });
        // Sin esto, presionar Descargar con la grilla vacía no muestra nada: no
        // hay ninguna celda de la que quejarse y el motivo es que no hay filas.
        check('la grilla sin registros lo dice', conPendientes(FALSO, []).map(e => e.campo), ['La grilla está vacía']);
        check('una fila entera vacía tampoco es un registro',
            conPendientes(FALSO, [{}]).map(e => e.campo), ['La grilla está vacía']);
        check('con un registro cargado ya no lo dice',
            conPendientes(FALSO, [filaSana]).some(e => e.campo === 'La grilla está vacía'), false);
        // No es de ninguna fila: va sin etiqueta de ubicación.
        check('la grilla vacía no lleva ubicación', conPendientes(FALSO, [])[0].ubicacion, '');
        // Antes del intento nada de esto se muestra.
        check('sin intento de descarga la lista sigue vacía', errores(FALSO, [filaSana]), []);

        // ── renderErrorList: el panel entra y sale solo ──────────────────────
        const panel = t.nodos['error-panel'];
        const titulo = t.nodos['error-panel-title'];
        const lista = t.nodos['error-list'];

        app.renderErrorList(errores(FALSO, [{ ...filaSana, libre: 'a,b' }]));
        check('con errores el panel se muestra', panel.classList.contains('hidden'), false);
        // "campos" y no "errores": después del intento de descarga la lista
        // también trae lo que falta completar, que no es un error de nadie.
        check('el título cuenta el campo', titulo.textContent, '1 campo impide la descarga');
        check('el item nombra la fila y el campo',
            [lista.innerHTML.includes('Fila 1'), lista.innerHTML.includes('Libre')], [true, true]);

        app.renderErrorList(errores(FALSO, [{ ...filaSana, libre: 'a,b' }, { ...filaSana, libre: 'c,d' }]));
        check('el título va en plural con más de uno', titulo.textContent, '2 campos impiden la descarga');

        app.renderErrorList([]);
        check('sin errores el panel se oculta', panel.classList.contains('hidden'), true);
        check('y no deja items viejos en pantalla', lista.innerHTML, '');

        // El valor lo escribió el usuario y se interpola en HTML: va escapado.
        app.renderErrorList([{ ubicacion: 'Fila 1', campo: 'Libre', valor: '<img src=x>', mensaje: 'x' }]);
        check('el valor del usuario va escapado', lista.innerHTML.includes('&lt;img src=x&gt;'), true);

        // ── El color dice de qué se trata cada línea ─────────────────────────
        const cabecera = t.nodos['error-panel-head'];
        const falta = { estado: 'falta', ubicacion: 'Fila 1', campo: 'Libre', valor: '', mensaje: 'x' };
        const malCargado = { estado: 'error', ubicacion: 'Fila 2', campo: 'Libre', valor: 'a,b', mensaje: 'x' };

        app.renderErrorList([falta]);
        check('lo que falta va en ámbar, no en rojo',
            [lista.innerHTML.includes('amber'), lista.innerHTML.includes('red')], [true, false]);
        check('y sin valor dice en qué estado está', lista.innerHTML.includes('sin completar'), true);
        check('la cabecera acompaña: nadie recibe rojo por no haber terminado',
            [cabecera.className.includes('amber'), cabecera.className.includes('red')], [true, false]);

        app.renderErrorList([malCargado]);
        check('lo mal cargado va en rojo', lista.innerHTML.includes('border-l-red-500'), true);
        check('y muestra el valor tal como se escribió', lista.innerHTML.includes('a,b'), true);

        // Con las dos cosas juntas manda el rojo: es lo más grave de la lista.
        app.renderErrorList([falta, malCargado]);
        check('mezclados, la cabecera va en rojo', cabecera.className.includes('red'), true);
        check('pero cada línea conserva su color',
            [lista.innerHTML.includes('border-l-amber-500'), lista.innerHTML.includes('border-l-red-500')], [true, true]);

        // Sin ubicación no se imprime una etiqueta vacía, que se vería como un
        // recuadro de color sin texto.
        app.renderErrorList([{ estado: 'falta', ubicacion: '', campo: 'La grilla está vacía', valor: '', mensaje: 'x' }]);
        check('la entrada sin ubicación no lleva etiqueta', lista.innerHTML.includes('uppercase'), false);
        check('pero mantiene la sangría de la columna', lista.innerHTML.includes('sm:w-28'), true);
        app.renderErrorList([]);

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
