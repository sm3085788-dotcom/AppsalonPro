# AppSalon Pro - Ecosistema Completo

Monorepo con tres aplicaciones integradas para gestión completa de salón de belleza, conectadas a Supabase.

## 📁 Estructura del Proyecto

```
AppsalonPro/
├── apps/
│   ├── salon/          # App móvil para gestión del salón (Expo)
│   ├── clientes/       # App móvil para clientes (Expo)
│   └── web-catalogo/   # Catálogo web público (Next.js)
├── shared/
│   └── config/         # Configuración compartida (Supabase)
└── package.json        # Configuración del monorepo
```

## 🚀 Apps del Ecosistema

### 1. **AppSalon Pro - Gestión** (`/apps/salon`)
App móvil (Android/iOS) para el personal del salón.

**Características:**
- Gestión de citas y calendario
- Administración de clientes
- Control de inventario
- Configuración del sistema

**Stack:**
- Expo (React Native)
- NativeWind (Tailwind CSS)
- Supabase para backend
- Lucide React Native para iconos

### 2. **AppSalon Pro - Clientes** (`/apps/clientes`)
App móvil (Android/iOS) para los clientes del salón.

**Características:**
- Reserva de citas online
- Visualización de servicios
- Historial de visitas
- Perfil de usuario

**Stack:**
- Expo (React Native)
- NativeWind (Tailwind CSS)
- Supabase para backend
- Lucide React Native para iconos

### 3. **AppSalon Pro - Web Catálogo** (`/apps/web-catalogo`)
Sitio web público para mostrar servicios y permitir reservas.

**Características:**
- Landing page elegante
- Catálogo de servicios
- Sistema de reservas online
- Galería de trabajos

**Stack:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase para backend
- Lucide React para iconos

## 🎨 Diseño "Luxury Experience"

### Paleta de Colores
- **Cream**: `#FDFBF7` - Fondo principal
- **Gold**: `#D4AF37` - Acentos de lujo
- **Charcoal**: `#2C2C2C` - Texto principal
- **Silver**: `#C0C0C0` - Texto secundario

### Tipografía
- **Fuente**: Montserrat (Thin, Light, Regular, Medium)
- **Estilo**: Minimalista y elegante
- **Espaciado**: Amplio tracking para look premium

## 🔧 Instalación y Configuración

### 1. Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm run install:all
```

O instalar cada app individualmente:

```bash
npm run install:salon
npm run install:clientes
npm run install:web
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` y crea los archivos `.env` en cada app:

**Para apps móviles** (`apps/salon/.env` y `apps/clientes/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

**Para web app** (`apps/web-catalogo/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 3. Ejecutar las Apps

**App Salón (Gestión):**
```bash
npm run salon:start
npm run salon:android  # Para Android
npm run salon:ios      # Para iOS (solo macOS)
```

**App Clientes:**
```bash
npm run clientes:start
npm run clientes:android  # Para Android
npm run clientes:ios      # Para iOS (solo macOS)
```

**Web Catálogo:**
```bash
npm run web:dev         # Desarrollo
npm run web:build       # Producción
```

## 📱 Build de Producción (APK/IPA)

### Configurar EAS Build

1. Instala EAS CLI globalmente:
```bash
npm install -g eas-cli
```

2. Inicia sesión en Expo:
```bash
eas login
```

3. Configura cada proyecto:
```bash
# Para app Salón
cd apps/salon
eas build:configure

# Para app Clientes
cd apps/clientes
eas build:configure
```

### Generar APK para Android

```bash
# App Salón
cd apps/salon
eas build --platform android --profile preview

# App Clientes
cd apps/clientes
eas build --platform android --profile preview
```

### Generar IPA para iOS

```bash
# App Salón
cd apps/salon
eas build --platform ios --profile preview

# App Clientes
cd apps/clientes
eas build --platform ios --profile preview
```

## 🗄️ Conexión con Supabase

### IMPORTANTE
- **NO se crearán tablas nuevas** - La configuración asume que tu base de datos ya está lista
- El archivo `shared/config/supabaseClient.js` contiene el cliente compartido
- Una vez configuradas las credenciales, el sistema se conectará automáticamente

### Próximos Pasos (Una vez proporciones las credenciales):
1. Análisis del esquema de tu base de datos
2. Mapeo de funciones CRUD a tus tablas existentes
3. Integración de RLS y políticas de seguridad
4. Conexión de botones UI a procedimientos de base de datos

### Obtener Credenciales de Supabase

1. Ve a tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Navega a **Settings** → **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

## 🔒 Seguridad

### Archivos Excluidos de Git
- `.env` (apps móviles)
- `.env.local` (web app)
- `node_modules/`
- Build artifacts

### Buenas Prácticas
- Nunca commitear archivos `.env`
- Usar Row Level Security (RLS) en Supabase
- Validar permisos en cada operación
- Usar `anon` key para apps cliente, `service_role` solo en backend seguro

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run salon:start          # Inicia app Salón
npm run clientes:start       # Inicia app Clientes
npm run web:dev              # Inicia web en desarrollo

# Instalación
npm run install:all          # Instala todas las dependencias
npm run install:salon        # Solo app Salón
npm run install:clientes     # Solo app Clientes
npm run install:web          # Solo web

# Build Android/iOS (dentro de cada app)
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

## 🛠️ Tecnologías Utilizadas

### Móvil (Expo)
- **React Native** - Framework móvil
- **Expo SDK 52** - Toolchain y servicios
- **NativeWind** - Tailwind CSS para React Native
- **Lucide React Native** - Iconos elegantes
- **Supabase JS** - Cliente de base de datos
- **AsyncStorage** - Persistencia local

### Web (Next.js)
- **Next.js 16** - Framework React con SSR/SSG
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **Lucide React** - Iconos
- **Supabase JS** - Cliente de base de datos

## 📱 Compatibilidad

### Apps Móviles
- **Android**: API 21+ (Android 5.0+)
- **iOS**: iOS 13.4+

### Web
- Todos los navegadores modernos
- Responsive design (móvil, tablet, desktop)

## 🎯 Estado del Proyecto

✅ Estructura de monorepo creada
✅ Configuración de Expo para ambas apps móviles
✅ Configuración de Next.js para web
✅ NativeWind integrado
✅ Cliente Supabase compartido
✅ Diseño UI "Luxury Experience" implementado
✅ EAS Build configurado
⏳ Pendiente: Conectar con credenciales de Supabase
⏳ Pendiente: Mapear esquema de base de datos
⏳ Pendiente: Implementar lógica de negocio

## 📝 Próximos Pasos

1. **Proporciona tus credenciales de Supabase** para conectar las apps
2. **Análisis del esquema** de tu base de datos existente
3. **Mapeo de funciones** CRUD a tus tablas
4. **Implementación de navegación** entre pantallas
5. **Testing** de funcionalidades core
6. **Build final** de APKs/IPAs

## 🤝 Contribución

Este es un proyecto privado. Para cambios o mejoras, contacta al equipo de desarrollo.

## 📄 Licencia

Propietario - AppSalon Pro © 2026

---

**¿Listo para conectar?** Proporciona tus credenciales de Supabase para continuar con la integración. 🚀
