// Pago a Terceros (Cash Management): las 20 posiciones del formato oficial.
//
// La referencia es el artículo 11032985670804 del centro de ayuda de Banco
// Guayaquil, transcrito en docs/formato-pago-terceros.md. Cada verificación de
// la línea exportada corresponde a una fila de esa tabla.
//
// La grilla pide 9 de los 20 campos; los otros 11 los arma `exportRow`. Por eso
// las verificaciones de acá abajo se dividen en dos: que la grilla pida lo que
// hay que decidir, y que la línea siga teniendo las 20 posiciones del formato,
// con lo mismo en cada una.
//
// OJO: el artículo no dice cuál es el separador. La coma es un supuesto
// heredado del generador oficial del banco — ver docs/estado.md.
const fs = require('fs');
const path = require('path');
const { cargarApp } = require('./harness.js');

// Una orden válida, con crédito en cuenta de Banco Guayaquil.
const BASE = {
    valor: '12645.76', forma_pago: 'CTA', codigo_institucion: '0017', tipo_cuenta: 'AHO',
    numero_cuenta: '1234567', tipo_id: 'C', numero_id: '0912378320', nombre: 'Proveedor S.A.',
    referencia: 'FAC-001-002-000001234',
};

// La cuenta de la empresa es una sola para todo el archivo: campo general.
const META = { cuenta_empresa: '1234567' };

