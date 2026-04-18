# **SOLUCIÓN ERROR CONEXIÓN RAILWAY + RENDER**

## **PROBLEMA IDENTIFICADO**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

El servidor está intentando conectarse a `localhost` en lugar de a Railway. Las variables de entorno no se están configurando correctamente en Render.

---

## **SOLUCIÓN INMEDIATA**

### **1. Obtener Variables de Railway**
En tu dashboard de Railway, ve a tu servicio MySQL y copia estas variables:

```bash
# Variables que Railway te proporciona:
RAILWAY_DB_USERNAME=railway
RAILWAY_DB_PASSWORD=tu_password
RAILWAY_DB_NAME=foodshare
RAILWAY_DB_PORT=3306
RAILWAY_PRIVATE_HOST=containers-us-west-XXX.railway.app
MYSQL_PUBLIC_URL=mysql://railway:password@containers-us-west-XXX.railway.app:3306/foodshare
```

### **2. Configurar Variables en Render**
En tu dashboard de Render, ve a tu servicio backend y configura estas variables:

```env
# Variables de entorno en Render
NODE_ENV=production
PORT=3001

# Base de datos Railway (COPIA TUS VALORES REALES)
DB_HOST=containers-us-west-XXX.railway.app
DB_USER=railway
DB_PASSWORD=tu_password_railway
DB_NAME=foodshare
DB_PORT=3306

# Variables Railway (alternativas)
RAILWAY_PRIVATE_HOST=containers-us-west-XXX.railway.app
RAILWAY_DB_USERNAME=railway
RAILWAY_DB_PASSWORD=tu_password_railway
RAILWAY_DB_NAME=foodshare
RAILWAY_DB_PORT=3306
MYSQL_PUBLIC_URL=mysql://railway:tu_password_railway@containers-us-west-XXX.railway.app:3306/foodshare

# CORS
ALLOWED_ORIGINS=https://tu-frontend-render.onrender.com
```

### **3. Debug Implementado**
He agregado debug en `server.js` para ver qué variables se están cargando:

```javascript
console.log('=== DEBUG VARIABLES DE ENTORNO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('RAILWAY_PRIVATE_HOST:', process.env.RAILWAY_PRIVATE_HOST);
// ... más logs
```

---

## **VERIFICACIÓN PASO A PASO**

### **Paso 1: Ver Logs en Render**
1. Ve a tu servicio en Render
2. Haz clic en "Logs"
3. Busca los logs que empiezan con `=== DEBUG VARIABLES DE ENTORNO ===`
4. Verifica que las variables de Railway aparezcan

### **Paso 2: Si Variables Faltan**
Si no ves las variables de Railway en los logs:

1. **Revisa nombres exactos** en Railway
2. **Copia y pega** exactamente como aparecen
3. **Agrega manualmente** en Render si no se importan

### **Paso 3: Test de Conexión**
Después de configurar, el log debería mostrar:
```
Configuración final de DB: {
  host: 'containers-us-west-XXX.railway.app',
  user: 'railway',
  database: 'foodshare',
  port: 3306,
  ssl: { rejectUnauthorized: false }
}
```

Y luego:
```
Conectado a MySQL
Servidor corriendo en puerto 3001
```

---

## **CONFIGURACIÓN RÁPIDA (COPIA Y PEGA)**

### **En Railway (MySQL)**
1. Ve a tu servicio MySQL
2. Copia la variable `MYSQL_PUBLIC_URL`
3. Desgla así en un editor de texto:
   ```
   mysql://railway:PASSWORD@HOST:PORT/foodshare
   ```

### **En Render (Backend)**
Configura estas variables exactamente:

```env
NODE_ENV=production
DB_HOST=HOST_DE_RAILWAY
DB_USER=railway
DB_PASSWORD=PASSWORD_DE_RAILWAY
DB_NAME=foodshare
DB_PORT=PORT_DE_RAILWAY
MYSQL_PUBLIC_URL=URL_COMPLETA_DE_RAILWAY
ALLOWED_ORIGINS=https://tu-frontend-render.onrender.com
```

---

## **SOLUCIÓN ALTERNATIVA**

Si sigues teniendo problemas, puedes usar directamente `MYSQL_PUBLIC_URL`:

```javascript
// En server.js, reemplaza la configuración con:
const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
```

---

## **IMPORTANTE**

1. **NO uses localhost** en producción
2. **Configura SSL** para Railway
3. **Verifica logs** después de cada cambio
4. **Reinicia el servicio** en Render después de configurar variables

**El debug mostrará exactamente qué variables se están cargando. Configura las que faltan y funcionará.**
