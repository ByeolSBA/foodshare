# FoodShare Backend

Backend API para la plataforma FoodShare usando Node.js, Express y MariaDB.

## Configuración

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar MariaDB en Kali Linux

#### Instalar MariaDB:
```bash
sudo apt update
sudo apt install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

#### Configurar MariaDB para conexiones remotas:
```bash
sudo mysql_secure_installation
```

#### Crear usuario y base de datos:
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE foodshare;
CREATE USER 'foodshare_user'@'%' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON foodshare.* TO 'foodshare_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

#### Ejecutar el esquema de base de datos:
```bash
mysql -u foodshare_user -p foodshare < ../database_schema.sql
```

#### Configurar bind-address para conexiones remotas:
Edita `/etc/mysql/mariadb.conf.d/50-server.cnf`:
```ini
bind-address = 0.0.0.0
```

Reinicia MariaDB:
```bash
sudo systemctl restart mariadb
```

### 3. Configurar variables de entorno

Edita `.env` con la IP de tu Kali Linux y credenciales:
```
DB_HOST=192.168.1.100  # IP de Kali
DB_USER=foodshare_user
DB_PASSWORD=tu_password
DB_NAME=foodshare
JWT_SECRET=tu_jwt_secret_seguro
```

### 4. Ejecutar el servidor
```bash
npm run dev  # Para desarrollo con nodemon
# o
npm start    # Para producción
```

El servidor correrá en `http://localhost:3001`

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere token)

### Usuarios
- `GET /api/users` - Lista de usuarios
- `PUT /api/users/profile` - Actualizar perfil

### Donaciones
- `POST /api/donations` - Crear donación
- `GET /api/donations` - Obtener donaciones
- `POST /api/donations/:id/claim` - Reclamar donación (NGO)
- `POST /api/donations/:id/transport` - Aceptar transporte (Volunteer)
- `POST /api/donations/:id/deliver` - Marcar como entregada

### Mensajes
- `POST /api/messages` - Enviar mensaje
- `GET /api/messages/conversation/:userId` - Conversación con usuario
- `GET /api/messages/conversations` - Lista de conversaciones

## Seguridad
- Todas las rutas protegidas requieren JWT token en header: `Authorization: Bearer <token>`
- Contraseñas hasheadas con bcrypt
- CORS habilitado para desarrollo

## Características Implementadas
- ✅ Subida de imágenes
- ✅ Validación robusta de entrada
- ✅ WebSocket para mensajes en tiempo real
- ✅ Sistema de notificaciones en tiempo real
- ✅ Mapa interactivo con Leaflet
- ✅ Panel admin con agrupación por usuario
- ✅ Sistema de seguridad completo (Helmet, Rate Limiting, CORS)
- ✅ Variables de entorno configuradas

## Próximos pasos (Opcional)
- Agregar tests unitarios
- Implementar caché con Redis
- Configurar balanceo de carga
- Agregar autenticación de dos factores