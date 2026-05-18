#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f server.key && -f server.cert ]]; then
  echo "Les fichiers server.key et server.cert existent déjà."
  echo "Supprimez-les manuellement pour les régénérer."
  exit 0
fi

openssl req -x509 -newkey rsa:4096 \
  -keyout server.key \
  -out server.cert \
  -days 365 \
  -nodes \
  -subj "/CN=localhost/O=Secure Webshop/C=CH"

chmod 600 server.key
echo "Certificat créé : server.key, server.cert (valide 365 jours)"
