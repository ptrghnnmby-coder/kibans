# MartaBot - Sistema de Gestión Comercial

Sistema web para gestión de comercio exterior, migrado desde N8N.

## 🚀 Cómo ejecutar

### 1. Instalar dependencias
```bash
cd /Users/natalia/Desktop/MartaBot
npm install
```

### 2. Configurar credenciales
```bash
cp .env.example .env.local
# Editá .env.local con tus credenciales reales
```

### 3. Ejecutar en modo desarrollo
```bash
npm run dev
```

### 4. Abrir en el navegador
Ir a: http://localhost:3000

## 📁 Estructura del Proyecto

```
MartaBot/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Dashboard principal
│   │   ├── layout.tsx        # Layout con sidebar
│   │   ├── globals.css       # Estilos globales
│   │   ├── chat/             # Chat con Marta
│   │   ├── contactos/        # Gestión de contactos
│   │   └── proformas/        # Gestión de proformas
│   └── components/
│       └── Sidebar.tsx       # Navegación lateral
├── package.json
├── tsconfig.json
└── .env.example
```

## 🎨 Stack Tecnológico

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Google Sheets API** - Base de datos
- **Lucide Icons** - Iconografía
- **OpenAI GPT-4** - Chat con IA (próximamente)

## 👥 Equipo de Especialistas

Para conocer los perfiles y responsabilidades de los agentes especialistas (como Señor Workspace), consulta [TEAM.md](file:///Users/natalia/Desktop/MartaBot%20Antigravity/MartaBot/TEAM.md).

## 📝 Próximos Pasos

1. [ ] Conectar Google Sheets API
2. [ ] Implementar CRUD real de contactos
3. [ ] Generación de PDFs
4. [ ] Integración con OpenAI
5. [ ] Envío de emails
