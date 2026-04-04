const APP_CONFIG = {
    storageKey: 'bg_generator_data',
    filenameKey: 'bg_generator_filename',
    themeKey: 'bg_generator_theme',
    sidebarKey: 'bg_generator_sidebar',
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
    defaultRows: 1
};

// State Management
let gridData = [];
let currentFilename = 'carga_masiva';
let currentTheme = localStorage.getItem(APP_CONFIG.themeKey) || 'dark';
let isSidebarVisible = localStorage.getItem(APP_CONFIG.sidebarKey) !== 'false';

// DOM Elements
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

// Initialize
function init() {
    applyTheme(currentTheme);
    applySidebarState(isSidebarVisible);
    lucide.createIcons();
    renderHeader();
    loadFromStorage();

    // Set filename input
    inputFilename.value = currentFilename;

    if (gridData.length === 0) {
        addRows(APP_CONFIG.defaultRows);
    } else {
        renderGrid();
    }
    updateStats();
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
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

function renderHeader() {
    gridHeader.innerHTML = APP_CONFIG.columns.map(col => `<th class="p-4 text-left font-bold border-b border-slate-200 dark:border-border text-slate-500 dark:text-text-muted text-[0.7rem] uppercase tracking-wider">${col.label}</th>`).join('');
}

function addRows(count) {
    for (let i = 0; i < count; i++) {
        const row = {};
        APP_CONFIG.columns.forEach(col => row[col.id] = '');
        gridData.push(row);
    }
    renderGrid();
    saveToStorage();
}

function renderGrid() {
    gridBody.innerHTML = '';
    gridData.forEach((rowData, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIndex;
        tr.className = 'transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]';

        APP_CONFIG.columns.forEach(col => {
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
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');

    const startRow = parseInt(e.target.closest('tr').dataset.rowIndex);
    const startColIndex = APP_CONFIG.columns.findIndex(c => c.id === e.target.dataset.colId);

    rows.forEach((rowText, i) => {
        const cells = rowText.split('\t');
        const targetRowIndex = startRow + i;

        if (!gridData[targetRowIndex]) {
            const newRow = {};
            APP_CONFIG.columns.forEach(col => newRow[col.id] = '');
            gridData.push(newRow);
        }

        cells.forEach((cellValue, j) => {
            const targetColIndex = startColIndex + j;
            if (APP_CONFIG.columns[targetColIndex]) {
                const colId = APP_CONFIG.columns[targetColIndex].id;
                gridData[targetRowIndex][colId] = cellValue.trim();
            }
        });
    });

    renderGrid();
    saveToStorage();
}

function validateGrid() {
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

        APP_CONFIG.columns.forEach((col, colIndex) => {
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

        if (!rowValid) {
            tr.classList.add('bg-red-500/5');
        } else {
            tr.classList.remove('bg-red-500/5');
        }
    });

    btnDownload.disabled = hasErrors || !hasContent;
    statusMessage.textContent = hasErrors ? 'Hay errores en la tabla' : 'Listo para exportar';
    statusMessage.className = hasErrors ? 'font-semibold text-error' : 'font-semibold text-success';
}

function exportTxt() {
    const validRows = gridData.filter(row => !Object.values(row).every(val => val.trim() === ''));

    const lines = validRows.map(row => {
        const formatted = APP_CONFIG.columns.map(col => {
            let val = row[col.id].trim();

            // Force uppercase for specific fields
            if (col.id === 'forma_pago' || col.id === 'tipo') {
                val = val.toUpperCase();
            }

            // Format specific rules
            if (col.id === 'monto') {
                if (val === '') {
                    val = '9999999';
                } else {
                    val = val + '00'; // Add cents only for entered values
                }
            }

            return val;
        });
        return formatted.join(',');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFilename || 'carga_masiva'}.txt`;
    a.click();

    // Clear state after download as requested
    resetGrid();
}

function resetGrid() {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos?')) {
        gridData = [];
        currentFilename = 'carga_masiva';
        inputFilename.value = currentFilename;
        localStorage.removeItem(APP_CONFIG.storageKey);
        localStorage.removeItem(APP_CONFIG.filenameKey);
        addRows(APP_CONFIG.defaultRows);
    }
}

function updateStats() {
    const count = gridData.filter(row => !Object.values(row).every(val => val.trim() === '')).length;
    rowCountDisplay.textContent = `${count} registros válidos`;
}

function saveToStorage() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(gridData));
    localStorage.setItem(APP_CONFIG.filenameKey, currentFilename);
}

function loadFromStorage() {
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    const savedFilename = localStorage.getItem(APP_CONFIG.filenameKey);

    if (saved) {
        try {
            gridData = JSON.parse(saved);
        } catch (e) {
            gridData = [];
        }
    }
    if (savedFilename) {
        currentFilename = savedFilename;
    }
}

// Event Listeners
btnThemeToggle.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});
btnSidebarToggle.addEventListener('click', toggleSidebar);
btnAddRow.addEventListener('click', () => addRows(1));
btnReset.addEventListener('click', resetGrid);
btnDownload.addEventListener('click', exportTxt);
inputFilename.addEventListener('input', (e) => {
    currentFilename = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    saveToStorage();
});

// Run init
init();
