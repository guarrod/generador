#!/usr/bin/env bash
# Publica la rama main en el servidor estático que esté configurado.
#
# La configuración es local y no se versiona: copiá `deploy.env.example` a
# `deploy.env` y poné ahí el alias SSH y el directorio del servidor.
set -euo pipefail

CONFIG="$(dirname "$0")/deploy.env"

if [[ ! -f "$CONFIG" ]]; then
    echo "Falta $CONFIG. Copiá deploy.env.example a deploy.env y completalo." >&2
    exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG"
: "${SSH_ALIAS:?Falta SSH_ALIAS en deploy.env}"
: "${REMOTE_DIR:?Falta REMOTE_DIR en deploy.env}"

git push origin main
ssh "$SSH_ALIAS" "cd $REMOTE_DIR && git pull origin main"

echo "Listo: ${PUBLIC_URL:-publicado}"
