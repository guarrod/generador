const chip = text => `<code class="bg-slate-100 dark:bg-white/10 px-1 rounded text-secondary font-mono">${text}</code>`;

const APP_CONFIG = {
    themeKey: 'bg_generator_theme',
    sidebarKey: 'bg_generator_sidebar',
    activeGeneratorKey: 'bg_generator_active',
    defaultRows: 1,
    generators: [
        {
            id: 'pago_servicios',
            label: 'Pago de Servicios',
            title: 'Generador de Carga Masiva para Pago de Servicios',
            description: 'Los cambios se guardan automáticamente en tu navegador.',
            storageKey: 'bg_gen_pago_servicios_data',
            filenameKey: 'bg_gen_pago_servicios_filename',
            defaultFilename: 'carga_masiva',
            exportSeparator: ';',
            columns: [
                { id: 'codigo', label: 'Código', placeholder: 'Cuenta, suministro...', rule: /^[a-zA-Z0-9]{0,50}$/, error: 'Máx 50 caracteres alfanuméricos' },
                { id: 'descripcion', label: 'Descripción', placeholder: 'Ref. pago...', rule: /^[a-zA-Z0-9\s]{0,100}$/, error: 'Máx 100 caracteres alfanuméricos' },
                { id: 'forma_pago', label: 'Forma Pago', placeholder: 'CTA / TAR', rule: /^(CTA|TAR)$/i, error: 'Debe ser CTA o TAR', defaultValue: 'CTA', exportValue: value => value.toUpperCase(), width: 'w-28' },
                { id: 'tipo', label: 'Tipo Cta', placeholder: 'CTE / AHO', rule: /^(CTE|AHO)$/i, error: 'Debe ser CTE o AHO', exportValue: value => value.toUpperCase(), width: 'w-28' },
                { id: 'numero', label: 'Nº Cta/Tar', placeholder: '0123456789', rule: /^\d{0,20}$/, error: 'Máx 20 números', width: 'w-24' },
                { id: 'monto', label: 'Monto Máx', placeholder: 'Opcional', rule: /^\d{0,7}$/, error: 'Máx 7 números', optional: true, hidden: true, exportValue: value => value === '' ? '999999999' : `${value}00` },
                { id: 'email', label: 'Email', placeholder: 'Opcional (usuario@mail.com)', rule: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, optional: true },
                { id: 'telefono', label: 'Teléfono', placeholder: 'Opcional (0999999999)', rule: /^\d{0,10}$/, optional: true }
            ],
            recommendations: {
                items: [
                    { label: 'Código', html: 'Cuenta, predio, suministro. Hasta 50 caracteres alfanuméricos, sin espacios ni símbolos.' },
                    { label: 'Descripción', html: 'Hasta 100 caracteres: letras, números y espacios. Sin tildes, ñ ni signos.' },
                    { label: 'Forma Pago', html: `Viene en ${chip('CTA')}: actualmente el archivo se usa solo para pagos con débito en cuenta.` },
                    { label: 'Tipo Cta', html: `${chip('CTE')} corriente o ${chip('AHO')} ahorros.` },
                    { label: 'Nº Cta/Tar', html: 'Solo números, hasta 20 dígitos.' },
                    { label: 'Email', html: `Opcional. Formato ${chip('usuario@mail.com')}.` },
                    { label: 'Teléfono', html: 'Opcional. Solo números, hasta 10 dígitos.' }
                ],
                tip: 'Puedes copiar desde Excel y pegar directamente en la primera celda.',
                notice: 'Recuerda que ya no debes ingresar el monto máximo autorizado.'
            }
        },
        // Sigue el formato tal como lo publica Banco Guayaquil en el centro de
        // ayuda (artículo 11032985670804, actualizado 2026-08-09): los 20 campos,
        // en su orden, con la longitud y la observación de cada uno transcritas
        // en docs/formato-pago-terceros.md.
        //
        // La grilla pide 9 de esos 20 campos: los que cambian de un beneficiario
        // a otro. Los otros 11 no se cargan, y los pone `exportRow` en su
        // posición: los que el formato fija (1 `PA`, 6 `USD`), la cuenta de la
        // empresa —una sola para todo el archivo, por eso es campo general y no
        // columna—, el secuencial —que es la posición de la línea—, el código
        // —que el propio formato define como copia de otro campo de la misma
        // línea— y los opcionales, que viajan vacíos (4, 15, 16, 17, 18 y 20).
        // Las 20 posiciones salen igual: lo que cambia es quién las llena.
        //
        // Ojo con el campo 20: es el que lleva la notificación por correo al
        // beneficiario (`|proveedor@mail.com`) y es un dato de cada proveedor, no
        // del archivo, así que fuera de la grilla no hay dónde cargarlo. Con el
        // campo en blanco el banco no manda esos correos. Ver docs/estado.md.
        {
            id: 'pago_terceros',
            label: 'Pago a Terceros y Nómina',
            title: 'Generador de Archivo de Pago a Terceros y Nómina',
            description: 'Genera el archivo TXT para Pagos por Archivo para pagar a tus proveedores y colaboradores.',
            storageKey: 'bg_gen_pago_terceros_data',
            metadataKey: 'bg_gen_pago_terceros_metadata',
            secuenciaKey: 'bg_gen_pago_terceros_secuencia',
            // El nombre lo deriva el generador, así que el campo de abajo no se
            // muestra: la fecha es la del día y el ## lo lleva la app, que sube
            // uno por cada archivo bajado hoy (ver getFileSequence).
            //
            // OJO: el artículo del banco documenta otro nombre,
            // `BENEFICIARIO_AAAAMMDD_NN.TXT`. Este es el que confirmó el equipo
            // — ver docs/estado.md, como con el separador.
            filename: (metadata, gen) => `PAGOS_MULTICASH_${formatDate(new Date())}_${formatFileSequence(getFileSequence(gen))}`,
            metadata: [
                { id: 'cuenta_empresa', label: 'Cuenta de la empresa', placeholder: '1234567', rule: /^\d{1,10}$/, error: 'Campo 2 · Numérico/10. La cuenta que se debita, la misma para todo el archivo. Si tiene menos de 10 dígitos se completa con ceros a la izquierda al exportar' }
            ],
            columns: [
                { id: 'valor', label: 'Valor', placeholder: '12645.76', rule: /^\d{1,11}([.,]\d{1,2})?$/, error: 'Campo 7 · Numérico/13: 11 enteros y 2 decimales', exportValue: (value, row) => formatTerceroAmount(value), width: 'w-28', isAmount: true },
                { id: 'forma_pago', label: 'Forma Pago', placeholder: 'CTA', options: ['CTA', 'CHQ', 'EFE'], rule: /^(CTA|CHQ|EFE)$/i, error: 'Campo 8 · CTA crédito a cuenta, CHQ cheque, EFE efectivo', exportValue: value => value.toUpperCase(), width: 'w-28' },
                {
                    // Sin `options`: la lista de instituciones es el Anexo 4 del
                    // banco, no un puñado de valores. Sugerir solo `0017` haría
                    // parecer que es el único código válido, cuando con CTA
                    // puede ser cualquier institución. El campo lo gestiona el
                    // usuario; la regla y el relleno de ceros no cambian.
                    id: 'codigo_institucion', label: 'Cód. Institución', placeholder: '0017',
                    rule: (value, row) => {
                        const codigo = formatTerceroInstitucion(value);
                        return isVentanilla(row) ? codigo === '0017' : /^([a-zA-Z0-9]{4}|[a-zA-Z0-9]{15})$/.test(codigo);
                    },
                    error: 'Campo 9 · Alfanumérico/4 o /15. Con CHQ o EFE debe ser 0017 (BG). Si escribes menos de 4 dígitos, los ceros de la izquierda los pone el generador',
                    exportValue: value => formatTerceroInstitucion(value), width: 'w-32'
                },
                {
                    id: 'tipo_cuenta', label: 'Tipo Cuenta', placeholder: 'CTE / AHO', options: ['CTE', 'AHO'],
                    // Sin Forma de Pago no se juzga: ver faltaFormaPago().
                    rule: (value, row) => faltaFormaPago(row)
                        || (isCreditoCuenta(row) ? /^(CTE|AHO)$/i.test(value) : value === ''),
                    error: 'Campo 10 · CTE o AHO con CTA. Con CHQ o EFE no debe ser llenado',
                    exportValue: value => value.toUpperCase(), width: 'w-28'
                },
                {
                    id: 'numero_cuenta', label: 'Nº Cuenta', placeholder: '1234567',
                    rule: (value, row) => {
                        // Sin Forma de Pago no se juzga: ver faltaFormaPago().
                        if (faltaFormaPago(row)) return true;
                        if (!isCreditoCuenta(row)) return value === '';
                        return isBancoGuayaquil(row) ? /^\d{1,10}$/.test(value) : /^[a-zA-Z0-9]{1,30}$/.test(value);
                    },
                    error: 'Campo 11 · Con CTA: BG numérico/10 —los ceros de la izquierda los pone el generador—, otra institución alfanumérico/30 sin relleno. Con CHQ o EFE no debe ser llenado',
                    exportValue: (value, row) => formatTerceroAccount(value, row)
                },
                { id: 'tipo_id', label: 'Tipo ID', placeholder: 'C / R / P', options: ['C', 'R', 'P'], rule: /^[CRP]$/i, error: 'Campo 12 · C cédula, R RUC, P pasaporte', exportValue: value => value.toUpperCase(), width: 'w-24' },
                {
                    id: 'numero_id', label: 'Nº ID', placeholder: '912378320',
                    // Un dígito menos vale: es el cero de la provincia que se
                    // come Excel, y se repone al exportar. Ver formatTerceroId().
                    rule: (value, row) => {
                        const tipo = normalizeId(row.tipo_id);
                        if (tipo === 'C') return /^\d{9,10}$/.test(value);
                        if (tipo === 'R') return /^\d{12,13}$/.test(value);
                        if (tipo === 'P') return /^[a-zA-Z0-9]{1,13}$/.test(value);
                        return false;
                    },
                    error: 'Campo 13 · Cédula 10 dígitos, RUC 13 dígitos, pasaporte hasta 13. Elige primero el Tipo ID. Si Excel se comió el cero inicial, lo repone el generador',
                    exportValue: (value, row) => formatTerceroId(value, row)
                },
                // El separador es la tabulación, así que lo que no puede entrar
                // en un campo de texto es una tabulación —no una coma—: la coma
                // es un carácter normal de una razón social ("Proveedor, S.A.").
                { id: 'nombre', label: 'Nombre Beneficiario', placeholder: 'Proveedor S.A.', rule: /^[^\t]{1,40}$/, error: 'Campo 14 · Alfanumérico/40' },
                { id: 'referencia', label: 'Referencia', placeholder: 'Nº de factura', rule: /^[^\t]{1,200}$/, error: 'Campo 19 · Alfanumérico/200. Es lo que se imprime como nº de factura en la notificación' },
                // Opcional: si se carga, sale en el campo 20 con el pipe que pide el
                // formato para la notificación al beneficiario (`|proveedor@mail.com`).
                // Vacío, el campo 20 sale en blanco y el banco no manda ese correo.
                { id: 'correo', label: 'Correo Beneficiario', placeholder: 'Opcional (proveedor@mail.com)', rule: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: 'Campo 20 · Opcional. Si lo llenas, formato usuario@mail.com', optional: true, exportValue: value => formatTerceroCorreo(value) }
            ],
            // Las 20 posiciones del formato, en orden. Las que la grilla no pide
            // se arman acá; las que sí, salen por getExportValue para no duplicar
            // lo que ya declara el `exportValue` de cada columna.
            exportRow: (row, index, metadata, columns) => {
                const campo = id => getExportValue(findColumn(columns, id), row);
                return [
                    'PA',                                                 //  1 · Código Orientación
                    padLeft((metadata.cuenta_empresa || '').trim(), 10),  //  2 · Cuenta Empresa
                    padLeft(index + 1, 7),                                //  3 · Secuencial Pago
                    '',                                                   //  4 · Comprobante
                    formatTerceroCodigo(row, columns),                    //  5 · Código
                    'USD',                                                //  6 · Moneda
                    campo('valor'),                                       //  7
                    campo('forma_pago'),                                  //  8
                    campo('codigo_institucion'),                          //  9
                    campo('tipo_cuenta'),                                 // 10
                    campo('numero_cuenta'),                               // 11
                    campo('tipo_id'),                                     // 12
                    campo('numero_id'),                                   // 13
                    campo('nombre'),                                      // 14
                    '',                                                   // 15 · Dirección
                    '',                                                   // 16 · Ciudad
                    '',                                                   // 17 · Teléfono
                    '',                                                   // 18 · Localidad de pago
                    campo('referencia'),                                  // 19
                    campo('correo'),                                      // 20 · Referencia Adicional (correo, con el pipe que pide el formato)
                ].join('\t');
            },
            recommendations: {
                items: [
                    { label: 'Cuenta de la empresa', html: `Ingresa la cuenta desde la que se realizarán los pagos. Será la misma para todo el archivo. Si tiene menos de 10 dígitos, agregaremos automáticamente los ceros necesarios al generar el TXT.<br>${chip('1234567')} → ${chip('0001234567')}` },
                    { label: 'Valor', html: `Ingresa el monto del pago con hasta 2 decimales. Nosotros lo convertiremos automáticamente al formato requerido.<br>${chip('12645.76')} → ${chip('0000001264576')}` },
                    { label: 'Forma de pago', html: `Selecciona cómo recibirá el pago el beneficiario:<br>${chip('CTA')} Cuenta bancaria · ${chip('CHQ')} Cheque · ${chip('EFE')} Efectivo.` },
                    { label: 'Cód. Institución', html: `Para pagos a cuenta (${chip('CTA')}), ingresa el código de la institución financiera. Si ingresas ${chip('17')}, lo convertiremos automáticamente en ${chip('0017')}.<br>Para Cheque (${chip('CHQ')}) o Efectivo (${chip('EFE')}), utilizaremos ${chip('0017')} de Banco Guayaquil.<br><a href="https://ayudaempresas.bancoguayaquil.com/hc/es/articles/42468901746836--Cu%C3%A1les-son-los-c%C3%B3digos-de-Instituciones-Financieras-a-utilizar-para-archivos-masivos" target="_blank" rel="noopener" class="underline text-secondary hover:text-secondary/80">¿Cuáles son los códigos de Instituciones Financieras a utilizar para archivos masivos? – Centro de Ayuda</a>` },
                    { label: 'Tipo de cuenta', html: `Para pagos a cuenta (${chip('CTA')}), selecciona ${chip('CTE')} para Cuenta corriente o ${chip('AHO')} para Cuenta de ahorros.<br>No necesitas completar este campo para Cheque (${chip('CHQ')}) o Efectivo (${chip('EFE')}).` },
                    { label: 'N.º de cuenta', html: `Ingresa la cuenta del beneficiario. Si es de Banco Guayaquil y tiene menos de 10 dígitos, agregaremos automáticamente los ceros necesarios.<br>${chip('1234567')} → ${chip('0001234567')}<br>No necesitas completarla para Cheque (${chip('CHQ')}) o Efectivo (${chip('EFE')}).` },
                    { label: 'Tipo de identificación', html: `Selecciona el documento del beneficiario:<br>${chip('C')} Cédula · ${chip('R')} RUC · ${chip('P')} Pasaporte.` },
                    { label: 'N.º de identificación', html: `Ingresa la identificación del beneficiario: Cédula de 10 dígitos, RUC de 13 dígitos o Pasaporte de hasta 13 caracteres.<br>Si una cédula perdió el 0 inicial al copiarla desde Excel, lo completaremos automáticamente.<br>${chip('912378320')} → ${chip('0912378320')}` },
                    { label: 'Nombre del beneficiario', html: `Ingresa el nombre completo o razón social del beneficiario. Máximo 40 caracteres.` },
                    { label: 'Referencia', html: `Ingresa el número de factura o una referencia que te permita identificar el pago. Máximo 200 caracteres.` },
                    { label: 'Correo Beneficiario', html: `Opcional. Si lo ingresas, el banco le enviará al beneficiario la notificación del pago a este correo. Si lo dejas vacío, no se envía esa notificación.<br>Formato: ${chip('proveedor@mail.com')}.` }
                ],
                tip: 'No necesitas completar los 20 campos del formato. Solo te pedimos los datos necesarios para cada pago. Al descargar el TXT, completaremos automáticamente los demás campos requeridos, como moneda, secuencial y datos técnicos del archivo.',
                notice: 'La localidad de pago se enviará siempre vacía. El nombre del archivo también se genera automáticamente con PAGOS_MULTICASH, la fecha y un número secuencial.'
            }
        },
        {
            id: 'recaudacion_batch',
            label: 'Recaudación Batch',
            title: 'Generador Batch de Recaudación',
            description: 'Genera el archivo TXT (RECAUDOS17_TC) para que puedas recaudar por los canales de BG',
            storageKey: 'bg_gen_recaudacion_batch_data',
            metadataKey: 'bg_gen_recaudacion_batch_metadata',
            filename: metadata => `REM_${formatDate(new Date())}_${(metadata.codigo_empresa || 'EMPRESA').trim().toUpperCase() || 'EMPRESA'}`,
            exportType: 'fixedBatch',
            // El pie de la grilla suma esta columna (ver updateStats /
            // getColumnTotal) con la misma cuenta que va al campo "Total a
            // cobrar" de la cabecera del archivo (buildBatchHeader).
            totalColumn: 'valor_cobrar',
            metadata: [
                { id: 'fecha_ejecucion', label: 'Fecha de ejecución', placeholder: 'Seleccione una fecha', type: 'date', futureOnly: true, rule: /^\d{8}$/, error: 'Seleccione una fecha futura' },
                { id: 'codigo_empresa', label: 'Código de empresa', placeholder: 'EFA', rule: /^[a-zA-Z0-9]{1,3}$/, error: 'Máx 3 caracteres alfanuméricos' }
            ],
            columns: [
                { id: 'tipo_registro', label: 'Tipo Registro', placeholder: 'Nueva Deuda', options: ['Nueva Deuda', 'Actualizar Deuda'], rule: /^(Nueva Deuda|Actualizar Deuda)$/i, error: 'Nueva Deuda o Actualizar Deuda' },
                { id: 'codigo_cliente', label: 'Código Cliente', placeholder: '123456789', rule: /^[a-zA-Z0-9]{1,15}$/, error: 'Máx 15 caracteres alfanuméricos' },
                { id: 'nombre_cliente', label: 'Nombre Cliente', placeholder: 'Usuario Prueba', rule: /^.{1,40}$/, error: 'Máx 40 caracteres' },
                { id: 'valor_cobrar', label: 'Valor a Cobrar', placeholder: '220.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Ingrese un monto con 2 decimales. Ej: 220.00', isAmount: true },
                { id: 'valor_minimo', label: 'Valor Mínimo', placeholder: '50.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Vacío o monto con 2 decimales. Ej: 50.00', optional: true, defaultExport: '0000000000', isAmount: true },
                { id: 'valor_retencion', label: 'Valor Retención', placeholder: '0.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Vacío o monto con 2 decimales. Ej: 0.00', optional: true, defaultExport: '0000000000', isAmount: true },
                { id: 'referencia', label: 'Referencia', placeholder: 'PRUEBA DE PAGO', rule: /^.{0,15}$/, error: 'Máx 15 caracteres', optional: true },
                { id: 'periodo', label: 'Periodo', placeholder: 'AAAAMM', rule: /^\d{6}$/, error: 'Debe tener formato AAAAMM' },
                { id: 'secuencia', label: 'Secuencia', placeholder: 'Unica Deuda', options: ['Unica Deuda', 'Segunda Deuda', 'Tercera Deuda', 'Cuarta Deuda'], rule: /^(Unica Deuda|Segunda Deuda|Tercera Deuda|Cuarta Deuda)$/i, error: 'Seleccione una secuencia válida' }
            ],
            recommendations: {
                items: [
                    { label: 'Archivo', html: `Salida fija de ${chip('124')} caracteres por línea con cabecera ${chip('01REC')}.` },
                    { label: 'Empresa', html: 'Código entregado por Banco Guayaquil, hasta 3 caracteres.' },
                    { label: 'Montos', html: 'Ingrese valores con 2 decimales. Al exportar se convierten a centavos y se completan con ceros a la izquierda.' },
                    { label: 'Periodo', html: `Formato ${chip('AAAAMM')}. Ejemplo: ${chip('202504')}.` },
                    { label: 'Filas', html: 'Solo se exportan registros con datos.' }
                ],
                tip: 'Puedes copiar desde Excel y pegar directamente desde la columna Tipo Registro.'
            }
        }
    ]
};

