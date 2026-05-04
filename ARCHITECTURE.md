# 🏗️ Arquitectura del Sistema - AppSalon Pro

## Visión General

AppSalon Pro es un ecosistema completo de aplicaciones para la gestión de salones de belleza, construido como un monorepo con tres aplicaciones independientes pero interconectadas.

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │   Auth   │ │ Storage  │ │   RLS    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
           ┌──────────────┼──────────────┐
           │              │              │
    ┌──────▼─────┐ ┌─────▼──────┐ ┌────▼──────┐
    │App Salón   │ │App Clientes│ │Web Catálogo│
    │(Gestión)   │ │(Reservas)  │ │(Landing)  │
    │   Expo     │ │   Expo     │ │  Next.js  │
    └────────────┘ └────────────┘ └───────────┘
```

## Componentes Principales

### 1. **Capa de Datos (Supabase)**

#### Base de Datos PostgreSQL
- Almacena toda la información: clientes, citas, servicios, inventario
- Relaciones definidas con foreign keys
- Triggers y funciones para lógica de negocio

#### Autenticación
- Auth JWT para todas las aplicaciones
- Roles: `staff` (salón) y `client` (clientes)
- Sesiones persistentes con AsyncStorage/localStorage

#### Row Level Security (RLS)
- Políticas por tabla y rol
- Staff ve todo, clientes solo su información
- Seguridad a nivel de base de datos

### 2. **Capa Compartida**

#### `shared/config/supabaseClient.js`
Cliente Supabase compartido por todas las apps.

**Características:**
- Configuración unificada
- Auto-detección de plataforma (web/mobile)
- Funciones helper para CRUD
- Gestión de sesiones

**Uso:**
```javascript
import { supabase, db } from '@shared/config/supabaseClient';

// Operación directa
const { data } = await supabase.from('citas').select('*');

// Usando helpers
const citas = await db.citas.getAll();
```

### 3. **App Salón (Gestión)**

#### Stack Tecnológico
- **Framework:** Expo (React Native)
- **UI:** NativeWind (Tailwind CSS)
- **Navegación:** React Navigation / Expo Router
- **Estado:** React Context / Zustand
- **Iconos:** Lucide React Native

#### Arquitectura de Carpetas
```
apps/salon/
├── App.js                 # Entry point
├── src/
│   ├── components/        # Componentes reutilizables
│   ├── screens/           # Pantallas principales
│   ├── navigation/        # Configuración de navegación
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utilidades
├── app.json               # Configuración Expo
├── eas.json               # EAS Build config
└── .env                   # Variables de entorno
```

#### Pantallas Principales
1. **HomeScreen** - Dashboard con resumen
2. **AppointmentsScreen** - Gestión de citas
3. **ClientsScreen** - Base de datos de clientes
4. **InventoryScreen** - Productos y servicios
5. **SettingsScreen** - Configuración

#### Flujo de Datos
```
User Action → Screen → Hook → Supabase Client → API
                ↓                              ↓
            Context State ← ← ← ← ← ← ← Response
                ↓
            UI Update
```

### 4. **App Clientes (Reservas)**

#### Stack Tecnológico
- **Framework:** Expo (React Native)
- **UI:** NativeWind (Tailwind CSS)
- **Navegación:** React Navigation / Expo Router
- **Estado:** React Context / Zustand
- **Iconos:** Lucide React Native

#### Arquitectura de Carpetas
```
apps/clientes/
├── App.js                 # Entry point
├── src/
│   ├── components/        # Componentes reutilizables
│   ├── screens/           # Pantallas principales
│   ├── navigation/        # Configuración de navegación
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utilidades
├── app.json               # Configuración Expo
├── eas.json               # EAS Build config
└── .env                   # Variables de entorno
```

#### Pantallas Principales
1. **HomeScreen** - Landing con servicios destacados
2. **ServicesScreen** - Catálogo completo
3. **BookingScreen** - Proceso de reserva
4. **MyAppointmentsScreen** - Citas del usuario
5. **ProfileScreen** - Perfil y configuración

#### Flujo de Reserva
```
1. Usuario ve servicios disponibles
2. Selecciona servicio y fecha/hora
3. Confirma reserva
4. Sistema verifica disponibilidad
5. Crea cita en Supabase
6. Envía confirmación (email/notificación)
```

### 5. **Web Catálogo (Landing)**

#### Stack Tecnológico
- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **UI:** Tailwind CSS v4
- **Iconos:** Lucide React
- **Deployment:** Vercel (recomendado)

#### Arquitectura de Carpetas
```
apps/web-catalogo/
├── app/
│   ├── layout.tsx         # Layout raíz
│   ├── page.tsx           # Landing page
│   ├── servicios/         # Página de servicios
│   ├── reservar/          # Formulario de reserva
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
├── lib/                   # Utilidades
├── public/                # Assets estáticos
└── .env.local             # Variables de entorno
```

#### Páginas Principales
1. **/** - Landing page
2. **/servicios** - Catálogo de servicios
3. **/galeria** - Galería de trabajos
4. **/reservar** - Formulario de reserva online
5. **/contacto** - Información de contacto

#### Rendering Strategy
- **SSG** (Static Site Generation) para landing y servicios
- **ISR** (Incremental Static Regeneration) para contenido dinámico
- **SSR** cuando se necesita autenticación

## Flujos de Datos Principales

### Autenticación

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ Email/Password
       ▼
┌──────────────┐
│ Supabase Auth│
└──────┬───────┘
       │ JWT Token
       ▼
┌──────────────┐
│ AsyncStorage │ (Persist session)
└──────────────┘
```

