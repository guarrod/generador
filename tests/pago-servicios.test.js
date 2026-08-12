// Pago de Servicios: reglas de las columnas y línea exportada.
//
// El archivo son campos separados por punto y coma, una línea por registro, sin
// cabecera. La columna Monto Máx está oculta pero se sigue exportando.
const { cargarApp } = require('./harness.js');

module.exports = {
    nombre: 'Pago de Servicios',
    correr({ check }) {
        const t = cargarApp();
        const gen = t.generador('pago_servicios');
        const col = id => gen.columns.find(c => c.id === id);

        // ── Preseteo de Forma Pago ──────────────────────────────────────────
        // Hoy el archivo se usa solo para débito en cuenta.
        const fila = t.fila(gen);
        check('la fila nueva viene con Forma Pago en CTA', fila.forma_pago, 'CTA');
        check('el preseteo es válido de entrada', t.app.isCellValid(col('forma_pago'), fila.forma_pago, fila), true);
        check('el resto de las columnas nace vacío',
            Object.entries(fila).filter(([k]) => k !== 'forma_pago').every(([, v]) => v === ''), true);

        // El preseteo también entra en filas que ya venían guardadas sin él,
        // pero nunca pisa algo que haya escrito el usuario.
        t.setGrid([
            { codigo: 'VIEJO1', forma_pago: '', tipo: 'CTE' },
            { codigo: 'VIEJO2', forma_pago: 'TAR', tipo: 'CTE' },
        ]);
        t.app.applyColumnDefaults();
        check('una celda guardada vacía toma el preseteo al abrir', t.getGrid()[0].forma_pago, 'CTA');
        check('una celda con valor propio no se pisa', t.getGrid()[1].forma_pago, 'TAR');
        check('no toca las demás columnas', t.getGrid()[0].codigo, 'VIEJO1');

        // ── Reglas de las columnas ──────────────────────────────────────────
        const casos = [
            ['forma_pago', 'CTA', true], ['forma_pago', 'TAR', true],
            ['forma_pago', 'cta', true], ['forma_pago', 'XXX', false], ['forma_pago', '', false],
            ['tipo', 'CTE', true], ['tipo', 'AHO', true], ['tipo', 'cte', true],
            // Los tipos de tarjeta salieron: el generador es solo débito en cuenta.
            ['tipo', 'A', false], ['tipo', 'V', false], ['tipo', 'M', false], ['tipo', '', false],
            ['codigo', 'ABC123', true], ['codigo', 'A'.repeat(50), true], ['codigo', 'A'.repeat(51), false],
            ['codigo', 'con espacio', false], ['codigo', '', false],
            ['descripcion', 'Pago mensual', true], ['descripcion', 'A'.repeat(100), true],
            ['descripcion', 'A'.repeat(101), false], ['descripcion', 'Camión', false],
            ['numero', '1234567890', true], ['numero', '1'.repeat(20), true],
            ['numero', '1'.repeat(21), false], ['numero', 'ABC', false],
            ['email', '', true], ['email', 'usuario@mail.com', true], ['email', 'usuario', false],
            ['telefono', '', true], ['telefono', '0999999999', true], ['telefono', '99999999999', false],
            ['monto', '', true], ['monto', '1234567', true], ['monto', '12345678', false],
        ];
        casos.forEach(([id, valor, esperado]) =>
            check(`${col(id).label} · "${valor}" ${esperado ? 'vale' : 'no vale'}`,
                t.app.isCellValid(col(id), valor, {}), esperado));

        // ── Línea exportada ─────────────────────────────────────────────────
        const completa = t.fila(gen, {
            codigo: 'ABC123', descripcion: 'Pago mensual', tipo: 'aho',
            numero: '1234567890', email: '', telefono: '',
        });
        check('separador punto y coma', gen.exportSeparator, ';');
        check('línea completa', t.linea(gen, completa), 'ABC123;Pago mensual;CTA;AHO;1234567890;999999999;;');
        check('Monto Máx vacío se exporta como 999999999', t.linea(gen, completa).split(';')[5], '999999999');
        check('Monto Máx con valor se exporta con centavos',
            t.linea(gen, t.fila(gen, { ...completa, monto: '5000' })).split(';')[5], '500000');
        check('los códigos van en mayúsculas', t.linea(gen, t.fila(gen, { ...completa, forma_pago: 'tar' })).split(';')[2], 'TAR');
        check('8 campos por línea', t.linea(gen, completa).split(';').length, 8);

        // ── Grilla y panel ──────────────────────────────────────────────────
        check('Monto Máx está oculta en la grilla', Boolean(col('monto').hidden), true);
        check('pero sigue en el archivo', gen.columns.map(c => c.id).includes('monto'), true);
        check('7 columnas visibles', t.app.getVisibleColumns(gen).length, 7);
        // El panel lateral describe la grilla: un item por columna visible, mismo
        // label y mismo orden. Si esto falla, el panel quedó desfasado del formato.
        check('el panel lateral acompaña a las columnas',
            gen.recommendations.items.map(i => i.label),
            t.app.getVisibleColumns(gen).map(c => c.label));
        check('la columna oculta no tiene item', gen.recommendations.items.some(i => /monto/i.test(i.label)), false);
        check('el aviso del monto máximo está declarado',
            gen.recommendations.notice, 'Recuerda que ya no debes ingresar el monto máximo autorizado.');
    },
};
