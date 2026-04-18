# 🍞 FoodShare — Documentación Técnica Completa

> Plataforma web para conectar donantes de alimentos con ONGs y voluntarios en Popayán, Colombia.

---

## 📋 Descripción general

FoodShare permite a **donantes** publicar excedentes de alimentos, a **ONGs** solicitarlos desde un mapa interactivo y a **voluntarios** encargarse del transporte. Incluye chat de coordinación, canal de voz estilo Discord por donación y un panel de administración completo con roles granulares y monitoreo de canales de voz.

---

## 🚀 Cómo ejecutar el proyecto

### Requisitos previos
- Node.js 18+
- MariaDB / MySQL 8+

### 1. Backend

```bash
cd backend
npm install
# Crea backend/.env con las variables de abajo
node server.js
```

Servidor disponible en `http://localhost:3001`

### 2. Frontend

```bash
# Desde la raíz del proyecto
npm install
npm run dev
```

Aplicación disponible en `http://localhost:5173`

---

## ⚙️ Variables de entorno

### `backend/.env`

```env
# Base de datos
DB_HOST=localhost
DB_USER=foodshare_user
DB_PASSWORD=tu_password_seguro
DB_NAME=foodshare
DB_PORT=3306

# JWT
JWT_SECRET=un_secreto_muy_largo_y_aleatorio

# Super administrador (se crea automáticamente al iniciar)
SUPER_ADMIN_EMAIL=admin@foodshare.com
SUPER_ADMIN_PASSWORD=password_seguro
SUPER_ADMIN_NAME=Administrador Principal

# Opciones adicionales
SUPER_ADMIN_RESET_PASSWORD=0   # Pon 1 para resetear la contraseña al iniciar
ALLOWED_ORIGINS=http://localhost:5173
PORT=3001

# Rate limiting (opcional, valores por defecto indicados)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### `frontend` (raíz del proyecto, archivo `.env`)

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 🗄️ Base de datos

### Configurar MariaDB

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE foodshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'foodshare_user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON foodshare.* TO 'foodshare_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

El esquema se **crea y migra automáticamente** al iniciar el servidor por primera vez. No es necesario ejecutar ningún script SQL manualmente.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `users` | Todos los usuarios (donor, ngo, volunteer, admin, super_admin) |
| `donations` | Donaciones con estado, coordenadas e imagen |
| `messages` | Mensajes de chat vinculados a una donación |
| `certificates` | Certificados emitidos al completar entregas |

---

## ✅ Funcionalidades implementadas

### 🔐 Autenticación y roles

- Registro con roles: **Donador**, **ONG**, **Voluntario**
- Login con JWT (expira en 24 h)
- Rutas protegidas por rol en frontend y backend
- **Super administrador** creado automáticamente desde variables de entorno
- **Administradores delegados** con permisos granulares configurables

---

### 🏠 Panel del Donador

- Crear donaciones con título, descripción, cantidad, fecha de vencimiento e imagen
- Subida de imagen desde archivo (JPEG/PNG/GIF/WebP hasta 10 MB) o URL externa
- Mapa interactivo para seleccionar la ubicación exacta:
  - Clic en el mapa → coordenadas como fallback si no se escribe dirección
  - Búsqueda por dirección con geocodificación
- Editar donaciones mientras estén en estado `available`
- Cancelar donaciones activas con confirmación inline
- Contactar a la ONG que solicitó la donación vía chat
- Historial completo de donaciones

---

### 🏢 Panel de la ONG

- Vista de lista y vista de mapa de donaciones disponibles
- **Mapa mejorado**:
  - Clic en marcador verde → popup con imagen, descripción completa, cantidad, ubicación y fecha de vencimiento
  - Botón **"Ver en lista y solicitar →"** que cambia a la vista de lista y resalta la tarjeta
- **Confirmación inline en lista**: panel debajo de la tarjeta seleccionada con resumen completo antes de confirmar; sin `window.confirm()`
- Gestión de solicitudes: marcar como recolectada, marcar como entregada
- Solicitar cancelación de trato
- Aceptar o rechazar solicitudes de cancelación del donador
- Contactar al donador vía chat

---

### 🚚 Panel del Voluntario

- Ver donaciones reservadas por ONGs que necesitan transporte
- Aceptar asignaciones con feedback inline (sin `alert()`)
- Dashboard con envíos en curso e histórico

---

### 💬 Chat de coordinación

- Chat por donación (cada conversación está vinculada a un `donationId` específico)
- Mensajes en tiempo real — auto-scroll al último mensaje
- Burbujas alineadas: mensajes propios a la derecha (verde), ajenos a la izquierda (gris)
- Hora visible en cada mensaje
- Acciones integradas en el chat: solicitar cancelación, aceptar/rechazar cancelación
- Chat bloqueado automáticamente cuando la donación ya fue entregada
- **Canal de voz** integrado en el chat (ver sección abajo)

---

### 🎙️ Canal de voz (estilo Discord)

Cada chat de donación tiene un **canal de voz persistente** al que cualquier participante puede entrar y salir libremente.

**Características:**
- Lista visible de quién está en el canal, incluso antes de entrar
- Botón **"Unirse al canal"** → solicita permiso de micrófono y entra
- Chips con puntos verdes mostrando a cada participante activo
- Botón silenciar/activar micrófono (icono `🔇` en el chip propio cuando está silenciado)
- Botón **"Salir del canal"** para desconectarse
- Auto-salida al cerrar el chat o navegar fuera
- Soporte para hasta 3 participantes simultáneos (donador + ONG + voluntario) en topología mesh P2P

**Tecnología:** WebRTC nativo (sin librerías externas). Socket.IO actúa como canal de señalización (SDP offer/answer + ICE candidates). El audio fluye directo entre navegadores sin pasar por el servidor.

**STUN servers configurados:** Google (x2) + Cloudflare.

> ⚠️ En producción se requiere HTTPS para que `getUserMedia()` funcione. Para redes con NAT simétrico estricto, se recomienda un servidor TURN (coturn, Twilio o Metered.ca).

---

### 📜 Certificados

- Generación automática al marcar una donación como entregada (donador, ONG y voluntario)
- Descarga en PDF
- Emisión manual desde el panel admin
- Expiración automática (30 días por defecto, configurable)
- Limpieza automática al iniciar el servidor y diaria (tarea programada)

---

### 🛡️ Panel de Administración

Accesible en `/admin`. Solo para roles `admin` y `super_admin`.

| Sección | Ruta | Permisos |
|---|---|---|
| **Usuarios** | `/admin/users` | `view_users`, `delete_users` |
| **Mensajes** | `/admin/messages` | `view_messages`, `delete_messages` |
| **Donaciones** | `/admin/donations` | `view_donations`, `delete_donations` |
| **Certificados** | `/admin/certificates` | `view_certificates`, `delete_certificates`, `issue_certificates` |
| **Equipo admin** | `/admin/staff` | solo `super_admin` |
| **Mantenimiento** | `/admin/maintenance` | solo `super_admin` |
| **Canales de voz** | `/admin/voice` | solo `super_admin` |

**Permisos granulares para admins delegados:**
`view_users` · `delete_users` · `view_messages` · `delete_messages` · `view_donations` · `delete_donations` · `view_certificates` · `delete_certificates` · `issue_certificates`

**Mantenimiento masivo** (con checkbox de confirmación obligatorio):
- Eliminar certificados vencidos
- Borrar mensajes más antiguos que N días
- Borrar certificados más antiguos que N días
- Borrar donaciones archivadas (`delivered` / `cancelled` / `expired`) más antiguas que N días

---

### 🎧 Canales de voz — Monitoreo admin

El super administrador puede acceder a `/admin/voice` para ver todos los canales de voz activos en tiempo real.

**Funcionalidades:**
- Lista de canales activos con nombres de participantes, actualización automática cada 5 s
- Botón **"Monitorear"** por canal
- Al monitorear: el admin escucha el audio de todos los participantes
- **Completamente invisible:** no aparece en la lista de participantes de los usuarios
- **Completamente inaudible:** las conexiones WebRTC del admin son receive-only (sin pistas de audio enviadas)
- Indicador visual de qué participantes están conectados con audio activo (punto verde + icono de volumen)
- Botón **"Dejar de monitorear"** / **"Salir"**
- Auto-salida al cerrar el panel

**Cómo funciona la invisibilidad técnicamente:**
- El admin nunca se añade a `voiceChannels` en el servidor → nunca aparece en `voice:channel_update`
- El servidor envía `voice:shadow_peer` (en lugar de `voice:peer_joined`) a los participantes
- Los participantes crean la conexión WebRTC normalmente pero **no actualizan su lista visual**
- El admin responde las ofertas **sin agregar pistas de audio** → receive-only puro

---

## 🛠️ Stack tecnológico

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5.5 | Tipado estático |
| Vite | 5.4 | Build tool |
| TailwindCSS | 4 | Estilos |
| React Router | 6.15 | Navegación (future flags v7 activados) |
| React Hook Form | 7.72 | Formularios |
| Leaflet + react-leaflet | 1.9 / 4.2 | Mapas interactivos |
| Lucide React | 0.534 | Iconos |
| date-fns | 4.1 | Formato de fechas |
| socket.io-client | 4.8 | WebSocket — señalización WebRTC y Socket.IO |
| WebRTC (nativo) | — | Canal de voz P2P (sin librerías extra) |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4 | HTTP server |
| mysql2 | 3 | Pool de conexiones a MariaDB |
| socket.io | 4 | WebSocket + señalización WebRTC + monitoreo voz |
| jsonwebtoken | 9 | Auth JWT |
| bcrypt | 5 | Hash de contraseñas |
| multer | 1.4 | Subida de archivos |
| helmet | 7 | Headers de seguridad |
| express-rate-limit | 7 | Rate limiting |
| uuid | 9 | IDs únicos (UUIDs v4) |

---

## 📁 Estructura del proyecto

```
Proyecto/
├── backend/
│   ├── server.js                    # Entry point — pool MySQL, migraciones, Socket.IO,
│   │                                #   voiceChannels Map, voiceMonitors Map
│   ├── routes/
│   │   ├── admin.js                 # Panel admin completo (CRUD + mantenimiento masivo)
│   │   ├── auth.js                  # Registro, login, perfil
│   │   ├── donations.js             # CRUD donaciones + flujo de estados
│   │   ├── messages.js              # Chat por donación
│   │   ├── certificates.js          # Certificados + generación PDF
│   │   ├── images.js                # Servicio de imágenes con CORS
│   │   └── users.js                 # Perfil de usuario
│   ├── middleware/
│   │   ├── auth.js                  # Verificación JWT
│   │   └── adminAuth.js             # requireAdmin / requireSuperAdmin / requirePerm
│   ├── lib/
│   │   ├── adminPermissions.js      # hasPermission, sanitizePermissions
│   │   ├── certificates.js          # insertCertificate
│   │   └── certificatePdf.js        # Generación PDF
│   ├── uploads/donations/           # Imágenes subidas (gitignored)
│   ├── database_schema.sql          # Schema de referencia (migraciones son automáticas)
│   └── package.json
│
├── src/
│   ├── app/
│   │   ├── App.tsx                  # RouterProvider con future flags v7
│   │   └── routes.tsx               # createBrowserRouter con future flags v7
│   │
│   ├── components/
│   │   ├── DonationCardFinal.tsx    # Tarjeta de donación (usa getServerOrigin(), sin localhost hardcoded)
│   │   ├── InteractiveMap.tsx       # Mapa Leaflet — popup rico con imagen y descripción
│   │   ├── LocationPickerFixed.tsx  # Selector de ubicación — clic en mapa → coords como fallback
│   │   ├── VoiceCall.tsx            # Canal de voz WebRTC — join/leave, mesh P2P,
│   │   │                            #   shadow_peer para monitoreo invisible del admin
│   │   ├── Layout.tsx               # Layout + ProtectedRoute
│   │   ├── Navbar.tsx               # Barra de navegación
│   │   └── ui/                      # Button, etc.
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx         # Panel principal con cards por sección
│   │   │   ├── AdminUsers.tsx             # Inline error state, sin alert()
│   │   │   ├── AdminMessages.tsx          # Agrupadas por conversación, inline errors
│   │   │   ├── AdminDonations.tsx         # Estados con colores, inline errors
│   │   │   ├── AdminCertificates.tsx      # Con PDF download y emision manual
│   │   │   ├── AdminStaff.tsx             # Permisos con checkboxes, inline feedback
│   │   │   ├── AdminMaintenance.tsx       # Confirmación obligatoria + resultado detallado
│   │   │   └── AdminVoiceChannels.tsx     # Canales de voz activos + monitoreo invisible
│   │   │
│   │   ├── DonorDashboard.tsx       # navigate() en lugar de window.location.assign
│   │   ├── DonorCreateDonation.tsx  # Validación de mapa corregida (coords como fallback)
│   │   ├── DonorEditDonation.tsx    # Misma corrección de validación
│   │   ├── DonorHistory.tsx
│   │   ├── NgoDashboard.tsx
│   │   ├── NgoMap.tsx               # Flujo mapa → lista → confirmación inline (sin window.confirm)
│   │   ├── NgoRequests.tsx          # navigate(), inline errors, sin alert/confirm
│   │   ├── ChatPage.tsx             # Auto-scroll, burbujas alineadas, inline errors,
│   │   │                            #   canal de voz integrado (VoiceCall)
│   │   ├── VolunteerDashboard.tsx
│   │   ├── VolunteerAvailable.tsx   # Inline errors, sin alert()
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── CertificatesPage.tsx
│   │
│   ├── context/
│   │   └── StoreContext.tsx         # Estado global — polling único cada 3 s
│   │
│   ├── services/
│   │   ├── apiClient.ts             # getApiBase, getServerOrigin, getAuthHeaders, handleResponse
│   │   ├── socketClient.ts          # Singleton Socket.IO — compartido por VoiceCall y AdminVoiceChannels
│   │   ├── adminService.ts          # Todas las llamadas al panel admin
│   │   ├── authService.ts
│   │   ├── donationService.ts
│   │   ├── messageService.ts
│   │   └── certificateService.ts
│   │
│   ├── utils/
│   │   └── adminAccess.ts           # adminCan(), isAdminRole()
│   │
│   └── types.ts                     # User, Donation, Message, etc.
│
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 🔌 API Reference

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/profile` | Perfil del usuario autenticado |

### Donaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/donations` | Listar donaciones |
| POST | `/api/donations` | Crear donación |
| PUT | `/api/donations/:id` | Editar donación |
| DELETE | `/api/donations/:id` | Eliminar donación (donador) |
| POST | `/api/donations/:id/claim` | Solicitar (ONG) |
| POST | `/api/donations/:id/cancel-claim` | Cancelar solicitud |
| POST | `/api/donations/:id/collect` | Marcar recolectada |
| POST | `/api/donations/:id/transport` | Aceptar transporte (voluntario) |
| POST | `/api/donations/:id/deliver` | Marcar entregada |
| POST | `/api/donations/:id/request-cancel` | Solicitar cancelación del trato |
| POST | `/api/donations/:id/approve-cancel` | Aprobar cancelación |
| POST | `/api/donations/:id/reject-cancel` | Rechazar cancelación |

