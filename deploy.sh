#!/usr/bin/env bash
# Publica el sitio en el servidor estático configurado.
#
#   ./deploy.sh            main → producción
#   ./deploy.sh preview    la rama actual → la URL de vista previa
#
# La configuración es local y no se versiona: copiá `deploy.env.example` a
# `deploy.env` y completalo con los datos de tu servidor.
set -euo pipefail

cd "$(dirname "$0")"
MODO="${1:-produccion}"

if [[ ! -f deploy.env ]]; then
    echo "Falta deploy.env. Copiá deploy.env.example a deploy.env y completalo." >&2
    exit 1
fi
# shellcheck source=/dev/null
source ./deploy.env
: "${SSH_ALIAS:?Falta SSH_ALIAS en deploy.env}"

# Se publica lo que está commiteado, no lo que hay en el editor: avisar es más
# útil que fallar, porque a veces uno quiere publicar el último commit igual.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Aviso: hay cambios sin commitear. Se publica el commit, no el working tree." >&2
fi

case "$MODO" in
    produccion)
        : "${REMOTE_DIR:?Falta REMOTE_DIR en deploy.env}"
        git push origin main
        ssh "$SSH_ALIAS" "cd $REMOTE_DIR && git pull --ff-only origin main"
        echo "Listo: ${PUBLIC_URL:-publicado}"
        ;;

    preview)
        : "${PREVIEW_DIR:?Falta PREVIEW_DIR en deploy.env}"
        RAMA="$(git rev-parse --abbrev-ref HEAD)"
        if [[ "$RAMA" == "main" ]]; then
            echo "Estás en main: para producción es ./deploy.sh sin argumentos." >&2
            exit 1
        fi
        git push origin "$RAMA"
        # `checkout` para poder cambiar de rama la preview sin tocar el servidor
        # a mano; `merge --ff-only` para que falle fuerte si alguien dejó algo
        # local ahí, en vez de descartarlo en silencio.
        ssh "$SSH_ALIAS" "cd $PREVIEW_DIR \
            && git fetch --quiet origin '$RAMA' \
            && git checkout --quiet '$RAMA' \
            && git merge --ff-only 'origin/$RAMA'"
        echo "Listo: ${PREVIEW_URL:-publicado}  (rama $RAMA)"
        ;;

    *)
        echo "Uso: ./deploy.sh [preview]" >&2
        exit 1
        ;;
esac