// State
let activeGeneratorIndex = parseInt(localStorage.getItem(APP_CONFIG.activeGeneratorKey) || '0');
let gridData = [];
let currentMetadata = {};
let currentFilename = '';
// Se enciende al presionar Descargar y apaga el "todavía no llegué": a partir
// de ahí los campos vacíos obligatorios también se listan, porque el usuario ya
// dijo que terminó. Vuelve a cero al cambiar de generador, al resetear y después
// de una descarga exitosa, para no recibirlo con una lista de reclamos.
let intentoDescarga = false;
let currentTheme = localStorage.getItem(APP_CONFIG.themeKey) || 'dark';
let isSidebarVisible = localStorage.getItem(APP_CONFIG.sidebarKey) !== 'false';

// DOM Elements
const tabsContainer = document.getElementById('tabs-container');
const generatorTitle = document.getElementById('generator-title');
const generatorDescription = document.getElementById('generator-description');
const generatorFields = document.getElementById('generator-fields');
const gridHeader = document.getElementById('grid-header');
const gridBody = document.getElementById('grid-body');
const inputFilename = document.getElementById('input-filename');
const filenameField = document.getElementById('filename-field');
const btnAddRow = document.getElementById('btn-add-row');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');
const btnThemeToggle = document.getElementById('theme-toggle');
const btnSidebarToggle = document.getElementById('sidebar-toggle');
const sidebarPanel = document.getElementById('sidebar-panel');
const rowCountDisplay = document.getElementById('row-count');
const totalDisplay = document.getElementById('total-display');
const statusMessage = document.getElementById('status-message');
const footerActions = document.getElementById('footer-actions');
const errorPanel = document.getElementById('error-panel');
const errorPanelHead = document.getElementById('error-panel-head');
const errorPanelTitle = document.getElementById('error-panel-title');
const errorList = document.getElementById('error-list');