### Mensajes

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/messages` | Enviar mensaje |
| GET | `/api/messages/conversation/:userId` | Conversación con usuario (requiere `?donationId=`) |

### Admin (requieren rol admin o super_admin + permiso)

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/admin/users` | `view_users` |
| DELETE | `/api/admin/users/:id` | `delete_users` |
| GET | `/api/admin/messages` | `view_messages` |
| DELETE | `/api/admin/messages/:id` | `delete_messages` |
| GET | `/api/admin/donations` | `view_donations` |
| DELETE | `/api/admin/donations/:id` | `delete_donations` |
| GET | `/api/admin/certificates` | `view_certificates` |
| POST | `/api/admin/certificates` | `issue_certificates` |
| DELETE | `/api/admin/certificates/:id` | `delete_certificates` |
| GET | `/api/admin/staff` | `super_admin` |
| POST | `/api/admin/staff` | `super_admin` |
| PATCH | `/api/admin/staff/:id/permissions` | `super_admin` |
| DELETE | `/api/admin/staff/:id` | `super_admin` |
| POST | `/api/admin/maintenance/prune` | `super_admin` |

### Socket.IO — Eventos de voz (canal + señalización WebRTC)

| Evento (cliente → servidor) | Descripción |
|---|---|
| `authenticate` | Autentica el socket con un userId |
| `voice:join` | Entrar al canal de voz de una donación |
| `voice:leave` | Salir del canal |
| `voice:peek` | Consultar participantes sin unirse (para mostrar en UI antes de entrar) |
| `voice:offer` | Enviar oferta SDP a otro peer |
| `voice:answer` | Responder oferta SDP |
| `voice:ice` | Enviar candidato ICE |
| `voice:list_channels` | (Admin) Listar todos los canales activos |
| `voice:admin_monitor` | (Admin) Iniciar monitoreo invisible de un canal |
| `voice:monitor_leave` | (Admin) Dejar de monitorear |

