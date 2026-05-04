# 📊 Guía de Mapeo de Base de Datos

## Estado Actual

✅ **Conexión exitosa a Supabase**
✅ **17 tablas detectadas**
⏳ **Pendiente:** Estructura de columnas y relaciones

## Tablas Encontradas

Las siguientes tablas están disponibles en tu base de datos:

### Gestión de Clientes
- `users`
- `customers`
- `clients`

### Gestión de Citas
- `appointments`
- `reservas`
- `bookings`

### Servicios y Productos
- `servicios`
- `services`
- `productos`
- `products`
- `inventory`
- `categorias`
- `categories`

### Personal
- `staff`
- `employees`

### Transacciones
- `pagos`
- `payments`

## 🎯 Información Necesaria

Para cada tabla principal, necesito saber:

### 1. Tabla de Clientes

¿Cuál es tu tabla principal de clientes? (`clients`, `customers`, o `users`)

**Estructura esperada:**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  apellido VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Dime:**
- ✏️ Nombre de la tabla: ______________
- ✏️ Columnas que tiene: ______________
- ✏️ Campos requeridos: ______________

### 2. Tabla de Citas

¿Cuál es tu tabla de citas? (`appointments`, `bookings`, o `reservas`)

**Estructura esperada:**
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clients(id),
  servicio_id UUID REFERENCES services(id),
  empleado_id UUID REFERENCES staff(id),
  fecha DATE,
  hora TIME,
  duracion_minutos INTEGER,
  estado VARCHAR(50), -- 'pendiente', 'confirmada', 'completada', 'cancelada'
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Dime:**
- ✏️ Nombre de la tabla: ______________
- ✏️ Columnas que tiene: ______________
- ✏️ Relaciones (foreign keys): ______________
- ✏️ Estados posibles: ______________

### 3. Tabla de Servicios

¿Cuál es tu tabla de servicios? (`services` o `servicios`)

**Estructura esperada:**
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  descripcion TEXT,
  precio DECIMAL(10,2),
  duracion_minutos INTEGER,
  categoria_id UUID REFERENCES categories(id),
  activo BOOLEAN DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Dime:**
- ✏️ Nombre de la tabla: ______________
- ✏️ Columnas que tiene: ______________
- ✏️ Relación con categorías: ______________

### 4. Tabla de Personal

¿Tienes tabla de staff? (`staff` o `employees`)

**Estructura esperada:**
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  apellido VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(20),
  rol VARCHAR(50), -- 'admin', 'stylist', 'receptionist'
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Dime:**
- ✏️ Nombre de la tabla: ______________
- ✏️ Columnas que tiene: ______________

### 5. Otras Tablas Importantes

¿Tienes otras tablas como:
- Pagos/Payments
- Productos/Inventory
- Categorías

**Dime:**
- ✏️ Qué otras tablas usas: ______________
- ✏️ Para qué las usas: ______________

## 🔍 Formas de Obtener esta Información

### Método 1: SQL Export (Recomendado)

1. Ve a Supabase Dashboard
2. **Database** → **Tables**
3. Para cada tabla importante:
   - Click en la tabla
   - Ve a pestaña **"Definition"**
   - Copia el CREATE TABLE statement completo
4. Pega aquí todos los CREATE TABLE

### Método 2: Schema Visualizer

1. **Database** → **Schema Visualizer**
2. Haz screenshot de todo
3. O copia el SQL generado

### Método 3: Lista Manual

Si es más fácil, simplemente dime:

```
Tabla de Clientes: clients
Columnas: id, nombre, email, telefono, created_at

Tabla de Citas: appointments
Columnas: id, cliente_id, servicio_id, fecha, hora, estado

...etc
```

## 📋 Template Rápido

Copia esto y llénalo:

```
=== MIS TABLAS ===

CLIENTES:
Tabla: ___________
Columnas: ___________

CITAS:
Tabla: ___________
Columnas: ___________
Relaciones: cliente_id → tabla._____, servicio_id → tabla._____

SERVICIOS:
Tabla: ___________
Columnas: ___________

EMPLEADOS (si aplica):
Tabla: ___________
Columnas: ___________

PAGOS (si aplica):
Tabla: ___________
Columnas: ___________
```

## 🚀 Una vez que tenga esta info

Voy a:
1. ✅ Actualizar `shared/config/supabaseClient.js` con funciones específicas
2. ✅ Conectar cada pantalla a tu base de datos real
3. ✅ Implementar CRUD completo
4. ✅ Configurar validaciones según tus campos
5. ✅ Mapear estados y enums
6. ✅ Implementar lógica de negocio

---

**¿Cómo prefieres compartir la info?** Elige la opción más fácil para ti y compártela aquí.