function getActiveConfig() {
    return APP_CONFIG.generators[activeGeneratorIndex];
}

// Las columnas con `hidden` no se muestran ni se validan, pero siguen existiendo
// en los datos y en el archivo exportado (vacías), porque las posiciones de los
// campos son fijas. Úsalo solo en columnas opcionales: nadie va a poder corregir
// un error en una columna que no se ve.
function getVisibleColumns(gen = getActiveConfig()) {
    return (gen.columns || []).filter(col => !col.hidden);
}

function init() {
    applyTheme(currentTheme);
    applySidebarState(isSidebarVisible);
    lucide.createIcons();
    renderTabs();
    loadGenerator();
    // Después de renderTabs(): antes la barra de pestañas está vacía y mide 0.
    syncSidebarTop();
}

function renderTabs() {
    tabsContainer.innerHTML = APP_CONFIG.generators.map((gen, i) => {
        const isActive = i === activeGeneratorIndex;
        // La pestaña activa va en #160f41. En oscuro ese color es casi el del
        // fondo de la página (`primary`, #160441), así que ahí lleva además un
        // borde claro: sin él la pestaña elegida se funde con el fondo y no se
        // ve cuál está seleccionada. La sombra acompaña al color nuevo — la
        // anterior era un resplandor rosa del degradado que ya no está.
        const activeClass = 'bg-[#160f41] text-white border border-transparent dark:border-white/30 shadow-[0_4px_15px_-3px_rgba(22,15,65,0.45)]';
        const inactiveClass = 'bg-white dark:bg-white/5 border border-slate-200 dark:border-border text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white';
        return `<button class="px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${isActive ? activeClass : inactiveClass}" onclick="switchGenerator(${i})">${gen.label}</button>`;
    }).join('');
}

// Se llama desde el onclick inline de las pestañas, así que tiene que quedar
// en el scope global.
function switchGenerator(index) {
    if (index === activeGeneratorIndex) return;
    activeGeneratorIndex = index;
    localStorage.setItem(APP_CONFIG.activeGeneratorKey, index);
    gridData = [];
    renderTabs();
    loadGenerator();
}

function loadGenerator() {
    const gen = getActiveConfig();

    // Cada generador arranca sin intento de descarga: el usuario acaba de
    // llegar a esta pestaña, no le corresponde la lista de lo que falta.
    intentoDescarga = false;
    generatorTitle.textContent = gen.title;
    generatorDescription.textContent = gen.description;

    loadFromStorage();
    applyMetadataDefaults();
    applyColumnDefaults();

    renderSidebar();
    renderMetadataFields();

    if (gen.columns) {
        footerActions.classList.remove('hidden');
        const savedFilename = gen.filenameKey ? localStorage.getItem(gen.filenameKey) : null;
        const autoFilename = hasAutoFilename(gen);
        currentFilename = autoFilename ? gen.filename(currentMetadata, gen) : (savedFilename || getDefaultFilename(gen));
        inputFilename.value = currentFilename;
        inputFilename.disabled = autoFilename;
        // Un nombre derivado no se edita, así que el campo directamente no se
        // muestra: un campo deshabilitado ocupa lugar para no dejar hacer nada.
        filenameField.classList.toggle('hidden', autoFilename);

        renderHeader();
        if (gridData.length === 0) {
            addRows(APP_CONFIG.defaultRows);
        } else {
            renderGrid();
        }
    } else {
        footerActions.classList.add('hidden');
        inputFilename.disabled = false;
        renderHeader();
        renderPlaceholder();
    }

    updateStats();
}

function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(APP_CONFIG.themeKey, theme);
    currentTheme = theme;
}

// Tiene que coincidir con el `min-width` del media query de #sidebar-panel en
// styles.css: por debajo, el panel no flota, va apilado al pie del principal.
const SIDEBAR_BREAKPOINT = 1024;

// El panel flota por encima del contenido (ver styles.css), así que mostrarlo y
// esconderlo ya no reacomoda nada: el panel principal ocupa el ancho completo
// siempre. Es lo que le devuelve a la grilla los 320px que antes se llevaba la
// columna de la derecha.
//
// Flotando (`>= SIDEBAR_BREAKPOINT`) el panel se abre y cierra con
// `sidebar-closed`: sigue montado y fuera del flujo, así que puede
// transicionar (fade + slide desde el borde derecho) en los dos sentidos.
// Apilado (mobile) usa `hidden` en cambio — ahí el panel empuja contenido, y
// sin `display: none` dejaría un hueco vacío cuando está "cerrado".
function applySidebarState(visible) {
    const floating = window.innerWidth >= SIDEBAR_BREAKPOINT;
    if (floating) {
        sidebarPanel.classList.remove('hidden');
        sidebarPanel.classList.toggle('sidebar-closed', !visible);
        if (visible) syncSidebarTop();
    } else {
        sidebarPanel.classList.toggle('hidden', !visible);
        sidebarPanel.classList.remove('sidebar-closed');
    }
    btnSidebarToggle.className = getSidebarToggleClass(visible);
    btnSidebarToggle.setAttribute('aria-expanded', visible);
    localStorage.setItem(APP_CONFIG.sidebarKey, visible);
    isSidebarVisible = visible;
}

// Dónde arranca el panel flotante, medido en vivo. Estando fijo, el CSS no
// tiene contra qué calcularlo: la distancia al borde superior es la altura de
// la cabecera, que cambia con el zoom del navegador y no se puede escribir a
// mano sin que el panel se despegue en cuanto crezca. Queda a la altura del
// borde superior de la barra de pestañas, no del panel principal —más arriba—.
function syncSidebarTop() {
    const PADDING_MAIN = 48;   // <main> py-12: separación entre cabecera y pestañas
    const alto = document.querySelector('header').offsetHeight + PADDING_MAIN;
    document.documentElement.style.setProperty('--sidebar-top', `${alto}px`);
}

