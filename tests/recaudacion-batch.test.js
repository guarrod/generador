// Recaudación Batch (RECAUDOS17_TC): archivo de ancho fijo.
//
// Una cabecera y una línea por registro, TODAS de exactamente 124 caracteres.
// Es la propiedad que hay que defender: si un tramo cambia de largo, el banco
// no lee ninguno de los campos que vienen después y el error no se ve en la
// pantalla. Por eso cada verificación mira posición y longitud, no solo el
// contenido.
const { cargarApp } = require('./harness.js');

const LARGO = 124;

// Los tramos de la cabecera, según el formato: [nombre, posición 1-indexada, largo]
const CABECERA = [
    ['tipo de registro', 1, 2], ['REC', 3, 3], ['código de banco', 6, 5],
    ['código de empresa', 11, 5], ['constante 01', 16, 2], ['fecha de generación', 18, 8],
    ['fecha de ejecución', 26, 8], ['cantidad de registros', 34, 8], ['total a cobrar', 42, 15],
    ['relleno', 57, 68],
];
const DETALLE = [
    ['tipo de registro', 1, 2], ['novedad', 3, 2], ['código de cliente', 5, 15],
    ['nombre del cliente', 20, 40], ['valor a cobrar', 60, 10], ['fecha máxima de pago', 70, 8],
    ['valor mínimo', 78, 10], ['valor de retención', 88, 10], ['referencia', 98, 15],
    ['periodo', 113, 6], ['secuencia', 119, 2], ['relleno', 121, 4],
];

const REGISTRO = {
    tipo_registro: 'Nueva Deuda', codigo_cliente: '123456789', nombre_cliente: 'Usuario Prueba',
    valor_cobrar: '220.00', valor_minimo: '', valor_retencion: '', referencia: 'PRUEBA DE PAGO',
    periodo: '202504', secuencia: 'Unica Deuda',
};

