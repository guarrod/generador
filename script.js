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
            id: 'generador_2',
            label: 'Generador 2',
            title: 'Próximamente',
            description: 'Este generador estará disponible próximamente.',
            storageKey: null,
            filenameKey: null,
            defaultFilename: null,
            columns: null,
            recommendations: null
        }
    ]
};

// State
let activeGeneratorIndex = parseInt(localStorage.getItem(APP_CONFIG.activeGeneratorKey) || '0');
let gridData = [];
let currentFilename = '';
let currentTheme = localStorage.getItem(APP_CONFIG.themeKey) || 'dark';
let isSidebarVisible = localStorage.getItem(APP_CONFIG.sidebarKey) !== 'false';

// DOM Elements
const tabsContainer = document.getElementById('tabs-container');
const generatorTitle = document.getElementById('generator-title');
const generatorDescription = document.getElementById('generator-description');
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

    if (gen.columns) {
        footerActions.classList.remove('hidden');
        const savedFilename = gen.filenameKey ? localStorage.getItem(gen.filenameKey) : null;
        currentFilename = savedFilename || gen.defaultFilename;
        inputFilename.value = currentFilename;

        renderHeader();
        if (gridData.length === 0) {
            addRows(APP_CONFIG.defaultRows);
        } else {
            renderGrid();
        }
    } else {
        footerActions.classList.add('hidden');
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
            input.className = 'bg-transparent text-slate-900 dark:text-white w-full p-3 border border-transparent outline-none font-inherit text-sm transition-all focus:bg-slate-50 dark:focus:bg-white/5';

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
            const input = tr.children[colIndex].firstChild;
            const value = row[col.id].trim();

            let isValid = true;
            if (value === '') {
                if (!col.optional) isValid = false;
            } else if (col.rule) {
                isValid = col.rule.test(value);
            }

            if (!isValid) {
                input.className = 'bg-red-500/10 text-red-600 dark:text-red-200 w-full p-4 border border-red-500/50 outline-none font-inherit text-sm transition-all placeholder:text-red-400/50';
                input.title = col.error || 'Campo inválido';
                rowValid = false;
                hasErrors = true;
            } else {
                input.className = 'bg-transparent text-slate-900 dark:text-white w-full p-3 border border-transparent outline-none font-inherit text-sm transition-all focus:bg-slate-50 dark:focus:bg-white/5';
                input.title = '';
            }
        });

        tr.classList.toggle('bg-red-500/5', !rowValid);
    });

    btnDownload.disabled = hasErrors || !hasContent;
    statusMessage.textContent = hasErrors ? 'Hay errores en la tabla' : 'Listo para exportar';
    statusMessage.className = hasErrors ? 'font-semibold text-error' : 'font-semibold text-success';
}

function exportTxt() {
    const gen = getActiveConfig();
    if (!gen.columns) return;

    const validRows = gridData.filter(row => !Object.values(row).every(val => val.trim() === ''));

    const lines = validRows.map(row => {
        return gen.columns.map(col => {
            let val = row[col.id].trim();
            if (col.id === 'forma_pago' || col.id === 'tipo') val = val.toUpperCase();
            if (col.id === 'monto') val = val === '' ? '9999999' : val + '00';
            return val;
        }).join(',');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFilename || gen.defaultFilename}.txt`;
    a.click();

    resetGrid();
}

function resetGrid() {
    const gen = getActiveConfig();
    if (!confirm('¿Estás seguro de que quieres borrar todos los datos?')) return;

    gridData = [];
    if (gen.storageKey) localStorage.removeItem(gen.storageKey);

    if (gen.columns) {
        currentFilename = gen.defaultFilename;
        if (gen.filenameKey) localStorage.removeItem(gen.filenameKey);
        inputFilename.value = currentFilename;
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
    if (gen.filenameKey) localStorage.setItem(gen.filenameKey, currentFilename);
}

function loadFromStorage() {
    const gen = getActiveConfig();
    if (!gen.storageKey) {
        gridData = [];
        return;
    }
    try {
        gridData = JSON.parse(localStorage.getItem(gen.storageKey) || '[]');
    } catch (e) {
        gridData = [];
    }
}

// Event Listeners
btnThemeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));
btnSidebarToggle.addEventListener('click', toggleSidebar);
btnAddRow.addEventListener('click', () => addRows(1));
btnReset.addEventListener('click', resetGrid);
btnDownload.addEventListener('click', exportTxt);
inputFilename.addEventListener('input', (e) => {
    currentFilename = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    saveToStorage();
});

init();