// El botón dice siempre "Ayuda": el estado del panel se muestra con el énfasis
// del botón (marcado con el panel abierto, apagado con el panel cerrado).
function getSidebarToggleClass(visible) {
    const base = 'px-6 py-3 rounded-lg border font-bold text-sm cursor-pointer transition-all';
    return visible
        ? `${base} bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white`
        : `${base} bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-border text-slate-600 dark:text-text-muted hover:bg-slate-200 dark:hover:bg-white/10`;
}

function toggleSidebar() {
    applySidebarState(!isSidebarVisible);
}

function renderSidebar() {
    const gen = getActiveConfig();
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarTip = document.getElementById('sidebar-tip');
    const sidebarTipText = document.getElementById('sidebar-tip-text');
    const sidebarNotice = document.getElementById('sidebar-notice');
    const sidebarNoticeText = document.getElementById('sidebar-notice-text');

    if (!gen.recommendations) {
        sidebarContent.innerHTML = '<p class="text-sm text-slate-400 dark:text-white/30 italic">Sin recomendaciones disponibles.</p>';
        sidebarTip.classList.add('hidden');
        sidebarNotice.classList.add('hidden');
        return;
    }

    sidebarContent.innerHTML = gen.recommendations.items.map(item => `
        <div class="text-[0.9rem] text-slate-600 dark:text-text-muted leading-relaxed">
            <strong class="block text-slate-900 dark:text-white">${item.label}:</strong>
            ${item.html}
        </div>
    `).join('');

    if (gen.recommendations.tip) {
        sidebarTip.classList.remove('hidden');
        sidebarTipText.textContent = gen.recommendations.tip;
    } else {
        sidebarTip.classList.add('hidden');
    }

    if (gen.recommendations.notice) {
        sidebarNotice.classList.remove('hidden');
        sidebarNoticeText.textContent = gen.recommendations.notice;
    } else {
        sidebarNotice.classList.add('hidden');
    }
}

function applyMetadataDefaults() {
    (getActiveConfig().metadata || []).forEach(field => {
        if (field.defaultValue && !currentMetadata[field.id]) {
            currentMetadata[field.id] = field.defaultValue;
        }
    });
}

// El equivalente de applyMetadataDefaults para la grilla: rellena las celdas
// vacías de las columnas con defaultValue al cargar, no solo al crear la fila.
// Sin esto el preseteo no aparecería en los datos guardados de antes.
function applyColumnDefaults() {
    const columns = (getActiveConfig().columns || []).filter(col => col.defaultValue);
    if (columns.length === 0) return;
    gridData.forEach((row, index) => {
        columns.forEach(col => {
            if (!row[col.id]) row[col.id] = getColumnDefault(col, index);
        });
    });
}

function renderMetadataFields() {
    const gen = getActiveConfig();
    if (!gen.metadata) {
        generatorFields.classList.add('hidden');
        generatorFields.innerHTML = '';
        return;
    }

    generatorFields.classList.remove('hidden');
    generatorFields.innerHTML = gen.metadata.map(field => `
        <label class="flex flex-col gap-2">
            <span class="text-[0.75rem] uppercase font-bold tracking-wider text-slate-500 dark:text-text-muted">${field.label}</span>
            <input
                type="${field.type || 'text'}"
                data-meta-id="${field.id}"
                placeholder="${field.placeholder}"
                value="${escapeHtml(getMetadataInputValue(field))}"
                ${field.type === 'date' ? `min="${getTomorrowInputDate()}"` : ''}
                class="${getMetadataInputClass(field, getMetadataState(field))}"
            >
        </label>
    `).join('');

    generatorFields.querySelectorAll('[data-meta-id]').forEach(input => {
        input.addEventListener('input', e => updateMetadata(e.target.dataset.metaId, e.target.value));
        if (input.type === 'date') {
            input.addEventListener('click', openNativeDatePicker);
        }
    });

    validateMetadata();
}