| Evento (servidor → cliente) | Descripción |
|---|---|
| `voice:channel_update` | Lista actualizada de participantes del canal |
| `voice:channel_state` | Respuesta a `voice:peek` (estado sin unirse) |
| `voice:peer_joined` | Nuevo participante en el canal (iniciar WebRTC) |
| `voice:peer_left` | Participante salió del canal |
| `voice:shadow_peer` | (Solo para admin monitor) Nuevo peer invisible a conectar |
| `voice:monitor_ready` | (Admin) Confirmación de monitoreo + lista inicial |
| `voice:offer` | Oferta SDP entrante de otro peer |
| `voice:answer` | Respuesta SDP de otro peer |
| `voice:ice` | Candidato ICE de otro peer |

---

## 🐛 Bugs corregidos (historial técnico)

| Bug | Causa raíz | Solución |
|---|---|---|
| Elementos no se eliminaban en admin | `mysql.createConnection()` bajo carga concurrente | Migrado a `mysql.createPool()` con 10 conexiones |
| `ER_BAD_FIELD_ERROR` en mantenimiento | Columna `updated_at` no existía en BD antigua | Query usa `created_at`; migración automática añade `updated_at` |
| `Map is not a constructor` en NgoMap | `import { Map }` de lucide sobreescribía el `Map` nativo de JS | Renombrado a `Map as MapIcon` |
| Imágenes bloqueadas `NotSameOrigin` | Helmet añade `Cross-Origin-Resource-Policy: same-origin` | Header `cross-origin` explícito en ruta `/uploads` |
| `<form>` anidado en `LocationPickerFixed` | Componente tenía su propio `<form>` interno | Reemplazado por `<div>` con `onClick` |
| Validación de ubicación falla al hacer clic en mapa | `required` se evalúa antes de `validate`, rechaza string vacío | Eliminado `required`; solo `validate` que comprueba coords O texto; coords como fallback en `onLocationChange` |
| URL hardcodeada `http://localhost:3001` | `DonationCardFinal` construía URLs absolutas | Usa `getServerOrigin()` de `apiClient.ts` |
| `window.location.assign()` recargaba la app | Uso incorrecto para navegación interna | Reemplazado por `useNavigate()` de React Router en todos los archivos |
| React Router warning `v7_startTransition` | Flags de compatibilidad ausentes | Añadidos en `routes.tsx` y `App.tsx` |
| Chat sin scroll automático | Sin `useRef` + `scrollIntoView` | Implementado con `messagesEndRef` en `ChatPage` |
| `alert()` y `confirm()` en toda la app | APIs del navegador bloqueables por popup blockers | Reemplazados por banners inline con estado React en todos los archivos |
| Polling duplicado de donaciones | Dos `useEffect` idénticos en `StoreContext` | Eliminado el duplicado |
| Doble query DB por permisos admin | `requirePerm` ignoraba `req.adminUser` ya cargado | Reutiliza `req.adminUser` del middleware anterior |
| Debug info expuesto en producción | Bloque `<div>Debug Info>` en `DonorCreateDonation` | Eliminado |
| Canal de voz sin mostrar participantes antes de entrar | Solo recibía `voice:channel_update` al estar dentro del canal | Evento `voice:peek` + respuesta `voice:channel_state` al montar el componente |

