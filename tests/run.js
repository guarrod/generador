#!/usr/bin/env node
// Corre todos los archivos *.test.js de esta carpeta.
//
//   node tests/run.js            todo
//   node tests/run.js servicios  solo las suites cuyo nombre contenga "servicios"
//
// Sin dependencias: alcanza con Node 18 o superior.
const fs = require('fs');
const path = require('path');

const filtro = process.argv[2];
const archivos = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !filtro || f.includes(filtro))
    .sort();

if (archivos.length === 0) {
    console.error(filtro ? `Ninguna suite coincide con "${filtro}".` : 'No hay archivos *.test.js.');
    process.exit(1);
}

const VERDE = '\x1b[32m', ROJO = '\x1b[31m', GRIS = '\x1b[90m', FIN = '\x1b[0m';
let totalOk = 0;
const fallos = [];

for (const archivo of archivos) {
    const suite = require(path.join(__dirname, archivo));
    console.log(`\n${suite.nombre}`);

    let okSuite = 0;
    const check = (descripcion, actual, esperado) => {
        const paso = JSON.stringify(actual) === JSON.stringify(esperado);
        if (paso) {
            okSuite++;
            totalOk++;
            console.log(`  ${VERDE}✓${FIN} ${GRIS}${descripcion}${FIN}`);
        } else {
            fallos.push({ suite: suite.nombre, descripcion, actual, esperado });
            console.log(`  ${ROJO}✗ ${descripcion}${FIN}`);
            console.log(`      esperado: ${JSON.stringify(esperado)}`);
            console.log(`      obtuve:   ${JSON.stringify(actual)}`);
        }
    };
    // Para lo que la rama activa no incluye (un generador que todavía no se liberó).
    const saltear = motivo => console.log(`  ${GRIS}– ${motivo}${FIN}`);

    try {
        suite.correr({ check, saltear });
    } catch (error) {
        fallos.push({ suite: suite.nombre, descripcion: 'la suite explotó', actual: error.message, esperado: 'sin excepciones' });
        console.log(`  ${ROJO}✗ la suite explotó: ${error.message}${FIN}`);
        console.log(`${GRIS}${error.stack.split('\n').slice(1, 4).join('\n')}${FIN}`);
    }
    console.log(`  ${GRIS}${okSuite} verificaciones${FIN}`);
}

console.log();
if (fallos.length === 0) {
    console.log(`${VERDE}${totalOk} verificaciones, todo en verde.${FIN}`);
    process.exit(0);
}
console.log(`${ROJO}${fallos.length} fallo(s) sobre ${totalOk + fallos.length} verificaciones:${FIN}`);
fallos.forEach(f => console.log(`  · ${f.suite} → ${f.descripcion}`));
process.exit(1);