module.exports = {
    nombre: 'Recaudación Batch · ancho fijo de 124 caracteres',
    correr({ check, saltear }) {
        const t = cargarApp();
        const gen = t.generador('recaudacion_batch');
        if (!gen) return saltear('el generador no está en esta entrega');
        const col = id => gen.columns.find(c => c.id === id);
        const tramo = (linea, desde, largo) => linea.substr(desde - 1, largo);

        check('se exporta como ancho fijo', gen.exportType, 'fixedBatch');
        check('los tramos declarados suman 124', CABECERA.reduce((a, [, , n]) => a + n, 0), LARGO);
        check('los del detalle también', DETALLE.reduce((a, [, , n]) => a + n, 0), LARGO);

        // La cabecera y el detalle leen de currentMetadata, no de argumentos.
        t.setMetadata({ codigo_empresa: 'EFA', fecha_ejecucion: '20260901' });
        const filas = [REGISTRO, { ...REGISTRO, valor_cobrar: '1500.50', tipo_registro: 'Actualizar Deuda', secuencia: 'Segunda Deuda' }];
        const cabecera = t.app.buildBatchHeader(filas);
        const detalle = t.app.buildBatchDetail(REGISTRO);

        // ── Lo que no se puede romper ───────────────────────────────────────
        check('la cabecera mide 124', cabecera.length, LARGO);
        check('el detalle mide 124', detalle.length, LARGO);
        filas.forEach((fila, i) => check(`el detalle ${i + 1} mide 124`, t.app.buildBatchDetail(fila).length, LARGO));

        // ── Cabecera, tramo por tramo ───────────────────────────────────────
        const hoy = t.app.formatDate(new Date());
        [
            ['tipo de registro', 1, 2, '01'],
            ['identificador del servicio', 3, 3, 'REC'],
            ['código de banco', 6, 5, '00017'],
            ['código de empresa, con espacios a la derecha', 11, 5, 'EFA  '],
            ['constante', 16, 2, '01'],
            ['fecha de generación = hoy', 18, 8, hoy],
            ['fecha de ejecución', 26, 8, '20260901'],
            ['cantidad de registros, con ceros', 34, 8, '00000002'],
            // 220.00 + 1500.50 = 1720.50 → 172050 centavos
            ['total a cobrar en centavos', 42, 15, '000000000172050'],
            ['relleno de 68 espacios', 57, 68, ' '.repeat(68)],
        ].forEach(([nombre, desde, largo, esperado]) =>
            check(`cabecera · ${nombre}`, tramo(cabecera, desde, largo), esperado));

        // ── Detalle, tramo por tramo ────────────────────────────────────────
        const maxPago = t.app.formatDate(t.app.addMonths(new Date(), 1));
        [
            ['tipo de registro', 1, 2, '02'],
            ['novedad: nueva deuda', 3, 2, '01'],
            ['código de cliente, con espacios', 5, 15, '123456789      '],
            ['nombre del cliente, con espacios', 20, 40, 'Usuario Prueba'.padEnd(40, ' ')],
            ['valor a cobrar en centavos', 60, 10, '0000022000'],
            ['fecha máxima de pago: hoy + 1 mes', 70, 8, maxPago],
            ['valor mínimo vacío → ceros', 78, 10, '0000000000'],
            ['retención vacía → ceros', 88, 10, '0000000000'],
            ['referencia, con espacios', 98, 15, 'PRUEBA DE PAGO '],
            ['periodo', 113, 6, '202504'],
            ['secuencia: única deuda', 119, 2, '01'],
            ['relleno de 4 espacios', 121, 4, '    '],
        ].forEach(([nombre, desde, largo, esperado]) =>
            check(`detalle · ${nombre}`, tramo(detalle, desde, largo), esperado));

        // Las opciones de la grilla son texto legible; el archivo lleva el código.
        check('novedad · actualizar deuda', tramo(t.app.buildBatchDetail({ ...REGISTRO, tipo_registro: 'Actualizar Deuda' }), 3, 2), '02');
        [['Unica Deuda', '01'], ['Segunda Deuda', '02'], ['Tercera Deuda', '03'], ['Cuarta Deuda', '04']]
            .forEach(([opcion, codigo]) =>
                check(`secuencia · ${opcion} → ${codigo}`, tramo(t.app.buildBatchDetail({ ...REGISTRO, secuencia: opcion }), 119, 2), codigo));

        // Montos: se cargan con 2 decimales y viajan en centavos.
        [['220.00', '0000022000'], ['1500,50', '0000150050'], ['0.01', '0000000001']]
            .forEach(([entrada, esperado]) =>
                check(`monto "${entrada}" → ${esperado}`, tramo(t.app.buildBatchDetail({ ...REGISTRO, valor_cobrar: entrada }), 60, 10), esperado));

        // ── Reglas de la grilla ─────────────────────────────────────────────
        [
            ['valor_cobrar', '220.00', true], ['valor_cobrar', '220', false], ['valor_cobrar', '', false],
            ['valor_minimo', '', true], ['valor_minimo', '50.00', true], ['valor_minimo', '50', false],
            ['periodo', '202504', true], ['periodo', '2025', false], ['periodo', '', false],
            ['codigo_cliente', 'A'.repeat(15), true], ['codigo_cliente', 'A'.repeat(16), false],
            ['nombre_cliente', 'A'.repeat(40), true], ['nombre_cliente', 'A'.repeat(41), false],
            ['referencia', '', true], ['referencia', 'A'.repeat(16), false],
            ['tipo_registro', 'Nueva Deuda', true], ['tipo_registro', 'Otra cosa', false],
        ].forEach(([id, valor, esperado]) =>
            check(`${col(id).label} · "${valor}" ${esperado ? 'vale' : 'no vale'}`,
                t.app.isCellValid(col(id), valor, {}), esperado));

        // ── Campos generales ────────────────────────────────────────────────
        const meta = id => gen.metadata.find(m => m.id === id);
        check('la fecha de ejecución tiene que ser futura', gen.metadata.find(m => m.id === 'fecha_ejecucion').futureOnly, true);
        [['codigo_empresa', 'EFA', true], ['codigo_empresa', 'EFAA', false]].forEach(([id, valor, esperado]) =>
            check(`${meta(id).label} · "${valor}" ${esperado ? 'vale' : 'no vale'}`,
                t.app.isCellValid(meta(id), valor, {}), esperado));
        check('el nombre del archivo lleva el código de empresa',
            gen.filename({ codigo_empresa: 'efa' }), `REM_${hoy}_EFA`);
    },
};