---

## 🔒 Seguridad

- Contraseñas hasheadas con `bcrypt` (10 rondas de sal)
- Auth con JWT firmado y con expiración de 24 h
- Headers de seguridad con `helmet` en todas las respuestas
- Rate limiting: 100 req / 15 min por IP (se salta para `127.0.0.1`)
- CORS: orígenes configurables por variable de entorno (`ALLOWED_ORIGINS`)
- Validación de entrada en cada endpoint del backend
- Super admin no se puede eliminar si es el único existente
- El admin monitor de voz no añade audio tracks → receive-only garantizado por diseño
- Los canales de voz del admin usan `voice:shadow_peer` en vez de `voice:peer_joined` → nunca aparecen en la lista visual de participantes

---

## ⚡ Pendientes / Mejoras futuras

### Alta prioridad

- [ ] **Chat en tiempo real** — Socket.IO ya está configurado en el backend; falta usarlo en `ChatPage` para escuchar mensajes entrantes sin recargar la página
- [ ] **HTTPS en producción** — Requerido para `getUserMedia()` (voz/cámara); usar Let's Encrypt (gratuito)
- [ ] **Servidor TURN** — Para usuarios detrás de NAT simétrico estricto (coturn self-hosted, Twilio free tier, o Metered.ca)

### Media prioridad

