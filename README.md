# 🎡 Ruleta Tikfinity

Sistema completo de ruleta personalizable con integración Tikfinity/IFTTT usando Winwheel.js 2.8

## 🚀 Características

✅ Ruleta interactiva con Winwheel.js 2.8  
✅ Backend Node.js/Express con Socket.io  
✅ Frontend Next.js con diseño moderno  
✅ Panel de administración para editar segmentos  
✅ Integración con webhooks de Tikfinity/IFTTT  
✅ Giros en tiempo real  
✅ Historial de ganadores  
✅ Completamente personalizable  

## 📋 Requisitos Previos

- Node.js 18+ instalado
- npm o yarn

## 🔧 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Descargar librerías de Winwheel**

Descarga estos archivos y colócalos en `public/js/`:

- **Winwheel.min.js**: https://github.com/zarocknz/javascript-winwheel/blob/master/Winwheel.min.js
- **TweenMax.min.js**: https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js

4. **Configurar variables de entorno**

Copia `.env.example` a `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

Edita `.env` con tus valores:
\`\`\`env
PORT=3001
TIKFINITY_SECRET=tu_token_secreto_aqui
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
\`\`\`

## 🎮 Uso

### Modo Desarrollo

Ejecuta ambos servidores (backend + frontend) simultáneamente:

\`\`\`bash
npm run dev
\`\`\`

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Probar Localmente

**Opción 1: Botones de prueba en la interfaz**
- Abre http://localhost:3000
- Usa los botones "Giro Aleatorio" o los botones de premios específicos

**Opción 2: Script de prueba**
\`\`\`bash
# Giro aleatorio
npm run test:webhook

# Giro con SKU específico
node test/send-webhook.js SKU_A
\`\`\`

**Opción 3: cURL**
\`\`\`bash
curl -X POST http://localhost:3001/webhook/tikfinity \
  -H "Content-Type: application/json" \
  -H "x-tikfinity-token: tu_token_secreto_aqui" \
  -d '{
    "value1": "Usuario123",
    "value2": "Regalo enviado",
    "value3": "SKU_A"
  }'
\`\`\`

## 🔗 Configuración de Tikfinity/IFTTT

### 1. Crear cuenta en IFTTT
Ve a https://ifttt.com y crea una cuenta

### 2. Crear Applet
1. Crea un nuevo Applet
2. **"If This"**: Selecciona "Webhooks" como trigger
3. Configura el evento (ej: "tikfinity_gift")
4. **"Then That"**: Selecciona "Webhooks" como acción
5. Configura la URL de tu servidor

### 3. Configurar Webhook URL

**Para desarrollo local (usando ngrok o similar):**
\`\`\`
https://tu-dominio.ngrok.io/webhook/tikfinity
\`\`\`

**Para producción:**
\`\`\`
https://tu-dominio.com/webhook/tikfinity
\`\`\`

### 4. Parámetros que envía Tikfinity

- `value1`: Nombre de usuario del espectador
- `value2`: Texto del comando (si aplica)
- `value3`: SKU del regalo (determina qué premio gana)

## 🎨 Personalización

### Editar Segmentos

**Opción 1: Panel de Administración**
1. Abre http://localhost:3000
2. Haz clic en el botón "Admin" (arriba a la derecha)
3. Edita los segmentos (ID, texto, color)
4. Haz clic en "Guardar Cambios"

**Opción 2: Editar archivo JSON**
Edita `server/data/segments.json`:
\`\`\`json
[
  {
    "id": "SKU_CUSTOM",
    "text": "Mi Premio",
    "color": "#ff6b6b"
  }
]
\`\`\`

### Personalizar Diseño

Edita `app/page.tsx` para cambiar:
- Colores del gradiente de fondo
- Tamaño de la ruleta
- Animaciones
- Estilos de los componentes

## 📡 API Endpoints

### GET `/api/segments`
Obtiene la lista de segmentos actuales

### POST `/api/segments`
Actualiza los segmentos (requiere body con array de segments)

### POST `/webhook/tikfinity`
Endpoint para recibir webhooks de Tikfinity/IFTTT

Headers:
- `x-tikfinity-token`: Token de seguridad (opcional)

Body:
\`\`\`json
{
  "value1": "username",
  "value2": "message",
  "value3": "SKU_ID"
}
\`\`\`

### POST `/api/test-spin`
Endpoint de prueba para simular giros localmente

Body:
\`\`\`json
{
  "sku": "SKU_A"  // opcional
}
\`\`\`

## 🔒 Seguridad

- Configura `TIKFINITY_SECRET` en `.env` para validar webhooks
- En producción, usa HTTPS
- Considera agregar autenticación para el panel de admin

## 🐛 Troubleshooting

**La ruleta no aparece:**
- Verifica que descargaste Winwheel.min.js y TweenMax.min.js en `public/js/`
- Revisa la consola del navegador para errores

**No se reciben webhooks:**
- Verifica que el servidor backend esté corriendo en el puerto correcto
- Revisa los logs del servidor: `npm run dev:server`
- Verifica que la URL del webhook sea accesible desde internet (usa ngrok para desarrollo local)

**Los giros no funcionan:**
- Verifica la conexión Socket.io en la interfaz (debe mostrar "🟢 Conectado")
- Revisa la consola del navegador y los logs del servidor

## 📦 Estructura del Proyecto

\`\`\`
tikfinity-wheel/
├── app/
│   └── page.tsx          # Frontend principal
├── server/
│   ├── index.js          # Backend Express + Socket.io
│   └── data/
│       └── segments.json # Configuración de segmentos
├── public/
│   └── js/
│       ├── Winwheel.min.js  # Librería Winwheel (descargar)
│       └── TweenMax.min.js  # Librería GSAP (descargar)
├── test/
│   └── send-webhook.js   # Script de prueba
├── .env.example          # Ejemplo de variables de entorno
├── package.json
└── README.md
\`\`\`

## 🎯 Próximos Pasos

- [ ] Agregar autenticación para el panel de admin
- [ ] Implementar base de datos para historial persistente
- [ ] Agregar sonidos y efectos visuales
- [ ] Crear dashboard de estadísticas
- [ ] Soporte para múltiples ruletas

## 📄 Licencia

MIT

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Abre un issue o pull request.
