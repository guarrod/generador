# CLAUDE.md

La documentación de arquitectura de este repo vive en
[ARCHITECTURE.md](ARCHITECTURE.md): el motor declarativo, los puntos de
extensión de la config, las trampas de los formatos de ancho fijo y las
convenciones. Leelo antes de cambiar nada.

Además:

- [README.md](README.md) — qué hace la herramienta y el detalle de cada formato.
- [docs/estado.md](docs/estado.md) — alcance de la entrega, supuestos sin
  confirmar y decisiones ya tomadas.

## Antes de dar un cambio por terminado

```bash
node tests/run.js
```

Las suites verifican las reglas de validación y la línea que sale al archivo.
Si tocás una regla o el formato de exportación, la suite va en el mismo commit.
