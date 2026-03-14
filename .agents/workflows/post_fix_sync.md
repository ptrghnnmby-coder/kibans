---
description: ofrecer sincronizar fix a ArgentumBot después de implementar una reparación en MartaBot
---

# Post-Fix Sync Offer → ArgentumBot

Este workflow se activa **automáticamente al finalizar cualquier fix o implementación** en MartaBot.

## Cuándo aplicar este workflow

Siempre que se haga alguno de los siguientes cambios en MartaBot:
- Reparación de un bug o error en producción
- Fix de una API o endpoint que no andaba
- Corrección de lógica en `src/lib/`
- Arreglo de un componente que fallaba
- Cualquier cambio funcional (no de estilo/marca)

## Pasos

1. Al terminar el fix en MartaBot, **antes de cerrar la tarea**, preguntar a la usuaria:

   > "¿Querés aplicar este mismo fix en ArgentumBot? ArgentumBot comparte la misma base de código y probablemente tenga el mismo problema."

2. Si responde **sí** (o similar):
   - Aplicar el fix **manualmente y con cuidado** en los archivos equivalentes en `/Users/natalia/Desktop/Argentum/app/src/`
   - NO usar el script `sync_from_martabot.sh` para fixes puntuales — ese script es para sincronizaciones masivas
   - Respetar siempre los archivos de marca de Argentum:
     - `globals.css` → paleta navy/gold (NO tocar)
     - `Sidebar.tsx` → dice "ARGENTUM" (NO tocar)
     - `layout.tsx` → título "Argentum" (NO tocar)
   - Confirmar a la usuaria que el fix fue aplicado en ambas apps

3. Si responde **no** o **después**:
   - No hacer nada en Argentum
   - Cerrar la tarea normalmente

## Regla clave

**No preguntar si el cambio es solo de UI/marca/branding** (colores, fuentes, logo, textos propios de MartaBot). Solo preguntar cuando el cambio es de **lógica, APIs, o funcionalidad** que Argentum también debería tener.
