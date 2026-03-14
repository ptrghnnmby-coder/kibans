#!/bin/bash
# Script para generar el archivo YAML de env vars para Cloud Run
# Esto maneja correctamente el GOOGLE_PRIVATE_KEY con saltos de línea

ENV_FILE=".env.local"
OUTPUT="cloudrun-env.yaml"

# Empezar el archivo
echo "" > $OUTPUT

# Función para escapar el valor para YAML
write_var() {
  local key=$1
  local value=$2
  # Usar comillas dobles en YAML para manejar caracteres especiales
  echo "${key}: '${value}'" >> $OUTPUT
}

# Leer .env.local y generar el YAML
while IFS= read -r line; do
  # Ignorar comentarios y líneas vacías
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  
  # Parsear KEY=VALUE
  key=$(echo "$line" | cut -d= -f1)
  value=$(echo "$line" | cut -d= -f2-)
  
  # Limpiar comillas alrededor del valor
  value="${value%\"}"
  value="${value#\"}"
  
  # Variables que queremos incluir
  case "$key" in
    GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|NEXTAUTH_URL|NEXTAUTH_SECRET|\
    SHEET_MASTER_ID|SHEET_CONTACTS_ID|SHEET_PRODUCTS_ID|SHEET_NOTES_ID|\
    GOOGLE_CLIENT_EMAIL|GOOGLE_IMPERSONATE_EMAIL|OPENAI_API_KEY|\
    GOOGLE_CLIENT_EMAIL_SENDER|GOOGLE_PRIVATE_KEY|\
    TERMINAL49_API_KEY|HAPAG_CLIENT_ID|HAPAG_CLIENT_SECRET)
      write_var "$key" "$value"
      ;;
  esac
done < "$ENV_FILE"

echo "✅ Archivo $OUTPUT generado con $(wc -l < $OUTPUT) variables"
cat $OUTPUT
