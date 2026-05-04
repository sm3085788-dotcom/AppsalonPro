# 🔌 Guía de Integración con Supabase

Este documento detalla cómo conectar el ecosistema AppSalon Pro con tu base de datos Supabase existente.

## 📋 Prerequisitos

- ✅ Proyecto de Supabase activo
- ✅ Base de datos configurada con todas las tablas
- ✅ RLS (Row Level Security) configurado
- ✅ Funciones y procedimientos almacenados (si aplica)

## 🔑 Paso 1: Obtener Credenciales

1. Accede a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia los siguientes valores:

### Valores Necesarios
- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## ⚙️ Paso 2: Configurar Variables de Entorno

### App Salón (`apps/salon/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### App Clientes (`apps/clientes/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Web Catálogo (`apps/web-catalogo/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🗃️ Paso 3: Análisis del Esquema de Base de Datos

Una vez configuradas las credenciales, necesitamos mapear tu esquema existente.

### Información Necesaria

Por favor, proporciona la estructura de tus tablas principales:

#### Ejemplo de lo que necesitamos:

```sql
-- Tabla de clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  telefono VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de servicios
CREATE TABLE servicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  descripcion TEXT,
  precio DECIMAL(10,2),
  duracion_minutos INTEGER
);

-- Tabla de citas
CREATE TABLE citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  servicio_id UUID REFERENCES servicios(id),
  fecha_hora TIMESTAMP,
  estado VARCHAR(50),
  notas TEXT
);

-- etc...
```

### Métodos para Compartir el Esquema

**Opción 1: Exportar desde Supabase Dashboard**
1. Ve a **Database** → **Schema Visualizer**
2. Copia el SQL generado

**Opción 2: Usar psql**
```bash
pg_dump -h db.xxxxxxxxxxxxx.supabase.co -U postgres -d postgres --schema-only
```

**Opción 3: Desde Supabase Dashboard**
1. Ve a **Database** → **Tables**
2. Lista todas las tablas principales que usarás

## 🔗 Paso 4: Mapeo de Funcionalidades

Una vez tengamos el esquema, mapearemos cada botón/funcionalidad de la UI a las operaciones de base de datos correspondientes.

### Funcionalidades a Mapear

#### App Salón (Gestión)
- [ ] **Citas**
  - Ver agenda del día/semana/mes
  - Crear nueva cita
  - Actualizar estado de cita
  - Cancelar cita
  
- [ ] **Clientes**
  - Listar clientes
  - Crear nuevo cliente
  - Editar datos de cliente
  - Ver historial de cliente
  
- [ ] **Inventario**
  - Ver productos/servicios
  - Actualizar stock
  - Agregar productos
  
- [ ] **Configuración**
  - Gestión de usuarios
  - Configuración de horarios
  - Ajustes del negocio

#### App Clientes
- [ ] **Reservas**
  - Ver servicios disponibles
  - Seleccionar fecha/hora
  - Confirmar reserva
  
- [ ] **Mis Citas**
  - Ver citas próximas
  - Ver historial
  - Cancelar cita
  
- [ ] **Perfil**
  - Editar información personal
  - Ver estadísticas de visitas

#### Web Catálogo
- [ ] **Servicios**
  - Mostrar catálogo público
  - Filtrar por categoría
  
- [ ] **Reservas**
  - Formulario de reserva
  - Disponibilidad de horarios

## 🛡️ Paso 5: Configuración de Seguridad (RLS)

### Políticas Recomendadas

#### Tabla `clientes`
```sql
-- Clientes pueden ver solo su información
CREATE POLICY "Clientes ven su info"
ON clientes FOR SELECT
USING (auth.uid() = user_id);

-- Staff puede ver todos los clientes
CREATE POLICY "Staff ve todos los clientes"
ON clientes FOR SELECT
USING (auth.jwt()->>'role' = 'staff');
```

#### Tabla `citas`
```sql
-- Clientes ven solo sus citas
CREATE POLICY "Clientes ven sus citas"
ON citas FOR SELECT
USING (cliente_id = auth.uid());

-- Staff ve todas las citas
CREATE POLICY "Staff ve todas las citas"
ON citas FOR SELECT
USING (auth.jwt()->>'role' = 'staff');
```

## 🧪 Paso 6: Testing de Conexión

Una vez configurado, puedes probar la conexión:

### Desde cualquier app

```javascript
import { supabase, testConnection } from '@shared/config/supabaseClient';

// Test simple
const test = async () => {
  const connected = await testConnection();
  console.log('Connected:', connected);
  
  // Intentar leer una tabla
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', data);
  }
};
```

## 📝 Paso 7: Implementación de Funciones CRUD

Una vez mapeado el esquema, actualizaremos `shared/config/supabaseClient.js` con funciones específicas:

### Ejemplo

```javascript
export const db = {
  // Citas
  citas: {
    getAll: async () => {
      return await supabase
        .from('citas')
        .select('*, clientes(*), servicios(*)')
        .order('fecha_hora', { ascending: true });
    },
    
    create: async (data) => {
      return await supabase
        .from('citas')
        .insert(data)
        .select();
    },
    
    update: async (id, data) => {
      return await supabase
        .from('citas')
        .update(data)
        .eq('id', id)
        .select();
    },
    
    delete: async (id) => {
      return await supabase
        .from('citas')
        .delete()
        .eq('id', id);
    },
  },
  
  // Clientes
  clientes: {
    // ... funciones similares
  },
  
  // etc...
};
```

## 🚀 Paso 8: Verificación Final

Antes de continuar con el desarrollo completo:

- [ ] Conexión a Supabase exitosa
- [ ] Todas las tablas accesibles
- [ ] RLS funcionando correctamente
- [ ] Autenticación funcionando
- [ ] Operaciones CRUD básicas funcionando

## 📞 ¿Necesitas Ayuda?

Si encuentras errores o necesitas asistencia:

1. Verifica que las credenciales sean correctas
2. Asegúrate que RLS no esté bloqueando el acceso
3. Revisa los logs en Supabase Dashboard → **Logs**
4. Usa el modo debug en el cliente:

```javascript
// En supabaseClient.js, agrega:
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key, {
  auth: {
    debug: true, // Activa logs detallados
  },
});
```

## 🎯 Estado de Integración

- [ ] Credenciales configuradas
- [ ] Esquema de base de datos analizado
- [ ] Funciones CRUD implementadas
- [ ] RLS configurado y probado
- [ ] Autenticación funcionando
- [ ] Apps conectadas y funcionales

---

**Una vez completes estos pasos, tus tres apps estarán completamente integradas con Supabase.** 🎉
