const chip = text => `<code class="bg-slate-100 dark:bg-white/10 px-1 rounded text-secondary font-mono">${text}</code>`;

const APP_CONFIG = {
    themeKey: 'bg_generator_theme',
    sidebarKey: 'bg_generator_sidebar',
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
        }
    ]
};

// State
// La app sirve un solo generador: `generators` sigue siendo un array porque es
// el contrato de toda la lógica de render, pero acá no hay pestañas para
// cambiar de índice. La versión con las cuatro está en la rama `pestanas`.
const activeGeneratorIndex = 0;
let gridData = [];
let currentMetadata = {};
let currentFilename = '';
let currentTheme = localStorage.getItem(APP_CONFIG.themeKey) || 'dark';
let isSidebarVisible = localStorage.getItem(APP_CONFIG.sidebarKey) !== 'false';

// DOM Elements
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
const sidebarPanel = document.getElementById('sidebar-panel');
const layoutWrapper = document.getElementById('layout-wrapper');
const rowCountDisplay = document.getElementById('row-count');
const statusMessage = document.getElementById('status-message');
const footerActions = document.getElementById('footer-actions');

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
    loadGenerator();
}

function loadGenerator() {
    const gen = getActiveConfig();

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
        currentFilename = autoFilename ? gen.filename(currentMetadata) : (savedFilename || getDefaultFilename(gen));
        inputFilename.value = currentFilename;
        inputFilename.disabled = autoFilename;
        inputFilename.classList.toggle('opacity-60', autoFilename);

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

function applySidebarState(visible) {
    if (visible) {
        sidebarPanel.classList.remove('hidden');
        sidebarPanel.style.width = '320px';
        sidebarPanel.style.opacity = '1';
        layoutWrapper.classList.add('lg:grid-cols-[1fr_320px]');
        layoutWrapper.classList.remove('lg:grid-cols-1');
    } else {
        sidebarPanel.classList.add('hidden');
        sidebarPanel.style.width = '0';
        sidebarPanel.style.opacity = '0';
        layoutWrapper.classList.remove('lg:grid-cols-[1fr_320px]');
        layoutWrapper.classList.add('lg:grid-cols-1');
    }
    btnSidebarToggle.className = getSidebarToggleClass(visible);
    btnSidebarToggle.setAttribute('aria-expanded', visible);
    localStorage.setItem(APP_CONFIG.sidebarKey, visible);
    isSidebarVisible = visible;
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

function getMetadataInputClass(field, isValid) {
    const dateClass = field.type === 'date' ? 'date-input ' : '';
    if (!isValid) {
        return `${dateClass}bg-red-500/10 text-red-600 dark:text-red-200 w-full cell rounded-lg border border-red-500/50 outline-none font-inherit text-sm transition-all placeholder:text-red-400/50`;
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
            if (visibleColumns[targetColIndex]) {
                gridData[targetRowIndex][visibleColumns[targetColIndex].id] = cellValue.trim();
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
    let pendingCount = 0;

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

        getVisibleColumns(gen).forEach((col, colIndex) => {
            const input = tr.children[colIndex].querySelector('input');
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

    btnDownload.disabled = hasErrors || pendingCount > 0 || !hasContent || !metadataValid;
    if (!metadataValid) {
        statusMessage.textContent = 'Complete los campos generales';
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
    return hasAutoFilename(gen) ? gen.filename(currentMetadata) : (currentFilename || getDefaultFilename(gen));
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

function isBancoGuayaquil(row) {
    return String(row.codigo_institucion || '').trim() === '0017';
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

    if (gen.exportType === 'fixedBatch') {
        exportFixedBatchTxt();
        return;
    }

    const validRows = getNonEmptyRows();
    const lines = validRows.map((row, index) => gen.exportRow
        ? gen.exportRow(row, index, currentMetadata, gen.columns)
        : gen.columns.map(col => getExportValue(col, row)).join(gen.exportSeparator || ','));

    downloadText(lines.join('\n'), `${resolveFilename()}.txt`);
}

function resetGrid() {
    const gen = getActiveConfig();
    if (!confirm('¿Estás seguro de que quieres borrar todos los datos?')) return;

    gridData = [];
    if (gen.storageKey) localStorage.removeItem(gen.storageKey);
    if (gen.metadataKey) localStorage.removeItem(gen.metadataKey);
    currentMetadata = {};
    applyMetadataDefaults();

    if (gen.columns) {
        currentFilename = hasAutoFilename(gen) ? gen.filename(currentMetadata) : gen.defaultFilename;
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
    if (hasAutoFilename()) return;
    currentFilename = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    saveToStorage();
});

init();
