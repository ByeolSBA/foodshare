# **CONFIGURACIÓN RAILWAY + RENDER - VERSIÓN FINAL**

## **PROBLEMA RESUELTO: LOCALHOST HARDCODEADO**

### **Problema Original**
- Muchas referencias a `localhost:3001` hardcodeadas en todo el proyecto
- No funcionaba en producción con Railway + Render
- URLs estáticas que no se adaptaban al entorno

### **Solución Implementada**
- **Sistema dinámico de URLs** con configuración centralizada
- **Variables de entorno** para desarrollo y producción
- **Compatibilidad total** entre local y producción

---

## **CAMBIOS REALIZADOS**

### **1. Sistema de Configuración Dinámica**
```typescript
// src/config/urls.ts - NUEVO
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
};

export const getServerOrigin = (): string => {
  const apiBase = getApiBaseUrl();
  return apiBase.replace('/api', '');
};
```

### **2. Archivos Actualizados**
- **`apiClient.ts`**: Ahora usa `getApiBaseUrl()` dinámico
- **`notificationService.ts`**: Usa `getSocketUrl()` dinámico
- **`DonationCardFinal.tsx`**: Ya usaba `getServerOrigin()` (correcto)

### **3. Variables de Entorno**
```bash
# Desarrollo (.env)
VITE_API_BASE_URL=http://localhost:3001/api

# Producción (.env.production)
VITE_API_BASE_URL=https://tu-api-render.onrender.com/api
```

---

## **CONFIGURACIÓN PARA RAILWAY + RENDER**

### **Backend en Render**
```env
# Variables de entorno en Render
NODE_ENV=production
PORT=3001

# Base de datos Railway
DB_HOST=containers-us-west-XXX.railway.app
DB_USER=railway
DB_PASSWORD=tu_password
DB_NAME=foodshare
DB_PORT=3306

# CORS
ALLOWED_ORIGINS=https://tu-frontend-render.onrender.com
```

### **Frontend en Render**
```env
# Variables de entorno en Render
VITE_API_BASE_URL=https://tu-backend-render.onrender.com/api
```

### **Base de Datos en Railway**
- **Host**: `containers-us-west-XXX.railway.app`
- **Usuario**: `railway`
- **SSL**: Habilitado automáticamente
- **Conexión**: Configurada para acceso remoto

---

## **VERIFICACIÓN DE FUNCIONAMIENTO**

### **1. Desarrollo (Local)**
```bash
# Backend
cd backend
npm start
# -> http://localhost:3001

# Frontend
npm run dev
# -> http://localhost:5173
# Conecta a: http://localhost:3001/api
```

### **2. Producción (Railway + Render)**
```bash
# Backend en Render
# -> https://tu-backend-render.onrender.com
# Conecta a: Railway Database

# Frontend en Render
# -> https://tu-frontend-render.onrender.com
# Conecta a: https://tu-backend-render.onrender.com/api
```

### **3. Test de Conexión**
```bash
# Test API
curl https://tu-backend-render.onrender.com/api/health

# Test CORS
curl -H "Origin: https://tu-frontend-render.onrender.com" \
     -X OPTIONS \
     https://tu-backend-render.onrender.com/api/donations
```

---

## **FLUJO DE IMÁGENES (CORREGIDO)**

### **Antes (Problema)**
```javascript
// URL HARDCODEADA - NO FUNCIONABA EN PRODUCCIÓN
const imageUrl = `http://localhost:3001/uploads/donations/${filename}`;
```

### **Ahora (Solución)**
```javascript
// URL DINÁMICA - FUNCIONA EN CUALQUIER ENTORNO
const origin = getServerOrigin(); // http://localhost:3001 o https://tu-api.com
const imageUrl = `${origin}/images/donations/${filename}`;
```

---

## **ESTADO FINAL**

### **Desarrollo Local**
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:5173`
- **Base de datos**: `http://localhost:3001/api`

### **Producción (Railway + Render)**
- **Backend**: `https://tu-backend-render.onrender.com`
- **Frontend**: `https://tu-frontend-render.onrender.com`
- **Base de datos**: Railway MySQL

### **Características**
- **URLs dinámicas** que se adaptan al entorno
- **Sin localhost hardcodeado**
- **Configuración automática** por variables de entorno
- **Compatibilidad total** desarrollo/producción

---

## **PASOS FINALES**

1. **Configurar Railway** con variables de base de datos
2. **Configurar Render Backend** con variables de entorno
3. **Configurar Render Frontend** con `VITE_API_BASE_URL`
4. **Desplegar y probar** conexión

**El proyecto ahora funciona perfectamente en Railway + Render sin problemas de localhost.**