function openNativeDatePicker(e) {
    if (typeof e.currentTarget.showPicker !== 'function') return;
    try {
        e.currentTarget.showPicker();
    } catch (error) {
        // Some browsers only allow showPicker during direct user gestures.
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function updateMetadata(fieldId, value) {
    const field = (getActiveConfig().metadata || []).find(item => item.id === fieldId);
    currentMetadata[fieldId] = field && field.type === 'date' ? dateInputToCompact(value) : value.trim();
    if (hasAutoFilename()) {
        currentFilename = resolveFilename();
        inputFilename.value = currentFilename;
    }
    saveToStorage();
    validateGrid();
    updateStats();
}

function getMetadataInputValue(field) {
    const value = currentMetadata[field.id] || '';
    return field.type === 'date' ? compactDateToInput(value) : value;
}

function compactDateToInput(value) {
    if (!/^\d{8}$/.test(value)) return '';
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function dateInputToCompact(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    return value.replaceAll('-', '');
}

function getBaseInputClass() {
    return 'bg-transparent text-slate-900 dark:text-white w-full cell border border-transparent outline-none font-inherit text-sm transition-all focus:bg-slate-50 dark:focus:bg-white/5';
}

function getErrorInputClass() {
    return 'bg-red-500/10 text-red-600 dark:text-red-200 w-full cell border border-red-500/50 outline-none font-inherit text-sm transition-all placeholder:text-red-400/50';
}

// Campo obligatorio todavía vacío. No es un error —el usuario puede no haber
// llegado— así que se marca con un borde punteado suave en vez del rojo.
function getPendingInputClass() {
    return 'bg-transparent text-slate-900 dark:text-white w-full cell border border-dashed border-slate-300 dark:border-white/20 outline-none font-inherit text-sm transition-all focus:bg-slate-50 dark:focus:bg-white/5';
}

// Los campos generales tienen los mismos tres estados que las celdas de la
// grilla: válido, pendiente (vacío, el usuario todavía no llegó) y error (tiene
// un valor que no cumple la regla). Los dos últimos bloquean la descarga por
// igual, así que el corte entre ambos es puramente visual — pero importa: el
// campo arranca vacío y pintarlo de rojo apenas se abre la app señala un error
// que el usuario todavía no cometió.
function getMetadataState(field, metadata = currentMetadata) {
    const value = (metadata[field.id] || '').trim();
    if (value === '') return 'pending';
    const cumpleRegla = (!field.rule || field.rule.test(value))
        && (!field.futureOnly || isFutureCompactDate(value));
    return cumpleRegla ? 'valid' : 'error';
}

function getMetadataInputClass(field, state) {
    const dateClass = field.type === 'date' ? 'date-input ' : '';
    const base = `${dateClass}w-full p-3 rounded-lg outline-none font-inherit text-sm transition-all`;
    if (state === 'error') {
        return `${base} bg-red-500/10 text-red-600 dark:text-red-200 border border-red-500/50 placeholder:text-red-400/50`;
    }
    const fondo = 'bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/5';
    if (state === 'pending') {
        return `${base} ${fondo} border border-dashed border-slate-300 dark:border-white/20`;
    }
    return `${base} ${fondo} border border-slate-200 dark:border-border`;
}

// Devuelve el desglose y no un booleano porque validateGrid necesita los dos
// números por separado: el error de un campo general tiene su propio mensaje, y
// el pendiente se suma a la cuenta de campos que faltan, que es lo que es.
function validateMetadata() {
    const gen = getActiveConfig();
    const resumen = { hasErrors: false, pending: 0 };
    if (!gen.metadata) return resumen;

    gen.metadata.forEach(field => {
        const input = generatorFields.querySelector(`[data-meta-id="${field.id}"]`);
        if (!input) return;

        const state = getMetadataState(field);
        input.className = getMetadataInputClass(field, state);
        if (state === 'valid') {
            input.title = '';
        } else if (state === 'pending') {
            resumen.pending++;
            input.title = field.error ? `Falta completar: ${field.error}` : 'Falta completar';
        } else {
            resumen.hasErrors = true;
            input.title = field.error || 'Campo inválido';
        }
    });

    return resumen;
}

function renderHeader() {
    const gen = getActiveConfig();
    if (!gen.columns) {
        gridHeader.innerHTML = '';
        return;
    }
    gridHeader.innerHTML = getVisibleColumns(gen).map(col =>
        `<th class="cell text-left font-bold border-b border-slate-200 dark:border-border text-slate-500 dark:text-text-muted text-[12px] uppercase tracking-wider${col.width ? ` ${col.width}` : ''}">${col.label}</th>`
    ).join('');
}

function renderPlaceholder() {
    gridBody.innerHTML = `
        <tr>
            <td colspan="20" class="py-24 text-center">
                <div class="flex flex-col items-center gap-3 text-slate-400 dark:text-white/30">
                    <i data-lucide="construction" class="w-9 h-9"></i>
                    <p class="font-bold text-base">Próximamente</p>
                    <p class="text-sm">Este generador estará disponible pronto.</p>
                </div>
            </td>
        </tr>
    `;
    lucide.createIcons();
}

// `defaultValue` puede ser un valor fijo o una función del número de fila, para
// las columnas que se numeran solas (el secuencial del formato de terceros).
function getColumnDefault(col, index) {
    if (!col.defaultValue) return '';
    return typeof col.defaultValue === 'function' ? col.defaultValue(index) : col.defaultValue;
}

// Toda fila nueva nace acá: las columnas con defaultValue arrancan con ese
// valor en vez de vacías. El usuario lo puede sobreescribir como cualquier otro.
function createEmptyRow(gen, index) {
    const row = {};
    gen.columns.forEach(col => row[col.id] = getColumnDefault(col, index));
    return row;
}

function addRows(count) {
    const gen = getActiveConfig();
    if (!gen.columns) return;
    for (let i = 0; i < count; i++) {
        gridData.push(createEmptyRow(gen, gridData.length));
    }
    renderGrid();
    saveToStorage();
}

function createCellInput(col, value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = col.placeholder;
    // Con isAmount, lo que se ve difiere de lo que guarda gridData (ver
    // "Autoformateo en vivo de montos" más abajo): acá se agrupa con comas de
    // miles el valor tal como llega, pegado o cargado con coma decimal
    // incluido.
    input.value = col.isAmount ? formatAmountDisplay(value) : value;
    return input;
}

// Las columnas de conjunto cerrado se cargan con un <select>, no con un input y
// un <datalist>: el datalist filtra las opciones por lo que la celda ya tiene
// escrito, así que con `CTE` cargado la lista ofrecía solo `CTE` y no había forma
// de ver `AHO` sin borrar a mano primero. El select las muestra siempre todas.
//
// Dos cosas que tiene que respetar:
//
// - **La opción vacía.** En este formato el vacío significa algo —con CHQ o EFE
//   el tipo de cuenta debe ir vacío—, así que tiene que poder elegirse. Antes
//   había que borrar la celda con la tecla de retroceso.
// - **Un valor que no está entre las opciones se agrega como una opción más.**
//   Pasa con lo pegado desde Excel (`cte` en minúscula, que la regla acepta) y
//   con un dato mal cargado. Sin esto el select mostraría un valor distinto del
//   que tiene el dato: la celda diría una cosa y el archivo saldría con otra.
function getCellOptions(col, value) {
    if (!col.options) return [];
    return value === '' || col.options.includes(value) ? col.options : [...col.options, value];
}

function createCellSelect(col, value) {
    const select = document.createElement('select');

    [['', '—'], ...getCellOptions(col, value).map(opcion => [opcion, opcion])].forEach(([valor, texto]) => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = texto;
        select.appendChild(option);
    });

    select.value = value;
    return select;
}

function renderGrid() {
    const gen = getActiveConfig();
    if (!gen.columns) {
        renderPlaceholder();
        return;
    }

    gridBody.innerHTML = '';
    gridData.forEach((rowData, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIndex;
        tr.className = 'transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]';

        getVisibleColumns(gen).forEach(col => {
            const td = document.createElement('td');
            td.className = 'border-b border-slate-200 dark:border-border p-0';

            const control = col.options ? createCellSelect(col, rowData[col.id]) : createCellInput(col, rowData[col.id]);
            control.dataset.colId = col.id;
            control.className = getBaseInputClass();

            // Un <select> dispara `input` igual que un campo de texto, así que
            // los dos controles se escuchan igual. Pegar, en cambio, es solo del
            // input: un <select> no recibe el evento.
            //
            // isAmount reemplaza el tecleo por el estilo calculadora: el
            // `keydown` es quien decide qué entra, e `input` queda solo como
            // red de contención (ver "Autoformateo en vivo de montos").
            control.addEventListener('input', col.isAmount
                ? (e) => handleAmountInput(e, rowIndex, col)
                : (e) => updateCell(rowIndex, col.id, e.target.value));
            if (col.isAmount) control.addEventListener('keydown', (e) => handleAmountKeydown(e, rowIndex, col));
            if (!col.options) control.addEventListener('paste', handlePaste);

            td.appendChild(control);
            tr.appendChild(td);
        });

        gridBody.appendChild(tr);
    });
    validateGrid();
}

function updateCell(rowIndex, colId, value) {
    gridData[rowIndex][colId] = value;
    saveToStorage();
    validateGrid();
    updateStats();
}

// Aplica una cinta de dígitos nueva: la guarda en el propio input (es la
// única fuente de verdad de "qué se tipeó" — ver handleAmountKeydown),
// recalcula el monto y lo deja en gridData sin comas, y muestra la versión
// agrupada con el cursor siempre al final —no hay "mitad del número" en un
// campo que se llena como una cinta de calculadora—.
function aplicarDigitosMonto(input, rowIndex, col, digitos) {
    input.dataset.centavos = digitos;
    const limpio = digitos === '' ? '' : digitsToAmount(digitos);
    input.value = limpio === '' ? '' : groupThousands(limpio);
    input.setSelectionRange(input.value.length, input.value.length);
    updateCell(rowIndex, col.id, limpio);
}

// `keydown` de una celda de monto: cada dígito se agrega al final de la cinta
// tipeada y Backspace/Delete sacan el último —da lo mismo dónde esté el
// cursor, como en una calculadora—. Cualquier otro caracter (letras, `.`, `,`)
// no inserta nada: el punto decimal lo pone digitsToAmount solo.
//
// `input.dataset.centavos` es undefined la primera vez que se toca la celda
// en esta sesión (createCellInput no lo inicializa): se arranca a partir de
// lo que ya se ve, así que seguir tipeando sobre un valor pegado o cargado
// también empuja dígitos en vez de arrancar de cero.
function handleAmountKeydown(e, rowIndex, col) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // atajos: copiar, pegar, etc.
    const input = e.target;
    if (input.dataset.centavos === undefined) input.dataset.centavos = input.value.replace(/\D/g, '');

    if (/^\d$/.test(e.key)) {
        e.preventDefault();
        aplicarDigitosMonto(input, rowIndex, col, input.dataset.centavos + e.key);
        return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        aplicarDigitosMonto(input, rowIndex, col, input.dataset.centavos.slice(0, -1));
        return;
    }
    // Bloquea cualquier otro caracter de un solo símbolo para que no se
    // inserte suelto en el medio del valor formateado. Las teclas de
    // navegación (flechas, Tab...) tienen nombres de más de un caracter y
    // pasan de largo, sin efecto porque el cursor no cambia cómo se edita.
    if (e.key.length === 1) e.preventDefault();
}

// Red de contención para lo que no pasa por handleAmountKeydown —Cortar,
// soltar texto arrastrado— y sí dispara `input` de forma nativa: resincroniza
// tomando lo que haya quedado en pantalla como si fuera la cinta de dígitos.
function handleAmountInput(e, rowIndex, col) {
    const input = e.target;
    aplicarDigitosMonto(input, rowIndex, col, input.value.replace(/\D/g, ''));
}

function handlePaste(e) {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');

    // El pegado se mapea contra las columnas visibles: es lo que el usuario ve
    // en la grilla y lo que espera que coincida con su Excel.
    const visibleColumns = getVisibleColumns(gen);
    const startRow = parseInt(e.target.closest('tr').dataset.rowIndex);
    const startColIndex = visibleColumns.findIndex(c => c.id === e.target.dataset.colId);

    rows.forEach((rowText, i) => {
        const cells = rowText.split('\t');
        const targetRowIndex = startRow + i;

        if (!gridData[targetRowIndex]) {
            gridData.push(createEmptyRow(gen, gridData.length));
        }

        cells.forEach((cellValue, j) => {
            const targetColIndex = startColIndex + j;
            const columna = visibleColumns[targetColIndex];
            if (columna) {
                // Una celda de Excel con formato de miles pega "1,500.00": sin
                // normalizeAmount, la regla lo rechaza porque no distingue el
                // separador de miles del decimal (ver normalizeAmount).
                gridData[targetRowIndex][columna.id] = columna.isAmount
                    ? normalizeAmount(cellValue.trim())
                    : cellValue.trim();
            }
        });
    });

    renderGrid();
    saveToStorage();
}

// Recorre los datos —no el DOM— y devuelve una entrada por cada campo o celda
// que impide descargar.
//
// `incluirPendientes` es lo que cambia antes y después de presionar Descargar.
// En falso entran solo los errores: un campo vacío es "todavía no llegué" y
// listarlo llenaría el panel de campos que el usuario ni tocó. En verdadero
// —después del intento de descarga— entra también lo que falta completar,
// porque a esa altura el usuario ya dijo que terminó y necesita ver todo lo que
// lo separa del archivo, no solo lo que escribió mal.
//
// Va sobre los datos y no sobre los inputs pintados para poder verificarla sin
// navegador: la lista es lo que el usuario lee para corregir, y si nombra la
// fila equivocada manda a arreglar una celda que estaba bien.
// `estado` separa los dos motivos por los que algo bloquea la descarga, que se
// arreglan distinto: 'error' es un valor mal cargado —hay que corregirlo— y
// 'falta' es un campo obligatorio todavía vacío —hay que completarlo—. El render
// les da colores distintos; sin esa distinción hay que leer el mensaje de cada
// línea para saber cuál de las dos cosas es.
function collectErrors(gen, rows, metadata, incluirPendientes = false) {
    const errores = [];
    const entrada = (estado, ubicacion, campo, valor, mensaje) => ({
        estado, ubicacion, campo, valor,
        mensaje: mensaje || (estado === 'falta' ? 'Este campo es obligatorio' : 'Campo inválido'),
    });

    (gen.metadata || []).forEach(field => {
        const state = getMetadataState(field, metadata);
        if (state === 'valid') return;
        if (state === 'pending' && !incluirPendientes) return;
        // "General" y no "Campos generales": la etiqueta va en una columna
        // angosta al lado de "Fila 3", y en mayúsculas la versión larga se
        // parte en dos líneas. Cuál es el campo ya lo dice el nombre, al lado.
        errores.push(state === 'pending'
            ? entrada('falta', 'General', field.label, '', field.error)
            : entrada('error', 'General', field.label, (metadata[field.id] || '').trim(), field.error));
    });

    rows.forEach((row, index) => {
        if (isRowEmpty(row, gen)) return;
        getVisibleColumns(gen).forEach(col => {
            const value = (row[col.id] || '').trim();
            if (isCellValid(col, value, row)) return;
            // Vacío e inválido es pendiente; con valor, es error. Mismo corte
            // que hace validateGrid() para pintar la celda.
            if (value === '' && !incluirPendientes) return;
            errores.push(value === ''
                ? entrada('falta', `Fila ${index + 1}`, col.label, '', col.error)
                : entrada('error', `Fila ${index + 1}`, col.label, value, col.error));
        });
    });

    // Sin esto, presionar Descargar con la grilla vacía no muestra nada: no hay
    // ninguna celda de la que quejarse, y el motivo real es que no hay registros.
    // Va sin ubicación: no es de ninguna fila, es de la grilla entera, y una
    // etiqueta que dijera "Grilla" repetiría lo que ya dice la línea.
    if (incluirPendientes && gen.columns && !rows.some(row => !isRowEmpty(row, gen))) {
        errores.push(entrada('falta', '', 'La grilla está vacía', '', 'Carga al menos una fila con datos'));
    }

    return errores;
}

// Las clases de cada estado salen de acá enteras, como las de los inputs: rojo
// para lo que está mal cargado, ámbar para lo que falta. El ámbar ya es el color
// del tip del panel lateral, así que no entra un color nuevo a la paleta.
const ESTILO_ESTADO = {
    error: {
        fila: 'border-l-2 border-l-red-500',
        ubicacion: 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        valor: 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-200',
        cabecera: 'bg-red-500/[0.07] dark:bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-200',
    },
    falta: {
        fila: 'border-l-2 border-l-amber-500',
        ubicacion: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        valor: 'text-amber-700 dark:text-amber-300 italic',
        cabecera: 'bg-amber-500/[0.07] dark:bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    },
};

function renderErrorList(errores) {
    errorPanel.classList.toggle('hidden', errores.length === 0);
    if (errores.length === 0) {
        errorList.innerHTML = '';
        return;
    }

    // El título habla de la descarga porque es la consecuencia que el usuario
    // está viendo: presionó el botón y no pasó nada. El motivo, en la misma frase.
    //
    // El ícono vive en el HTML y no acá: renderErrorList corre en cada tecleo, y
    // reescribir un `data-lucide` obligaría a un lucide.createIcons() por letra.
    errorPanelTitle.textContent = errores.length === 1
        ? '1 campo impide la descarga'
        : `${errores.length} campos impiden la descarga`;

    // La cabecera toma el color del estado más grave que haya: si hay algo mal
    // cargado manda el rojo, y si lo único que pasa es que falta completar, el
    // panel entero se muestra en ámbar. Recibir en rojo a quien no se equivocó
    // —solo no terminó— es el mismo error que pintar de rojo una celda vacía.
    const hayErrores = errores.some(error => error.estado === 'error');
    errorPanelHead.className = `flex items-center gap-2 px-5 py-4 border-b ${ESTILO_ESTADO[hayErrores ? 'error' : 'falta'].cabecera}`;

    errorList.innerHTML = errores.map(error => {
        const estilo = ESTILO_ESTADO[error.estado] || ESTILO_ESTADO.error;
        // La ubicación va en un ancho fijo para que los nombres de campo queden
        // alineados y la lista se lea en columna. Sin ubicación queda el hueco,
        // o la única línea sin etiqueta rompería esa columna.
        const ubicacion = error.ubicacion === ''
            ? '<span class="hidden sm:block sm:w-28 sm:shrink-0"></span>'
            : `<span class="w-fit sm:w-28 sm:shrink-0 rounded px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-center ${estilo.ubicacion}">${escapeHtml(error.ubicacion)}</span>`;
        // El valor se muestra tal como lo escribió el usuario, en monoespaciada,
        // para poder compararlo contra la planilla de la que salió. Lo que falta
        // completar no tiene ninguno: en su lugar va el estado, en palabras.
        const valor = error.valor === ''
            ? `<span class="shrink-0 text-[0.8rem] ${estilo.valor}">sin completar</span>`
            : `<span class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[0.8rem] break-all ${estilo.valor}">${escapeHtml(error.valor)}</span>`;

        return `
        <li class="${estilo.fila} flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
            ${ubicacion}
            <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(error.campo)}</span>
                    ${valor}
                </span>
                <span class="mt-0.5 block text-[0.85rem] leading-snug text-slate-500 dark:text-text-muted">${escapeHtml(error.mensaje)}</span>
            </span>
        </li>`;
    }).join('');
}

function validateGrid() {
    const gen = getActiveConfig();
    // Un generador sin columnas ("Próximamente") no valida nada, pero la lista
    // tiene que irse igual: si no, quedan en pantalla los errores de la pestaña
    // anterior, apuntando a filas que ya no se ven.
    if (!gen.columns) {
        renderErrorList([]);
        return false;
    }

    const metadata = validateMetadata();
    let hasErrors = false;
    let hasContent = false;
    // Los campos generales que faltan se cuentan con los de la grilla: para el
    // usuario son lo mismo, campos que tiene que completar antes de descargar.
    let pendingCount = metadata.pending;

    gridData.forEach((row, index) => {
        const tr = gridBody.children[index];
        if (!tr) return;

        if (isRowEmpty(row, gen)) {
            tr.classList.remove('bg-red-500/5');
            return;
        }

        hasContent = true;
        let rowValid = true;

        getVisibleColumns(gen).forEach((col, colIndex) => {
            // Las columnas con `options` son un <select>; el resto, un input.
            const input = tr.children[colIndex].querySelector('input, select');
            const value = row[col.id].trim();
            const isValid = isCellValid(col, value, row);

            if (isValid) {
                input.className = getBaseInputClass();
                input.title = '';
            } else if (value === '') {
                // Vacío no es un error: el usuario todavía no llegó a la celda.
                // Se marca como pendiente (bloquea la descarga, no tiñe la fila).
                input.className = getPendingInputClass();
                input.title = col.error ? `Falta completar: ${col.error}` : 'Falta completar';
                pendingCount++;
            } else {
                input.className = getErrorInputClass();
                input.title = col.error || 'Campo inválido';
                rowValid = false;
                hasErrors = true;
            }
        });

        tr.classList.toggle('bg-red-500/5', !rowValid);
    });

    // El botón queda siempre habilitado: quien decide si el archivo sale es
    // exportTxt(), con lo que devuelve esta función. Un botón apagado no explica
    // qué falta; la lista de abajo sí, y solo aparece cuando hace falta.
    const puedeExportar = !hasErrors && !metadata.hasErrors && pendingCount === 0 && hasContent;

    if (metadata.hasErrors) {
        statusMessage.textContent = 'Revisa los campos generales';
        statusMessage.className = 'font-semibold text-error';
    } else if (hasErrors) {
        statusMessage.textContent = 'Hay errores en la tabla';
        statusMessage.className = 'font-semibold text-error';
    } else if (pendingCount > 0) {
        statusMessage.textContent = pendingCount === 1
            ? 'Falta 1 campo por completar'
            : `Faltan ${pendingCount} campos por completar`;
        statusMessage.className = 'font-semibold text-slate-500 dark:text-text-muted';
    } else if (!hasContent) {
        statusMessage.textContent = 'Agrega al menos un registro';
        statusMessage.className = 'font-semibold text-slate-500 dark:text-text-muted';
    } else {
        statusMessage.textContent = 'Listo para exportar';
        statusMessage.className = 'font-semibold text-success';
    }

    renderErrorList(collectErrors(gen, gridData, currentMetadata, intentoDescarga));
    return puedeExportar;
}

// Una `rule` puede ser un regex (se valida solo el valor de la celda) o una
// función (value, row) para reglas que dependen de otras columnas de la fila.
// Con función, `optional` no aplica: la función decide también el caso vacío.
function isCellValid(col, value, row) {
    if (typeof col.rule === 'function') return col.rule(value, row);
    if (value === '') return Boolean(col.optional);
    return !col.rule || col.rule.test(value);
}

function findColumn(columns, id) {
    return columns.find(col => col.id === id);
}

function getExportValue(col, row) {
    const value = String(row[col.id] || '').trim();
    return col.exportValue ? col.exportValue(value, row) : value;
}

// Una fila está vacía si lo están las columnas que el generador declara hoy.
// Mirar `Object.values(row)` contaría también las claves que dejó una versión
// anterior de la config: al sacar una columna, su valor sigue en lo que hay
// guardado en localStorage, y una fila que en pantalla se ve vacía quedaría
// contada como registro — bloqueando la descarga para siempre, porque no hay
// forma de borrar una fila — o viajaría al archivo como una línea de campos
// vacíos.
function isRowEmpty(row, gen = getActiveConfig()) {
    return (gen.columns || []).every(col => String(row[col.id] || '').trim() === '');
}

function getNonEmptyRows() {
    return gridData.filter(row => !isRowEmpty(row));
}

function padRight(value, length) {
    return String(value || '').slice(0, length).padEnd(length, ' ');
}

function padLeft(value, length) {
    return String(value || '').slice(0, length).padStart(length, '0');
}

// ── Autoformateo en vivo de montos ──────────────────────────────────────────
// `gridData` sigue guardando el valor sin comas de siempre —dígitos y un punto
// decimal—, que es lo único que validan las reglas y consumen
// formatTerceroAmount/formatBatchAmount. El agrupado con comas es solo lo que
// se ve en el <input>: lo aplican createCellInput y los handlers de abajo,
// nunca se guarda.
//
// El tecleo es estilo calculadora/POS: cada dígito entra por los centavos y
// empuja lo anterior hacia la izquierda —no hay que tipear el punto—. Por eso
// lo único que se rastrea por celda es la cinta de dígitos tal como se fue
// tipeando (en `input.dataset.centavos`, ver handleAmountKeydown): de ahí sale
// siempre un monto con exactamente 2 decimales, que es además lo que exige la
// regla de los tres campos de Batch.

// El núcleo puro: cinta de dígitos → monto con 2 decimales. Los ceros de más a
// la izquierda no cuentan —"00123" es lo mismo que "123"—, sea porque el
// usuario los tipeó de más o porque quedaron de un relleno previo.
function digitsToAmount(digitos) {
    const relleno = digitos.padStart(3, '0');
    const entera = relleno.slice(0, -2).replace(/^0+(?=\d)/, '');
    const decimales = relleno.slice(-2);
    return `${entera}.${decimales}`;
}

// Agrupa la parte entera de a tres desde la derecha, para mostrar el
// resultado de digitsToAmount con separador de miles.
function groupThousands(clean) {
    const punto = clean.indexOf('.');
    const entera = punto === -1 ? clean : clean.slice(0, punto);
    const resto = punto === -1 ? '' : clean.slice(punto);
    return entera.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + resto;
}

// Lo que se guarda en `gridData` cuando el monto llega ya armado desde afuera
// —pegado, o cargado de una sesión anterior— en vez de tecleado dígito a
// dígito. Reconoce el último punto o coma seguido de 1 o 2 dígitos al final
// como el separador decimal, sea "." o ","; cualquier otro punto o coma antes
// de ese solo puede ser un separador de miles, y se descarta.
//
// Sin esto, un monto pegado desde una celda de Excel con formato de miles
// (`1,500.00`) no pasa la regla de validación: la regla no distingue "el
// separador de miles" del decimal, solo espera uno solo en todo el valor.
function normalizeAmount(raw) {
    const str = String(raw || '').trim();
    if (str === '') return '';
    const conDecimal = str.match(/^(.*?)[.,](\d{1,2})$/);
    const entera = (conDecimal ? conDecimal[1] : str).replace(/\D/g, '');
    return conDecimal ? `${entera}.${conDecimal[2]}` : entera;
}

// Para el valor "en reposo": al crear la celda (carga inicial, después de
// pegar, cambio de generador, reset). Agrupa de miles el resultado ya
// normalizado.
function formatAmountDisplay(raw) {
    return groupThousands(normalizeAmount(raw));
}


function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function getTomorrowInputDate() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

function parseCompactDate(value) {
    if (!/^\d{8}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function isFutureCompactDate(value) {
    const date = parseCompactDate(value);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

function addMonths(date, count) {
    const result = new Date(date.getTime());
    result.setMonth(result.getMonth() + count);
    return result;
}

// Un generador puede derivar su nombre de archivo con `filename(metadata)`. En
// ese caso el campo de nombre se muestra deshabilitado y no se persiste.
function hasAutoFilename(gen = getActiveConfig()) {
    return typeof gen.filename === 'function';
}

// `defaultFilename` también acepta una función, para proponer un nombre que
// dependa del día sin por eso deshabilitar el campo (que es lo que hace
// `filename`). Es la diferencia entre sugerir un nombre y derivarlo.
function getDefaultFilename(gen = getActiveConfig()) {
    return typeof gen.defaultFilename === 'function' ? gen.defaultFilename() : (gen.defaultFilename || '');
}

function resolveFilename() {
    const gen = getActiveConfig();
    return hasAutoFilename(gen) ? gen.filename(currentMetadata, gen) : (currentFilename || getDefaultFilename(gen));
}

// El número que le toca al próximo archivo del día. Banca Empresas rechaza dos
// cargas con el mismo nombre en la misma fecha, y como el campo del nombre está
// oculto cuando el generador lo deriva, el contador lo lleva la app.
//
// Se guarda la fecha junto al número —`AAAAMMDD:3`— para poder volver a 1 solo
// cuando cambia el día, en vez de arrastrar una cuenta que crece para siempre.
// Cualquier cosa rara guardada ahí vale 1: es un contador de conveniencia y
// empezar de nuevo es más seguro que exportar un nombre imposible.
function getFileSequence(gen = getActiveConfig()) {
    if (!gen.secuenciaKey) return 1;
    const [fecha, numero] = String(localStorage.getItem(gen.secuenciaKey) || '').split(':');
    if (fecha !== formatDate(new Date())) return 1;
    const secuencia = parseInt(numero, 10);
    return Number.isInteger(secuencia) && secuencia > 0 ? secuencia : 1;
}

// Se llama después de generar el archivo, no antes: el nombre que se descarga
// tiene que ser el que estaba a la vista mientras se armaba.
function bumpFileSequence(gen = getActiveConfig()) {
    if (!gen.secuenciaKey) return;
    localStorage.setItem(gen.secuenciaKey, `${formatDate(new Date())}:${getFileSequence(gen) + 1}`);
}

// `padStart` y no `padLeft`: padLeft trunca con `slice`, así que el archivo 100
// del día saldría como `_10` y chocaría con el nombre del décimo. Un nombre de
// tres dígitos es más largo de lo previsto; uno repetido lo rechaza el banco.
function formatFileSequence(numero) {
    return String(numero).padStart(2, '0');
}

function normalizeOption(value) {
    return String(value || '').trim().toLowerCase();
}

function getBatchNovedad(value) {
    return normalizeOption(value) === 'actualizar deuda' ? '02' : '01';
}

function getBatchSecuencia(value) {
    const map = {
        'unica deuda': '01',
        'segunda deuda': '02',
        'tercera deuda': '03',
        'cuarta deuda': '04'
    };
    return map[normalizeOption(value)] || '';
}

function formatBatchAmount(value) {
    const cleanValue = String(value || '').trim();
    return cleanValue === '' ? '0000000000' : padLeft(cleanValue.replace(/[.,]/g, ''), 10);
}

// El total que se muestra en el pie de la grilla cuando el generador declara
// `totalColumn` (ver APP_CONFIG.generators y updateStats). Suma en centavos
// con formatBatchAmount a propósito: es la misma cuenta que arma
// buildBatchHeader para el archivo, así que lo que se ve en pantalla es lo
// que sale en el .txt, no una suma aparte que se puede desalinear si algo
// cambia. Sin `totalColumn`, o sin filas para sumar, no hay nada que mostrar.
function getColumnTotal(gen, rows) {
    if (!gen.totalColumn || rows.length === 0) return '';
    const total = rows.reduce((suma, fila) => suma + BigInt(formatBatchAmount(fila[gen.totalColumn])), 0n);
    return groupThousands(digitsToAmount(total.toString()));
}

function buildBatchHeader(rows) {
    const today = formatDate(new Date());
    const companyCode = padRight((currentMetadata.codigo_empresa || '').trim().toUpperCase(), 5);
    const recordCount = padLeft(rows.length, 8);
    const total = rows.reduce((sum, row) => sum + BigInt(formatBatchAmount(row.valor_cobrar)), 0n);
    const totalCobros = padLeft(total.toString(), 15);

    return [
        '01',
        'REC',
        '00017',
        companyCode,
        '01',
        today,
        currentMetadata.fecha_ejecucion.trim(),
        recordCount,
        totalCobros,
        ''.padEnd(68, ' ')
    ].join('');
}

function buildBatchDetail(row) {
    const maxPaymentDate = formatDate(addMonths(new Date(), 1));

    return [
        '02',
        getBatchNovedad(row.tipo_registro),
        padRight(row.codigo_cliente.trim(), 15),
        padRight(row.nombre_cliente.trim(), 40),
        formatBatchAmount(row.valor_cobrar),
        maxPaymentDate,
        formatBatchAmount(row.valor_minimo),
        formatBatchAmount(row.valor_retencion),
        padRight(row.referencia.trim(), 15),
        row.periodo.trim(),
        getBatchSecuencia(row.secuencia),
        '    '
    ].join('');
}

function exportFixedBatchTxt() {
    const rows = getNonEmptyRows();
    const lines = [
        buildBatchHeader(rows),
        ...rows.map(buildBatchDetail)
    ];

    downloadText(lines.join('\n'), `${resolveFilename()}.txt`);
}

// --- Pago a Terceros (Cash Management) ---

function normalizeId(value) {
    return String(value || '').trim().toUpperCase();
}

function isCreditoCuenta(row) {
    return normalizeId(row.forma_pago) === 'CTA';
}

function isVentanilla(row) {
    const formaPago = normalizeId(row.forma_pago);
    return formaPago === 'CHQ' || formaPago === 'EFE';
}

// Forma de Pago decide qué esperan Tipo y Nº de cuenta. Mientras siga sin
// elegir no hay nada que decidir todavía, y la celda que depende de ella no
// puede salir en rojo: el usuario cargó una cuenta correcta y lo único que le
// falta es elegir cómo paga. Marcarla sería culparlo por un dato que está bien
// —y con el mensaje de CHQ o EFE, que no eligió—, además de darle un error que
// no se arregla tocando esa celda.
//
// No abre ningún agujero: la propia Forma de Pago queda pendiente hasta que se
// llene, así que la descarga sigue bloqueada, y al elegirla las dos celdas se
// revalidan contra la rama que corresponda.
function faltaFormaPago(row) {
    return normalizeId(row.forma_pago) === '';
}

function isBancoGuayaquil(row) {
    return formatTerceroInstitucion(row.codigo_institucion) === '0017';
}

// Excel se come los ceros a la izquierda de todo lo que le parezca un número: la
// cédula 0912378320 pegada desde una planilla llega como 912378320, y el código
// 0017 como 17. Como son campos de largo fijo, el cero perdido se repone solo al
// exportar en vez de pedirle al usuario que lo escriba de nuevo a mano.
//
// El relleno completa, no arregla: las reglas siguen exigiendo un valor
// plausible —una cédula de 8 dígitos se marca en rojo igual— porque rellenar
// cualquier cosa cambiaría un error visible por un dato plausible y equivocado,
// que es el peor de los dos. Solo se rellena hasta el largo declarado.
//
// El código de institución se compara ya rellenado, y no solo al exportar: es lo
// que hace que escribir `17` siga siendo Banco Guayaquil para isBancoGuayaquil()
// —y por lo tanto para la regla y el relleno de la cuenta del campo 11—. Los de
// 15 caracteres y los que no son solo dígitos pasan tal cual.
function formatTerceroInstitucion(value) {
    const codigo = String(value || '').trim().toUpperCase();
    return /^\d{1,4}$/.test(codigo) ? padLeft(codigo, 4) : codigo;
}

// La cédula son 10 dígitos y el RUC 13. Lo que Excel se come es el cero de la
// provincia (01 a 09), así que las reglas aceptan un dígito menos y el cero se
// repone acá. El pasaporte no tiene largo fijo: no hay nada que rellenar.
//
// Vacío sale vacío y no en ceros: un `0000000000` es una identificación
// plausible que nadie cargó. La validación no deja llegar hasta acá con la celda
// vacía, pero si algo cambia, que falle a la vista.
function formatTerceroId(value, row) {
    const identificacion = normalizeId(value);
    if (identificacion === '') return '';
    const tipo = normalizeId(row.tipo_id);
    if (tipo === 'C') return padLeft(identificacion, 10);
    if (tipo === 'R') return padLeft(identificacion, 13);
    return identificacion;
}

// 11 enteros + 2 decimales, sin separador: 12645.76 → 0000001264576
function formatTerceroAmount(value) {
    const [integer, decimals = ''] = String(value || '').trim().replace(',', '.').split('.');
    return padLeft(integer, 11) + decimals.padEnd(2, '0').slice(0, 2);
}

// Las cuentas de Banco Guayaquil se completan con ceros hasta 10 dígitos; las de
// otras instituciones van tal cual. Con CHQ o EFE el campo viaja vacío.
function formatTerceroAccount(value, row) {
    if (!isCreditoCuenta(row)) return '';
    return isBancoGuayaquil(row) ? padLeft(value, 10) : value;
}

// El campo 5 no se carga: el formato lo define como copia de otro campo de la
// misma línea —con CTA, la cuenta del proveedor; en ventanilla, su
// identificación—, así que se deriva. Sale con el mismo valor exportado que su
// campo de origen, ceros a la izquierda de una cuenta de BG incluidos: los dos
// campos dicen exactamente lo mismo.
//
// Ojo con el desborde: el banco declara el campo 5 en Alfanumérico/20 y el 11
// hasta 30 para otras instituciones, así que una cuenta larga de otro banco sale
// completa y se pasa del largo del 5. Es una tensión del propio documento del
// banco; se exporta entera a propósito, porque cortarla en silencio mandaría al
// archivo un número de cuenta plausible y equivocado. Ver docs/estado.md.
function formatTerceroCodigo(row, columns) {
    const origen = isCreditoCuenta(row) ? 'numero_cuenta' : 'numero_id';
    return getExportValue(findColumn(columns, origen), row);
}

// El campo 20 pide el pipe antes de la dirección para que el banco mande la
// notificación al beneficiario. Vacío sale vacío: sin correo no hay pipe.
function formatTerceroCorreo(value) {
    return value ? `|${value}` : '';
}

function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revocar de inmediato corta la descarga si el navegador pide "dónde
    // guardar" (diálogo asíncrono): para cuando el usuario elige carpeta,
    // la URL del blob ya no existe.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTxt() {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    // Acá se validan los datos, no antes: el botón está siempre habilitado.
    // A partir del primer intento también se lista lo que falta completar, que
    // hasta ahora era "todavía no llegué" y no se mostraba.
    intentoDescarga = true;
    if (!validateGrid()) {
        // La lista puede quedar fuera de la pantalla en una grilla larga, y sin
        // esto presionar Descargar no se ve como que haya hecho nada.
        errorPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }
    // El archivo salió: se apaga el modo "mostrame todo lo que falta" para no
    // recibir al usuario con una lista de reclamos apenas agregue una fila.
    intentoDescarga = false;

    if (gen.exportType === 'fixedBatch') {
        exportFixedBatchTxt();
    } else {
        const validRows = getNonEmptyRows();
        const lines = validRows.map((row, index) => gen.exportRow
            ? gen.exportRow(row, index, currentMetadata, gen.columns)
            : gen.columns.map(col => getExportValue(col, row)).join(gen.exportSeparator || ','));

        downloadText(lines.join('\n'), `${resolveFilename()}.txt`);
    }

    // El archivo del día ya salió con este número: el próximo lleva el
    // siguiente. Va después de generarlo para que el nombre descargado sea el
    // que estaba a la vista mientras se armaba.
    bumpFileSequence(gen);
    if (hasAutoFilename(gen)) {
        currentFilename = resolveFilename();
        inputFilename.value = currentFilename;
    }
}

function resetGrid() {
    const gen = getActiveConfig();
    if (!confirm('¿Estás seguro de que quieres borrar todos los datos?')) return;

    intentoDescarga = false;
    // El contador del nombre NO se borra: cuenta los archivos que ya salieron
    // hoy, y volver a 01 después de un reset armaría un nombre repetido, que es
    // justo lo que el banco rechaza.
    gridData = [];
    if (gen.storageKey) localStorage.removeItem(gen.storageKey);
    if (gen.metadataKey) localStorage.removeItem(gen.metadataKey);
    currentMetadata = {};
    applyMetadataDefaults();

    if (gen.columns) {
        currentFilename = hasAutoFilename(gen) ? gen.filename(currentMetadata, gen) : gen.defaultFilename;
        if (gen.filenameKey) localStorage.removeItem(gen.filenameKey);
        inputFilename.value = currentFilename;
        renderMetadataFields();
        addRows(APP_CONFIG.defaultRows);
    }
}

function updateStats() {
    const gen = getActiveConfig();
    if (!gen.columns) {
        rowCountDisplay.textContent = '';
        statusMessage.textContent = '';
        totalDisplay.textContent = '';
        return;
    }
    const nonEmptyRows = gridData.filter(row => !isRowEmpty(row, gen));
    rowCountDisplay.textContent = `${nonEmptyRows.length} registros válidos`;

    // Solo lo declara Recaudación Batch hoy (ver APP_CONFIG.generators), y
    // solo mientras haya algo que sumar: en un generador nuevo, sin filas
    // cargadas, mostrar "Total: 0.00" es ruido, no información.
    const total = getColumnTotal(gen, nonEmptyRows);
    totalDisplay.textContent = total ? `Total a cobrar: $${total}` : '';
}

function saveToStorage() {
    const gen = getActiveConfig();
    if (!gen.storageKey) return;
    localStorage.setItem(gen.storageKey, JSON.stringify(gridData));
    if (gen.metadataKey) localStorage.setItem(gen.metadataKey, JSON.stringify(currentMetadata));
    if (gen.filenameKey) localStorage.setItem(gen.filenameKey, currentFilename);
}

function loadFromStorage() {
    const gen = getActiveConfig();
    if (!gen.storageKey) {
        gridData = [];
        currentMetadata = {};
        return;
    }
    try {
        gridData = JSON.parse(localStorage.getItem(gen.storageKey) || '[]');
        currentMetadata = gen.metadataKey ? JSON.parse(localStorage.getItem(gen.metadataKey) || '{}') : {};
    } catch (e) {
        gridData = [];
        currentMetadata = {};
    }
}

// Event Listeners
btnThemeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));
btnSidebarToggle.addEventListener('click', toggleSidebar);
// Reaplica el estado completo, no solo la posición: un resize puede cruzar
// SIDEBAR_BREAKPOINT y ahí cambia también qué clase controla mostrar/ocultar.
window.addEventListener('resize', () => applySidebarState(isSidebarVisible));
btnAddRow.addEventListener('click', () => addRows(1));
btnReset.addEventListener('click', resetGrid);
btnDownload.addEventListener('click', exportTxt);
inputFilename.addEventListener('input', (e) => {
    if (hasAutoFilename()) return;
    currentFilename = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    saveToStorage();
});

init();