### Crear Cita (Staff)

```
┌─────────────────────┐
│ AppointmentsScreen  │
└──────────┬──────────┘
           │ Formulario
           ▼
┌─────────────────────┐
│ db.citas.create()   │
└──────────┬──────────┘
           │ Validación RLS
           ▼
┌─────────────────────┐
│ PostgreSQL INSERT   │
└──────────┬──────────┘
           │ Trigger notificación
           ▼
┌─────────────────────┐
│ App Cliente (Push)  │
└─────────────────────┘
```

### Reservar Cita (Cliente)

```
┌─────────────────────┐
│  BookingScreen      │
└──────────┬──────────┘
           │ Selección servicio
           ▼
┌─────────────────────┐
│ Verificar horarios  │
│ disponibles         │
└──────────┬──────────┘
           │ Horario disponible
           ▼
┌─────────────────────┐
│ Confirmar reserva   │
└──────────┬──────────┘
           │ db.citas.create()
           ▼
┌─────────────────────┐
│ Cita creada         │
│ Estado: "pendiente" │
└──────────┬──────────┘
           │ Notificación a staff
           ▼
┌─────────────────────┐
│ App Salón (Push)    │
└─────────────────────┘
```

## Seguridad

### Niveles de Seguridad

1. **Transport Layer**
   - HTTPS en todas las conexiones
   - SSL/TLS para base de datos

2. **Authentication**
   - JWT tokens con expiración
   - Refresh tokens automáticos
   - Logout en todos los dispositivos

3. **Authorization (RLS)**
   - Políticas por tabla
   - Rol-based access control
   - No queries sin autenticación

4. **Validation**
   - Client-side (UX)
   - Server-side (seguridad)
   - Database constraints

### Políticas de Ejemplo

```sql
-- Staff puede ver y modificar todo
CREATE POLICY "staff_all_access" ON citas
  FOR ALL
  USING (auth.jwt()->>'role' = 'staff');

-- Clientes solo ven sus citas
CREATE POLICY "clients_own_appointments" ON citas
  FOR SELECT
  USING (cliente_id = auth.uid());

-- Clientes solo crean citas para sí mismos
CREATE POLICY "clients_create_own" ON citas
  FOR INSERT
  WITH CHECK (cliente_id = auth.uid());
```

## Performance

### Optimizaciones Aplicadas

1. **Database**
   - Índices en columnas frecuentes (fecha_hora, cliente_id)
   - Vistas materializadas para reportes
   - Connection pooling

2. **Frontend**
   - Lazy loading de componentes
   - Image optimization (Next.js Image)
   - Memoización con useMemo/useCallback

3. **Caching**
   - React Query para cache de datos
   - AsyncStorage para persistencia
   - ISR en Next.js

4. **Bundle Size**
   - Tree shaking automático
   - Code splitting por ruta
   - Compresión gzip/brotli

## Escalabilidad

### Horizontal Scaling

```
Load Balancer
    │
    ├── Web Instance 1
    ├── Web Instance 2
    └── Web Instance N
         ↓
    Supabase (auto-scaling)
```

### Consideraciones

- **Database:** Supabase escala automáticamente
- **Web:** Deploy en Vercel (edge functions)
- **Mobile:** Apps nativas, sin servidor
- **Storage:** Supabase Storage con CDN

## Monitoreo y Logging

### Herramientas

1. **Supabase Dashboard**
   - Logs de API
   - Métricas de base de datos
   - Auth logs

2. **Sentry** (opcional)
   - Error tracking
   - Performance monitoring
   - Release tracking

3. **Analytics** (opcional)
   - Google Analytics
   - Expo Analytics
   - Custom events

## Deployment

### Ambientes

1. **Development**
   - Local con Expo Go
   - Local web con Next.js dev server
   - Supabase dev project

2. **Staging**
   - EAS Build (preview)
   - Vercel preview deployment
   - Supabase staging project

3. **Production**
   - EAS Build (production)
   - Vercel production
   - Supabase production project

### CI/CD Pipeline

```
Git Push
   ↓
GitHub Actions
   ↓
   ├── Run Tests
   ├── Lint Code
   └── Build
       ↓
   ┌───┴────┐
   │        │
Web Deploy  EAS Build
(Vercel)    (Expo)
```

## Próximas Mejoras

### Fase 2
- [ ] Notificaciones push
- [ ] Sistema de pagos
- [ ] Reportes y analytics
- [ ] Chat en tiempo real

### Fase 3
- [ ] Multi-salon support
- [ ] App para empleados individuales
- [ ] Sistema de inventario avanzado
- [ ] Programa de lealtad

## Documentación Adicional

- [README.md](./README.md) - Guía principal
- [QUICKSTART.md](./QUICKSTART.md) - Inicio rápido
- [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) - Integración con Supabase

---

**Última actualización:** Mayo 2026
