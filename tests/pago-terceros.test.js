// Pago a Terceros (Cash Management): las 20 posiciones del formato oficial.
//
// La referencia es el artículo 11032985670804 del centro de ayuda de Banco
// Guayaquil, transcrito en docs/formato-pago-terceros.md. Cada verificación de
// la línea exportada corresponde a una fila de esa tabla.
//
// OJO: el artículo no dice cuál es el separador. La coma es un supuesto
// heredado del generador oficial del banco — ver docs/estado.md.
const fs = require('fs');
const path = require('path');
const { cargarApp } = require('./harness.js');

// Una orden válida, con crédito en cuenta de Banco Guayaquil.
const BASE = {
    codigo_orientacion: 'PA', cuenta_empresa: '1234567', secuencial_pago: '1',
    comprobante: 'EGR-0012', codigo: '0012345678', moneda: 'USD', valor: '12645.76',
    forma_pago: 'CTA', codigo_institucion: '0017', tipo_cuenta: 'AHO', numero_cuenta: '1234567',
    tipo_id: 'C', numero_id: '0912378320', nombre: 'Proveedor S.A.',
    direccion: '', ciudad: '', telefono: '', localidad_pago: '',
    referencia: 'FAC-001-002-000001234', referencia_adicional: '',
};

module.exports = {
    nombre: 'Pago a Terceros · formato oficial de BG',
    correr({ check, saltear }) {
        const t = cargarApp();
        const gen = t.generador('pago_terceros');
        if (!gen) return saltear('el generador no está en esta entrega');
        const col = id => gen.columns.find(c => c.id === id);

        // ── El formato es la grilla ─────────────────────────────────────────
        check('20 campos del formato = 20 columnas', gen.columns.length, 20);
        check('ninguna columna oculta', gen.columns.filter(c => c.hidden).length, 0);
        check('ningún campo suelto arriba de la grilla', gen.metadata, undefined);
        check('sin exportRow: la línea es el volcado de la fila', gen.exportRow, undefined);
        check('las columnas están en el orden del formato', gen.columns.map(c => c.id), [
            'codigo_orientacion', 'cuenta_empresa', 'secuencial_pago', 'comprobante', 'codigo',
            'moneda', 'valor', 'forma_pago', 'codigo_institucion', 'tipo_cuenta', 'numero_cuenta',
            'tipo_id', 'numero_id', 'nombre', 'direccion', 'ciudad', 'telefono', 'localidad_pago',
            'referencia', 'referencia_adicional',
        ]);

        // ── Preseteos por fila ──────────────────────────────────────────────
        const nueva = t.fila(gen, {}, 0);
        check('campo 1 preseteado en PA', nueva.codigo_orientacion, 'PA');
        check('campo 6 preseteado en USD', nueva.moneda, 'USD');
        check('campo 3 arranca en 1', nueva.secuencial_pago, '1');
        check('campo 3 sigue el número de fila', t.fila(gen, {}, 4).secuencial_pago, '5');

        // ── Línea exportada, campo por campo contra la tabla oficial ────────
        const campos = t.linea(gen, BASE).split(',');
        check('20 campos por línea', campos.length, 20);
        [
            [1, 'Código Orientación', 'PA'],
            [2, 'Cuenta Empresa, con ceros a la izquierda', '0001234567'],
            [3, 'Secuencial Pago', '1'],
            [4, 'Comprobante', 'EGR-0012'],
            [5, 'Código', '0012345678'],
            [6, 'Moneda', 'USD'],
            [7, 'Valor: 11 enteros y 2 decimales, sin punto', '0000001264576'],
            [8, 'Forma de Pago', 'CTA'],
            [9, 'Código de Institución Financiera', '0017'],
            [10, 'Tipo de Cuenta', 'AHO'],
            [11, 'Nº Cuenta BG, con ceros a la izquierda', '0001234567'],
            [12, 'Tipo ID', 'C'],
            [13, 'Nº ID', '0912378320'],
            [14, 'Nombre del Beneficiario', 'Proveedor S.A.'],
            [15, 'Dirección', ''],
            [16, 'Ciudad', ''],
            [17, 'Teléfono', ''],
            [18, 'Localidad de pago, en blanco con CTA', ''],
            [19, 'Referencia', 'FAC-001-002-000001234'],
            [20, 'Referencia Adicional', ''],
        ].forEach(([pos, nombre, esperado]) =>
            check(`campo ${String(pos).padStart(2)} · ${nombre}`, campos[pos - 1], esperado));

        // Ventanilla: el artículo exige 10 y 11 vacíos y la institución en 0017.
        const chq = t.linea(gen, { ...BASE, forma_pago: 'CHQ', tipo_cuenta: '', numero_cuenta: '', localidad_pago: 'quito' }).split(',');
        check('CHQ · Tipo de Cuenta vacío', chq[9], '');
        check('CHQ · Nº Cuenta vacío', chq[10], '');
        check('CHQ · Localidad en mayúsculas', chq[17], 'QUITO');
        // Otra institución financiera: la cuenta NO se rellena con ceros.
        check('otro banco · cuenta sin relleno',
            t.linea(gen, { ...BASE, codigo_institucion: '0034', numero_cuenta: 'ABC123456789' }).split(',')[10], 'ABC123456789');
        // El monto se normaliza siempre a 13 dígitos.
        [['12645,76', '0000001264576'], ['500', '0000000050000'], ['500.5', '0000000050050']]
            .forEach(([entrada, esperado]) =>
                check(`valor "${entrada}" → ${esperado}`, t.linea(gen, { ...BASE, valor: entrada }).split(',')[6], esperado));

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

        // "Alfanumérico" en el artículo significa texto, no [A-Za-z0-9]: el campo
        // 18 ejemplifica con "QUITO, GUAYAQUIL" y el 20 exige un pipe y un correo.
        check('comprobante con guion', t.app.isCellValid(col('comprobante'), 'EGR-0012', {}), true);
        check('comprobante con coma rompe el archivo', t.app.isCellValid(col('comprobante'), 'EGR,12', {}), false);
        check('Ref. Adicional admite pipe y correo', t.app.isCellValid(col('referencia_adicional'), '|proveedor@mail.com', {}), true);

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
            filas.map((fila, i) => t.linea(gen, fila, i)).join('\n') + '\n', esperado);
    },
};