module.exports = {
    nombre: 'Pago a Terceros · formato oficial de BG',
    correr({ check, saltear }) {
        const t = cargarApp();
        const gen = t.generador('pago_terceros');
        if (!gen) return saltear('el generador no está en esta entrega');
        const col = id => gen.columns.find(c => c.id === id);

        // ── Lo que la grilla pide ───────────────────────────────────────────
        check('la grilla pide 9 de los 20 campos', gen.columns.length, 9);
        check('ninguna columna oculta: lo que se ve es lo que se carga', gen.columns.filter(c => c.hidden).length, 0);
        check('las columnas están en el orden del formato', gen.columns.map(c => c.id), [
            'valor', 'forma_pago', 'codigo_institucion', 'tipo_cuenta', 'numero_cuenta',
            'tipo_id', 'numero_id', 'nombre', 'referencia',
        ]);
        // Los campos que el formato fija o deriva ya no se cargan. Si alguno
        // vuelve a ser columna, su valor deja de salir de exportRow.
        check('los campos que no se deciden no son columnas',
            ['codigo_orientacion', 'cuenta_empresa', 'secuencial_pago', 'comprobante', 'codigo',
                'moneda', 'direccion', 'ciudad', 'telefono', 'localidad_pago',
                'referencia_adicional'].filter(id => col(id)), []);
        check('ninguna celda nace preseteada: los preseteos son del exportRow',
            Object.values(t.fila(gen, {}, 3)).filter(v => v !== ''), []);

        // La cuenta de la empresa es del archivo, no del beneficiario.
        check('la cuenta de la empresa es campo general', gen.metadata.map(f => f.id), ['cuenta_empresa']);
        check('y guarda en su propia clave', gen.metadataKey, 'bg_gen_pago_terceros_metadata');
        const reglaCuenta = gen.metadata[0].rule;
        check('cuenta de la empresa: hasta 10 dígitos', reglaCuenta.test('1234567'), true);
        check('cuenta de la empresa: 11 dígitos no', reglaCuenta.test('12345678901'), false);
        check('cuenta de la empresa: obligatoria', reglaCuenta.test(''), false);

        // ── Línea exportada, campo por campo contra la tabla oficial ────────
        const campos = t.linea(gen, BASE, 0, META).split(',');
        check('20 campos por línea', campos.length, 20);
        [
            [1, 'Código Orientación', 'PA'],
            [2, 'Cuenta Empresa, con ceros a la izquierda', '0001234567'],
            [3, 'Secuencial Pago, 7 dígitos desde 0000001', '0000001'],
            [4, 'Comprobante, en blanco', ''],
            [5, 'Código = la cuenta del proveedor, con su relleno', '0001234567'],
            [6, 'Moneda', 'USD'],
            [7, 'Valor: 11 enteros y 2 decimales, sin punto', '0000001264576'],
            [8, 'Forma de Pago', 'CTA'],
            [9, 'Código de Institución Financiera', '0017'],
            [10, 'Tipo de Cuenta', 'AHO'],
            [11, 'Nº Cuenta BG, con ceros a la izquierda', '0001234567'],
            [12, 'Tipo ID', 'C'],
            [13, 'Nº ID', '0912378320'],
            [14, 'Nombre del Beneficiario', 'Proveedor S.A.'],
            [15, 'Dirección, en blanco', ''],
            [16, 'Ciudad, en blanco', ''],
            [17, 'Teléfono, en blanco', ''],
            [18, 'Localidad de pago, en blanco = cualquier localidad', ''],
            [19, 'Referencia', 'FAC-001-002-000001234'],
            // Sin este campo el banco no manda la notificación por correo al
            // beneficiario: es el único lugar del formato donde va la dirección.
            [20, 'Referencia Adicional, en blanco', ''],
        ].forEach(([pos, nombre, esperado]) =>
            check(`campo ${String(pos).padStart(2)} · ${nombre}`, campos[pos - 1], esperado));

        // ── Campo 3: la posición de la línea en el archivo ──────────────────
        // Se numera al exportar, no al crear la fila: las filas vacías se
        // descartan antes, así que la secuencia nunca sale con huecos.
        check('secuencial de la línea 5', t.linea(gen, BASE, 4, META).split(',')[2], '0000005');
        check('secuencial de la línea 1000', t.linea(gen, BASE, 999, META).split(',')[2], '0001000');

        // ── Campo 5: copia de otro campo de la misma línea ──────────────────
        const codigoDe = (fila, i = 0) => t.linea(gen, { ...BASE, ...fila }, i, META).split(',')[4];
        check('CTA · el código es la cuenta, con el relleno de BG', codigoDe({ numero_cuenta: '1234567' }), '0001234567');
        check('CTA · otra institución: la cuenta sin relleno',
            codigoDe({ codigo_institucion: '0034', numero_cuenta: 'ABC123456789' }), 'ABC123456789');
        check('CHQ · el código es el Nº de ID', codigoDe({ forma_pago: 'CHQ', tipo_cuenta: '', numero_cuenta: '' }), '0912378320');
        check('EFE · el código es el Nº de ID',
            codigoDe({ forma_pago: 'EFE', tipo_cuenta: '', numero_cuenta: '', tipo_id: 'P', numero_id: 'px39582' }), 'PX39582');
        // Tensión del propio documento del banco: el campo 5 es Alfanumérico/20
        // y el 11 admite hasta 30 en otra institución. La cuenta larga sale
        // entera: cortarla en silencio mandaría al archivo un número de cuenta
        // plausible y equivocado. Ver docs/estado.md.
        check('cuenta de más de 20 en otro banco: el código NO se trunca',
            codigoDe({ codigo_institucion: '0034', numero_cuenta: 'A'.repeat(25) }), 'A'.repeat(25));

        // ── El resto de la línea ────────────────────────────────────────────
        // Ventanilla: el artículo exige 10 y 11 vacíos y la institución en 0017.
        const chq = t.linea(gen, { ...BASE, forma_pago: 'CHQ', tipo_cuenta: '', numero_cuenta: '' }, 0, META).split(',');
        check('CHQ · Tipo de Cuenta vacío', chq[9], '');
        check('CHQ · Nº Cuenta vacío', chq[10], '');
        // Otra institución financiera: la cuenta NO se rellena con ceros.
        check('otro banco · cuenta sin relleno',
            t.linea(gen, { ...BASE, codigo_institucion: '0034', numero_cuenta: 'ABC123456789' }, 0, META).split(',')[10], 'ABC123456789');
        // El monto se normaliza siempre a 13 dígitos.
        [['12645,76', '0000001264576'], ['500', '0000000050000'], ['500.5', '0000000050050']]
            .forEach(([entrada, esperado]) =>
                check(`valor "${entrada}" → ${esperado}`, t.linea(gen, { ...BASE, valor: entrada }, 0, META).split(',')[6], esperado));
        // Sin cuenta de la empresa la descarga está bloqueada por validateMetadata;
        // esto solo fija qué haría el relleno si alguien la saltara.
        check('sin cuenta de la empresa el campo 2 sale en ceros',
            t.linea(gen, BASE, 0, {}).split(',')[1], '0000000000');

        // ── Reglas que dependen de otras celdas de la fila ──────────────────
        [
            ['CTA exige tipo de cuenta', 'tipo_cuenta', '', { forma_pago: 'CTA' }, false],
            ['CHQ exige tipo de cuenta vacío', 'tipo_cuenta', 'CTE', { forma_pago: 'CHQ' }, false],
            ['EFE exige institución 0017', 'codigo_institucion', '0034', { forma_pago: 'EFE' }, false],
            ['CTA admite otra institución', 'codigo_institucion', '0034', { forma_pago: 'CTA' }, true],
            ['institución de 15 caracteres', 'codigo_institucion', '012345678901234', { forma_pago: 'CTA' }, true],
            ['cédula: 10 dígitos', 'numero_id', '0912378320', { tipo_id: 'C' }, true],
            ['cédula: 13 dígitos no', 'numero_id', '0912378320001', { tipo_id: 'C' }, false],
            ['RUC: 13 dígitos', 'numero_id', '0912378320001', { tipo_id: 'R' }, true],
            ['pasaporte: hasta 13', 'numero_id', 'PX39582', { tipo_id: 'P' }, true],
            // Sin Tipo ID no se puede saber qué largo corresponde: la celda no
            // puede darse por válida "por las dudas".
            ['sin Tipo ID no vale nada', 'numero_id', 'PX39582', { tipo_id: '' }, false],
            ['cuenta BG: hasta 10 dígitos', 'numero_cuenta', '12345678901', { forma_pago: 'CTA', codigo_institucion: '0017' }, false],
            ['cuenta de otro banco: hasta 30', 'numero_cuenta', 'ABC123456789', { forma_pago: 'CTA', codigo_institucion: '0034' }, true],
        ].forEach(([nombre, id, valor, fila, esperado]) =>
            check(nombre, t.app.isCellValid(col(id), valor, fila), esperado));

        const linea = fila => t.linea(gen, { ...BASE, ...fila }, 0, META).split(',');
        const vale = (id, valor, fila) => t.app.isCellValid(col(id), valor, { ...BASE, ...fila });

        // ── Mientras Forma de Pago siga vacía, no se juzga lo que depende ───
        // Cargar la cuenta antes de elegir cómo se paga es lo normal si venís
        // llenando la fila de izquierda a derecha. Con la celda sin elegir la
        // regla caía en la rama de ventanilla y marcaba en rojo una cuenta
        // correcta, con el mensaje de CHQ/EFE — un error que el usuario no
        // cometió y que no se arregla tocando esa celda.
        check('la cuenta no se marca antes de elegir Forma de Pago',
            t.app.isCellValid(col('numero_cuenta'), '21512151', {}), true);
        check('ni el tipo de cuenta', t.app.isCellValid(col('tipo_cuenta'), 'CTE', {}), true);
        // Y no se escapa nada: la propia Forma de Pago sigue bloqueando.
        check('pero Forma de Pago sin elegir no vale', t.app.isCellValid(col('forma_pago'), '', {}), false);
        // Al elegir, las dos vuelven a juzgarse contra la rama que toca.
        check('elegida CTA, la cuenta se valida', vale('numero_cuenta', '21512151', { forma_pago: 'CTA', codigo_institucion: '0017' }), true);
        check('elegida CHQ, la cuenta tiene que ir vacía', vale('numero_cuenta', '21512151', { forma_pago: 'CHQ' }), false);
        check('elegida CTA, el tipo de cuenta se exige', vale('tipo_cuenta', '', { forma_pago: 'CTA' }), false);

        // ── Los ceros a la izquierda los pone el generador ──────────────────
        // Excel se los come a todo lo que le parezca un número. Pedirle al
        // usuario que los reponga a mano es pedirle que arregle una planilla
        // entera a mano, así que las reglas aceptan el valor sin ceros y el
        // relleno pasa al exportar. Lo que NO cambia es qué es plausible: un
        // valor demasiado corto se sigue marcando en rojo, porque rellenarlo
        // mandaría al archivo una identificación plausible y equivocada.
        check('cédula sin el cero de la provincia vale', vale('numero_id', '912378320', { tipo_id: 'C' }), true);
        check('y sale con el cero repuesto', linea({ tipo_id: 'C', numero_id: '912378320' })[12], '0912378320');
        check('cédula de 8 dígitos sigue en rojo', vale('numero_id', '91237832', { tipo_id: 'C' }), false);
        check('RUC sin el cero vale', vale('numero_id', '912378320001', { tipo_id: 'R' }), true);
        check('y sale con el cero repuesto', linea({ tipo_id: 'R', numero_id: '912378320001' })[12], '0912378320001');
        check('RUC de 11 dígitos sigue en rojo', vale('numero_id', '91237832000', { tipo_id: 'R' }), false);
        // El pasaporte no tiene largo fijo: no hay ningún cero que reponer.
        check('el pasaporte va tal cual', linea({ tipo_id: 'P', numero_id: 'px39582' })[12], 'PX39582');

        check('el código de institución sin ceros vale', vale('codigo_institucion', '17', { forma_pago: 'CTA' }), true);
        check('y sale relleno a 4', linea({ codigo_institucion: '17' })[8], '0017');
        // El relleno se compara, no solo se exporta: escribir 17 tiene que
        // seguir siendo BG, o la cuenta del campo 11 se validaría contra la
        // regla de otra institución y saldría sin sus ceros.
        check('escribir 17 sigue siendo Banco Guayaquil', linea({ codigo_institucion: '17' })[10], '0001234567');
        check('y el campo 5 lo copia con el mismo relleno', linea({ codigo_institucion: '17' })[4], '0001234567');
        check('en ventanilla 17 también es 0017',
            vale('codigo_institucion', '17', { forma_pago: 'CHQ', tipo_cuenta: '', numero_cuenta: '' }), true);
        // Solo se rellena lo que es todo dígitos: un código alfanumérico de 4 o
        // el de 15 caracteres viajan como están.
        check('el código de 15 caracteres no se toca', linea({ codigo_institucion: '012345678901234' })[8], '012345678901234');
        check('un código alfanumérico no se rellena', vale('codigo_institucion', 'AB1', { forma_pago: 'CTA' }), false);

        // "Alfanumérico" en el artículo significa texto, no [A-Za-z0-9]: el campo
        // 14 son razones sociales y el 19 lleva guiones.
        check('nombre con punto y espacios', t.app.isCellValid(col('nombre'), 'Proveedor S.A.', {}), true);
        check('nombre con coma rompe el archivo', t.app.isCellValid(col('nombre'), 'Proveedor, S.A.', {}), false);
        check('referencia con guiones', t.app.isCellValid(col('referencia'), 'FAC-001-002-000001234', {}), true);

        // ── Nombre del archivo: BENEFICIARIO_AAAAMMDD_NN ────────────────────
        const hoy = t.app.formatDate(new Date());
        check('propone el nombre con la fecha de hoy y NN 01', t.app.getDefaultFilename(gen), `BENEFICIARIO_${hoy}_01`);
        check('el campo del nombre queda editable, para cambiar el NN', gen.filename, undefined);

        // ── Golden file: 12 registros pegados desde Excel ───────────────────
        // Reproduce el mapeo de handlePaste() (contra las columnas visibles) y
        // compara la salida completa contra el archivo esperado.
        const tsv = fs.readFileSync(path.join(__dirname, 'fixtures/pago-terceros-12-registros.tsv'), 'utf8');
        // Se normaliza el fin de línea: .gitattributes evita que el checkout los
        // convierta, pero la comparación no tiene por qué depender de eso.
        const esperado = fs.readFileSync(path.join(__dirname, 'fixtures/pago-terceros-12-registros.txt'), 'utf8').replace(/\r\n/g, '\n');
        const visibles = t.app.getVisibleColumns(gen);
        const filas = [];
        tsv.split(/\r?\n/).filter(l => l.trim() !== '').forEach((texto, i) => {
            filas[i] = t.fila(gen, {}, i);
            texto.split('\t').forEach((celda, j) => {
                if (visibles[j]) filas[i][visibles[j].id] = celda.trim();
            });
        });
        check('el fixture trae 12 registros', filas.length, 12);
        check('ninguna celda inválida en los 12',
            filas.flatMap((fila, i) => gen.columns
                .filter(c => !t.app.isCellValid(c, String(fila[c.id] || '').trim(), fila))
                .map(c => `fila ${i + 1} · ${c.label}`)), []);
        check('el archivo generado es idéntico al esperado',
            filas.map((fila, i) => t.linea(gen, fila, i, META)).join('\n') + '\n', esperado);
    },
};