- [ ] **Paginación en tablas admin** — El endpoint `/api/admin/messages` tiene `LIMIT 500` fijo
- [ ] **Toast notifications** — Instalar `react-hot-toast` o `sonner` para reemplazar banners inline
- [ ] **Confirmación modal React** — Reemplazar los `window.confirm()` restantes con un modal propio
- [ ] **JWT refresh token** — Evitar que el usuario se desloguee al expirar el token (24 h)
- [ ] **Índices de BD** — `idx_messages_donation_id`, `idx_donations_status_created_at`
- [ ] **Audit log admin** — Tabla `admin_actions(who, action, target_id, created_at)` para saber quién borró qué

### Baja prioridad

- [ ] **Admin puede hablar en canal de voz** — Requiere renegociación WebRTC o reiniciar las conexiones con audio track habilitado
- [ ] **Exportar a CSV** desde tablas admin (usuarios, donaciones)
- [ ] **Dashboard con métricas** — Tarjetas con totales en tiempo real (donaciones por estado, usuarios activos, mensajes)
- [ ] **Tests** — Vitest para frontend, Jest + Supertest para backend

---

## 🔒 Notas de producción

### HTTPS (obligatorio para voz)

Los navegadores modernos **bloquean** `getUserMedia()` (acceso al micrófono) en HTTP. Para activar los canales de voz en producción:

```bash
# Ejemplo con Let's Encrypt + Nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

### Servidor TURN (recomendado)

Los servidores STUN de Google y Cloudflare cubren ~85 % de las redes domésticas. Para redes corporativas o universitarias con NAT estricto, agrega un servidor TURN:

```env
# En backend/.env (o configura en frontend ICE_CONFIG)
TURN_URL=turn:tuservidor.com:3478
TURN_USERNAME=usuario
TURN_CREDENTIAL=contraseña
```

Opciones gratuitas: [Metered.ca](https://www.metered.ca/) (50 GB/mes), Twilio (10.000 min/mes), o auto-hospedado con [coturn](https://github.com/coturn/coturn).

---

## 📜 Licencia

Proyecto académico — FoodShare © 2025