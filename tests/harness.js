// Carga script.js fuera del navegador para poder verificar reglas de validación
// y líneas exportadas sin abrir la app.
//
// Cómo funciona: script.js solo toca el DOM en el bloque `// Event Listeners` y
// en `init()`, los dos al final del archivo. Cortando el fuente ahí y evaluando
// el resto en un contexto de `node:vm` con stubs mínimos de `localStorage` y
// `document`, quedan accesibles `APP_CONFIG` y todas las funciones.
//
// Detalle del que es fácil olvidarse: los `const` y `function` de nivel superior
// NO quedan en el global del contexto de la VM, hay que exponerlos a mano. Acá
// se hace solo: se leen los nombres del fuente y se arma la lista sola, así el
// harness no se rompe cuando una rama agrega o saca funciones.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

function cargarApp() {
    const src = fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8');
    const corte = src.indexOf('// Event Listeners');
    if (corte === -1) throw new Error('No encontré el bloque "// Event Listeners" en script.js: el harness corta ahí.');

    // Nodos del DOM falsos, guardados por id para poder hacer aserciones sobre
    // lo que el render les escribió.
    const nodos = {};
    const nodo = id => nodos[id] || (nodos[id] = {
        id, innerHTML: '', textContent: '', value: '', title: '', className: '', disabled: false,
        classes: new Set(),
        classList: {
            add: c => nodos[id].classes.add(c),
            remove: c => nodos[id].classes.delete(c),
            toggle: (c, on) => on ? nodos[id].classes.add(c) : nodos[id].classes.delete(c),
            contains: c => nodos[id].classes.has(c),
        },
        querySelector: () => null,
        appendChild() {}, removeChild() {}, addEventListener() {},
    });

    const almacen = {};
    const contexto = {
        localStorage: {
            getItem: k => (k in almacen ? almacen[k] : null),
            setItem: (k, v) => { almacen[k] = String(v); },
            removeItem: k => { delete almacen[k]; },
        },
        document: { getElementById: nodo, createElement: () => nodo('_temp'), body: nodo('_body') },
        console,
    };
    vm.createContext(contexto);

    const funciones = [...src.matchAll(/^function (\w+)/gm)].map(m => m[1]);
    const accesores = [
        'APP_CONFIG',
        'getGrid: () => gridData',
        'setGrid: filas => { gridData = filas; }',
        'getMetadata: () => currentMetadata',
        'setMetadata: datos => { currentMetadata = datos; }',
    ];
    // El índice activo es `const` en las ramas sin pestañas: ahí no se puede mover.
    if (/^let activeGeneratorIndex/m.test(src)) {
        accesores.push('setActive: i => { activeGeneratorIndex = i; }');
    }

    const exponer = `\nglobalThis.__app = { ${[...accesores, ...funciones].join(', ')} };`;
    vm.runInContext(src.slice(0, corte) + exponer, contexto);

    const app = contexto.__app;
    return {
        app,
        nodos,
        almacen,
        // Estado de la grilla, para armar escenarios
        getGrid: app.getGrid,
        setGrid: app.setGrid,
        getMetadata: app.getMetadata,
        setMetadata: app.setMetadata,
        // Cambia de generador si la rama lo permite; si no, verifica que sea el activo.
        irA(id) {
            const i = app.APP_CONFIG.generators.findIndex(g => g.id === id);
            if (i === -1) return false;
            if (app.setActive) app.setActive(i);
            return i === 0 || Boolean(app.setActive);
        },
        generador(id) {
            return app.APP_CONFIG.generators.find(g => g.id === id);
        },
        // Fila con todas las columnas, partiendo de los preseteos del generador.
        fila(gen, valores = {}, indice = 0) {
            return { ...app.createEmptyRow(gen, indice), ...valores };
        },
        // La línea que saldría al archivo para esa fila.
        linea(gen, fila, indice = 0, metadata = {}) {
            return gen.exportRow
                ? gen.exportRow(fila, indice, metadata, gen.columns)
                : gen.columns.map(col => app.getExportValue(col, fila)).join(gen.exportSeparator || ',');
        },
    };
}

module.exports = { cargarApp, RAIZ };
