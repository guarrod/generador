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
            columns: [
                { id: 'codigo', label: 'Código', placeholder: 'Cuenta, suministro...', rule: /^[a-zA-Z0-9]{0,50}$/, error: 'Máx 50 caracteres alfanuméricos' },
                { id: 'descripcion', label: 'Descripción', placeholder: 'Ref. pago...', rule: /^[a-zA-Z0-9\s]{0,100}$/, error: 'Máx 100 caracteres alfanuméricos' },
                { id: 'forma_pago', label: 'Forma Pago', placeholder: 'CTA / TAR', rule: /^(CTA|TAR)$/i, error: 'Debe ser CTA o TAR' },
                { id: 'tipo', label: 'Tipo Cta/Tar', placeholder: 'CTE, AHO, A, V, M', rule: /^(CTE|AHO|A|V|M)$/i, error: 'CTE, AHO, A, V o M' },
                { id: 'numero', label: 'Nº Cta/Tar', placeholder: '0123456789', rule: /^\d{0,20}$/, error: 'Máx 20 números' },
                { id: 'monto', label: 'Monto Máx', placeholder: 'Opcional (9999999)', rule: /^\d{0,7}$/, error: 'Máx 7 números', optional: true },
                { id: 'email', label: 'Email', placeholder: 'usuario@mail.com', rule: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, optional: true },
                { id: 'telefono', label: 'Teléfono', placeholder: '0999999999', rule: /^\d{0,10}$/, optional: true }
            ],
            recommendations: {
                items: [
                    { label: 'Código', html: 'Hasta 50 caracteres (Cuenta, Predio, etc).' },
                    { label: 'Forma de Pago', html: `Use ${chip('CTA')} para Débito o ${chip('TAR')} para Tarjeta.` },
                    { label: 'Tipo', html: `${chip('CTE')}, ${chip('AHO')}, ${chip('A')}, ${chip('V')} o ${chip('M')}.` },
                    { label: 'Nº Cuenta', html: 'Solo números, hasta 20 dígitos.' },
                    { label: 'Monto Máx', html: 'Opcional. Por defecto 9999999.' }
                ],
                tip: 'Puedes copiar desde Excel y pegar directamente en la primera celda.'
            }
        },
        {
            id: 'recaudacion_batch',
            label: 'Recaudación Batch',
            title: 'Generador Batch de Recaudación',
            description: 'Genera el archivo TXT de Cobros o Facturación (RECAUDOS17_TC) con registros de 124 caracteres.',
            storageKey: 'bg_gen_recaudacion_batch_data',
            metadataKey: 'bg_gen_recaudacion_batch_metadata',
            filenameKey: 'bg_gen_recaudacion_batch_filename',
            defaultFilename: 'REM',
            exportType: 'fixedBatch',
            metadata: [
                { id: 'fecha_ejecucion', label: 'Fecha de ejecución', placeholder: 'Seleccione una fecha', type: 'date', futureOnly: true, rule: /^\d{8}$/, error: 'Seleccione una fecha futura' },
                { id: 'codigo_empresa', label: 'Código de empresa', placeholder: 'EFA', rule: /^[a-zA-Z0-9]{1,5}$/, error: 'Máx 5 caracteres alfanuméricos' }
            ],
            columns: [
                { id: 'tipo_registro', label: 'Tipo Registro', placeholder: 'Nueva Deuda', options: ['Nueva Deuda', 'Actualizar Deuda'], rule: /^(Nueva Deuda|Actualizar Deuda)$/i, error: 'Nueva Deuda o Actualizar Deuda' },
                { id: 'codigo_cliente', label: 'Código Cliente', placeholder: '123456789', rule: /^[a-zA-Z0-9]{1,15}$/, error: 'Máx 15 caracteres alfanuméricos' },
                { id: 'nombre_cliente', label: 'Nombre Cliente', placeholder: 'Usuario Prueba', rule: /^.{1,40}$/, error: 'Máx 40 caracteres' },
                { id: 'valor_cobrar', label: 'Valor a Cobrar', placeholder: '220.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Ingrese un monto con 2 decimales. Ej: 220.00' },
                { id: 'valor_minimo', label: 'Valor Mínimo', placeholder: '50.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Vacío o monto con 2 decimales. Ej: 50.00', optional: true, defaultExport: '0000000000' },
                { id: 'valor_retencion', label: 'Valor Retención', placeholder: '0.00', rule: /^\d{1,8}([.,]\d{2})$/, error: 'Vacío o monto con 2 decimales. Ej: 0.00', optional: true, defaultExport: '0000000000' },
                { id: 'referencia', label: 'Referencia', placeholder: 'PRUEBA DE PAGO', rule: /^.{0,15}$/, error: 'Máx 15 caracteres', optional: true },
                { id: 'periodo', label: 'Periodo', placeholder: 'AAAAMM', rule: /^\d{6}$/, error: 'Debe tener formato AAAAMM' },
                { id: 'secuencia', label: 'Secuencia', placeholder: 'Unica Deuda', options: ['Unica Deuda', 'Segunda Deuda', 'Tercera Deuda', 'Cuarta Deuda'], rule: /^(Unica Deuda|Segunda Deuda|Tercera Deuda|Cuarta Deuda)$/i, error: 'Seleccione una secuencia válida' }
            ],
            recommendations: {
                items: [
                    { label: 'Archivo', html: `Salida fija de ${chip('124')} caracteres por línea con cabecera ${chip('01REC')}.` },
                    { label: 'Empresa', html: 'Código entregado por Banco Guayaquil, hasta 5 caracteres.' },
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
const btnAddRow = document.getElementById('btn-add-row');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');
const btnThemeToggle = document.getElementById('theme-toggle');
const btnSidebarToggle = document.getElementById('sidebar-toggle');
const sidebarIconOpen = document.getElementById('sidebar-icon-open');
const sidebarIconClosed = document.getElementById('sidebar-icon-closed');
const sidebarPanel = document.getElementById('sidebar-panel');
const layoutWrapper = document.getElementById('layout-wrapper');
const rowCountDisplay = document.getElementById('row-count');
const statusMessage = document.getElementById('status-message');
const footerActions = document.getElementById('footer-actions');

function getActiveConfig() {
    return APP_CONFIG.generators[activeGeneratorIndex];
}

function init() {
    applyTheme(currentTheme);
    applySidebarState(isSidebarVisible);
    lucide.createIcons();
    renderTabs();
    loadGenerator();
}

function loadGenerator() {
    const gen = getActiveConfig();

    generatorTitle.textContent = gen.title;
    generatorDescription.textContent = gen.description;

    loadFromStorage();

    renderSidebar();
    renderMetadataFields();

    if (gen.columns) {
        footerActions.classList.remove('hidden');
        const savedFilename = gen.filenameKey ? localStorage.getItem(gen.filenameKey) : null;
        currentFilename = gen.exportType === 'fixedBatch' ? getBatchFilename() : (savedFilename || gen.defaultFilename);
        inputFilename.value = currentFilename;
        inputFilename.disabled = gen.exportType === 'fixedBatch';
        inputFilename.classList.toggle('opacity-60', gen.exportType === 'fixedBatch');

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

function renderTabs() {
    tabsContainer.innerHTML = APP_CONFIG.generators.map((gen, i) => {
        const isActive = i === activeGeneratorIndex;
        const activeClass = 'bg-gradient-to-br from-secondary to-[#ec4899] text-white shadow-[0_4px_15px_-3px_rgba(210,0,110,0.4)]';
        const inactiveClass = 'bg-white dark:bg-white/5 border border-slate-200 dark:border-border text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white';
        return `<button class="px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${isActive ? activeClass : inactiveClass}" onclick="switchGenerator(${i})">${gen.label}</button>`;
    }).join('');
}

function switchGenerator(index) {
    if (index === activeGeneratorIndex) return;
    activeGeneratorIndex = index;
    localStorage.setItem(APP_CONFIG.activeGeneratorKey, index);
    gridData = [];
    renderTabs();
    loadGenerator();
}

function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(APP_CONFIG.themeKey, theme);
    currentTheme = theme;
}

function applySidebarState(visible) {
    if (visible) {
        sidebarPanel.classList.remove('hidden');
        sidebarPanel.style.width = '320px';
        sidebarPanel.style.opacity = '1';
        layoutWrapper.classList.add('lg:grid-cols-[1fr_320px]');
        layoutWrapper.classList.remove('lg:grid-cols-1');
        sidebarIconOpen.classList.remove('hidden');
        sidebarIconClosed.classList.add('hidden');
    } else {
        sidebarPanel.classList.add('hidden');
        sidebarPanel.style.width = '0';
        sidebarPanel.style.opacity = '0';
        layoutWrapper.classList.remove('lg:grid-cols-[1fr_320px]');
        layoutWrapper.classList.add('lg:grid-cols-1');
        sidebarIconOpen.classList.add('hidden');
        sidebarIconClosed.classList.remove('hidden');
    }
    localStorage.setItem(APP_CONFIG.sidebarKey, visible);
    isSidebarVisible = visible;
}

function toggleSidebar() {
    applySidebarState(!isSidebarVisible);
}

function renderSidebar() {
    const gen = getActiveConfig();
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarTip = document.getElementById('sidebar-tip');
    const sidebarTipText = document.getElementById('sidebar-tip-text');

    if (!gen.recommendations) {
        sidebarContent.innerHTML = '<p class="text-sm text-slate-400 dark:text-white/30 italic">Sin recomendaciones disponibles.</p>';
        sidebarTip.classList.add('hidden');
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
                class="${getMetadataInputClass(field, true)}"
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
    if (getActiveConfig().exportType === 'fixedBatch') {
        currentFilename = getBatchFilename();
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
    return 'bg-transparent text-slate-900 dark:text-white w-full p-3 border border-transparent outline-none font-inherit text-sm transition-all focus:bg-slate-50 dark:focus:bg-white/5';
}

function getErrorInputClass() {
    return 'bg-red-500/10 text-red-600 dark:text-red-200 w-full p-4 border border-red-500/50 outline-none font-inherit text-sm transition-all placeholder:text-red-400/50';
}

function getMetadataInputClass(field, isValid) {
    const dateClass = field.type === 'date' ? 'date-input ' : '';
    if (!isValid) {
        return `${dateClass}bg-red-500/10 text-red-600 dark:text-red-200 w-full p-3 rounded-lg border border-red-500/50 outline-none font-inherit text-sm transition-all placeholder:text-red-400/50`;
    }
    return `${dateClass}bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white w-full p-3 rounded-lg border border-slate-200 dark:border-border outline-none font-inherit text-sm transition-all focus:bg-white dark:focus:bg-white/5`;
}

function validateMetadata() {
    const gen = getActiveConfig();
    if (!gen.metadata) return true;

    let isValid = true;
    gen.metadata.forEach(field => {
        const input = generatorFields.querySelector(`[data-meta-id="${field.id}"]`);
        if (!input) return;

        const value = (currentMetadata[field.id] || '').trim();
        const fieldValid = value !== ''
            && (!field.rule || field.rule.test(value))
            && (!field.futureOnly || isFutureCompactDate(value));
        input.className = getMetadataInputClass(field, fieldValid);
        input.title = fieldValid ? '' : field.error;
        if (!fieldValid) isValid = false;
    });

    return isValid;
}

function renderHeader() {
    const gen = getActiveConfig();
    if (!gen.columns) {
        gridHeader.innerHTML = '';
        return;
    }
    gridHeader.innerHTML = gen.columns.map(col =>
        `<th class="p-4 text-left font-bold border-b border-slate-200 dark:border-border text-slate-500 dark:text-text-muted text-[0.7rem] uppercase tracking-wider">${col.label}</th>`
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

function addRows(count) {
    const gen = getActiveConfig();
    if (!gen.columns) return;
    for (let i = 0; i < count; i++) {
        const row = {};
        gen.columns.forEach(col => row[col.id] = '');
        gridData.push(row);
    }
    renderGrid();
    saveToStorage();
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

        gen.columns.forEach(col => {
            const td = document.createElement('td');
            td.className = 'border-b border-slate-200 dark:border-border p-0';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = col.placeholder;
            input.value = rowData[col.id];
            input.dataset.colId = col.id;
            input.className = getBaseInputClass();

            if (col.options) {
                const listId = `${gen.id}-${rowIndex}-${col.id}-options`;
                const datalist = document.createElement('datalist');
                datalist.id = listId;
                col.options.forEach(optionValue => {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    datalist.appendChild(option);
                });
                input.setAttribute('list', listId);
                td.appendChild(datalist);
            }

            input.addEventListener('input', (e) => updateCell(rowIndex, col.id, e.target.value));
            input.addEventListener('paste', handlePaste);

            td.appendChild(input);
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

function handlePaste(e) {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');

    const startRow = parseInt(e.target.closest('tr').dataset.rowIndex);
    const startColIndex = gen.columns.findIndex(c => c.id === e.target.dataset.colId);

    rows.forEach((rowText, i) => {
        const cells = rowText.split('\t');
        const targetRowIndex = startRow + i;

        if (!gridData[targetRowIndex]) {
            const newRow = {};
            gen.columns.forEach(col => newRow[col.id] = '');
            gridData.push(newRow);
        }

        cells.forEach((cellValue, j) => {
            const targetColIndex = startColIndex + j;
            if (gen.columns[targetColIndex]) {
                gridData[targetRowIndex][gen.columns[targetColIndex].id] = cellValue.trim();
            }
        });
    });

    renderGrid();
    saveToStorage();
}

function validateGrid() {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    const metadataValid = validateMetadata();
    let hasErrors = false;
    let hasContent = false;

    gridData.forEach((row, index) => {
        const tr = gridBody.children[index];
        if (!tr) return;

        const isRowEmpty = Object.values(row).every(val => val.trim() === '');
        if (isRowEmpty) {
            tr.classList.remove('bg-red-500/5');
            return;
        }

        hasContent = true;
        let rowValid = true;

        gen.columns.forEach((col, colIndex) => {
            const input = tr.children[colIndex].querySelector('input');
            const value = row[col.id].trim();

            let isValid = true;
            if (value === '') {
                if (!col.optional) isValid = false;
            } else if (col.rule) {
                isValid = col.rule.test(value);
            }

            if (!isValid) {
                input.className = getErrorInputClass();
                input.title = col.error || 'Campo inválido';
                rowValid = false;
                hasErrors = true;
            } else {
                input.className = getBaseInputClass();
                input.title = '';
            }
        });

        tr.classList.toggle('bg-red-500/5', !rowValid);
    });

    btnDownload.disabled = hasErrors || !hasContent || !metadataValid;
    if (!metadataValid) {
        statusMessage.textContent = 'Complete los campos generales';
        statusMessage.className = 'font-semibold text-error';
    } else if (hasErrors) {
        statusMessage.textContent = 'Hay errores en la tabla';
        statusMessage.className = 'font-semibold text-error';
    } else {
        statusMessage.textContent = 'Listo para exportar';
        statusMessage.className = 'font-semibold text-success';
    }
}

function getNonEmptyRows() {
    return gridData.filter(row => !Object.values(row).every(val => val.trim() === ''));
}

function padRight(value, length) {
    return String(value || '').slice(0, length).padEnd(length, ' ');
}

function padLeft(value, length) {
    return String(value || '').slice(0, length).padStart(length, '0');
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

function getBatchFilename() {
    const companyCode = (currentMetadata.codigo_empresa || 'EMPRESA').trim().toUpperCase() || 'EMPRESA';
    return `REM_${formatDate(new Date())}_${companyCode}`;
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

    downloadText(lines.join('\n'), `${getBatchFilename()}.txt`);
    resetGrid();
}

function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportTxt() {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    if (gen.exportType === 'fixedBatch') {
        exportFixedBatchTxt();
        return;
    }

    const validRows = getNonEmptyRows();
    const lines = validRows.map(row => {
        return gen.columns.map(col => {
            let val = row[col.id].trim();
            if (col.id === 'forma_pago' || col.id === 'tipo') val = val.toUpperCase();
            if (col.id === 'monto') val = val === '' ? '9999999' : val + '00';
            return val;
        }).join(',');
    });

    downloadText(lines.join('\n'), `${currentFilename || gen.defaultFilename}.txt`);

    resetGrid();
}

function resetGrid() {
    const gen = getActiveConfig();
    if (!confirm('¿Estás seguro de que quieres borrar todos los datos?')) return;

    gridData = [];
    if (gen.storageKey) localStorage.removeItem(gen.storageKey);
    if (gen.metadataKey) localStorage.removeItem(gen.metadataKey);
    currentMetadata = {};

    if (gen.columns) {
        currentFilename = gen.exportType === 'fixedBatch' ? getBatchFilename() : gen.defaultFilename;
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
        return;
    }
    const count = gridData.filter(row => !Object.values(row).every(val => val.trim() === '')).length;
    rowCountDisplay.textContent = `${count} registros válidos`;
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
btnAddRow.addEventListener('click', () => addRows(1));
btnReset.addEventListener('click', resetGrid);
btnDownload.addEventListener('click', exportTxt);
inputFilename.addEventListener('input', (e) => {
    if (getActiveConfig().exportType === 'fixedBatch') return;
    currentFilename = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    saveToStorage();
});

init();
