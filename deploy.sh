#!/bin/bash

# Script de despliegue para MartaBot en Google Cloud Run

# Configuración
PROJECT_ID="martabot-organizacion"
SERVICE_NAME="martabot"
REGION="us-central1"

echo "🚀 Iniciando despliegue de MartaBot a Cloud Run..."

# 1. Asegurar que el proyecto activo y cuenta son correctos
gcloud config set account info@southmarinetrading.com
gcloud config set project $PROJECT_ID

# 2. Habilitar APIs necesarias
echo "📦 Habilitando APIs de Google Cloud..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com --project=$PROJECT_ID

# 3. Construir la imagen con Cloud Build y subirla a GCR
# Lee la key de Maps desde .env.local (NEXT_PUBLIC_ se incrusta en build time)
MAPS_KEY=$(grep NEXT_PUBLIC_GOOGLE_MAPS_KEY .env.local | cut -d= -f2)
echo "🛠️ Construyendo imagen de Docker..."
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --substitutions="_MAPS_KEY=${MAPS_KEY},_IMAGE=gcr.io/$PROJECT_ID/$SERVICE_NAME" 2>/dev/null || \
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --project=$PROJECT_ID


# 4. Desplegar a Cloud Run
echo "🌍 Desplegando a Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --project=$PROJECT_ID

echo "✅ Despliegue completado con éxito!"
