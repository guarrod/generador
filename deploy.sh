#!/usr/bin/env bash
# Publica la rama main en guarrod.com/generador/.
# Requiere el alias SSH "pulsar" configurado (~/.ssh/config).
set -euo pipefail

git push origin main
ssh pulsar "cd /var/www/demos/generador && git pull origin main"

echo "Listo: https://guarrod.com/generador/"
