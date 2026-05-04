# 🔄 Estado de Integración - AppSalon Pro

## ✅ Completado

### 1. Tablas Mapeadas

#### ✅ CLIENTES
**Tabla:** `public.clientes`

**Campos implementados:**
- `id` (uuid, PK)
- `nombre` (text, required, unique)
- `telefono` (text)
- `email` (text)
- `notas` (text)
- `tipo_registro` (text, default: 'manual')
- `puntos_fidelidad` (integer, default: 0)
- `created_at` (timestamp)
- `user_id` (uuid, FK → auth.users)
- `categoria` (text, default: 'Nuevo')
- `cumpleanos` (text)
- `direccion` (text)
- `contacto_emergencia` (text)
- `tel_emergencia` (text)
- `referido_por` (uuid, FK → auth.users)
- `photo_url` (text)

**Funciones disponibles:**
```javascript
db.clientes.getAll()                 // Todos los clientes
db.clientes.getById(id)              // Cliente específico
db.clientes.search(query)            // Buscar por nombre/teléfono/email
db.clientes.create(data)             // Crear cliente
db.clientes.update(id, data)         // Actualizar cliente
db.clientes.delete(id)               // Eliminar cliente
db.clientes.updatePuntos(id, puntos) // Actualizar puntos de fidelidad
db.clientes.getByCategoria(cat)      // Filtrar por categoría
db.clientes.getReferidos(userId)     // Clientes referidos
```

#### ✅ CITAS
**Tabla:** `public.citas`

**Campos implementados:**
- `id` (uuid, PK)
- `cliente_id` (uuid, FK → clientes)
- `servicio` (text, required)
- `precio` (numeric, default: 0)
- `duracion_minutos` (integer, default: 30)
- `fecha_hora` (timestamp, required)
- `estado` (text, default: 'pendiente')
- `notas_servicio` (text)
- `creado_en` (timestamp)
- `empleado_id` (uuid, FK → empleados)
- `venta_generada` (boolean, default: false)

**Funciones disponibles:**
```javascript
db.citas.getAll()                    // Todas las citas con JOIN
db.citas.getByDate(fecha)            // Citas de un día específico
db.citas.getByDateRange(start, end)  // Citas en rango
db.citas.getByCliente(clienteId)     // Citas de un cliente
db.citas.getByEmpleado(empleadoId)   // Citas de un empleado
db.citas.getByEstado(estado)         // Filtrar por estado
db.citas.create(data)                // Crear cita
db.citas.update(id, data)            // Actualizar cita
db.citas.updateEstado(id, estado)    // Cambiar estado
db.citas.completar(id)               // Marcar como completada
db.citas.cancelar(id, motivo)        // Cancelar cita
db.citas.delete(id)                  // Eliminar cita
db.citas.getProximas()               // Próximos 7 días
db.citas.getHoy()                    // Citas de hoy
```

### 2. Funciones de Estadísticas

```javascript
db.stats.getDashboard()              // Resumen dashboard completo
// Retorna: { 
//   citasHoy, 
//   totalClientes, 
//   totalEmpleados,
//   citasPendientes,
//   ingresosMes
// }

db.stats.getPorPeriodo(start, end)   // Estadísticas por período
// Retorna: {
//   totalCitas,
//   citasCompletadas,
//   ingresos,
//   promedioPorCita
// }
```

### 3. Autenticación

```javascript
db.auth.signIn(email, password)      // Login
db.auth.signUp(email, password, meta)// Registro
db.auth.signOut()                    // Cerrar sesión
db.auth.getUser()                    // Usuario actual
db.auth.getSession()                 // Sesión actual
```

#### ✅ EMPLEADOS
**Tabla:** `public.empleados`

**Campos implementados:**
- `id` (uuid, PK)
- `nombre` (text, required)
- `rol` (text)
- `telefono` (text)
- `email` (text)
- `comision_porcentaje` (numeric, default: 0)
- `tipo_registro` (text, default: 'manual')
- `created_at` (timestamp)
- `direccion` (text)
- `contacto_emergencia` (text)
- `tel_emergencia` (text)
- `activo` (boolean, default: true)

**Funciones disponibles:**
```javascript
db.empleados.getAll()                    // Todos los empleados
db.empleados.getActivos()                // Solo activos
db.empleados.getById(id)                 // Empleado específico
db.empleados.getByRol(rol)               // Filtrar por rol
db.empleados.search(query)               // Buscar por nombre/teléfono/email
db.empleados.create(data)                // Crear empleado
db.empleados.update(id, data)            // Actualizar empleado
db.empleados.setActivo(id, activo)       // Activar/desactivar
db.empleados.delete(id)                  // Eliminar empleado
db.empleados.getCitas(empleadoId, start, end)  // Citas del empleado
db.empleados.getEstadisticas(empleadoId) // Estadísticas (ventas, comisiones)
```

## ⏳ Pendiente

### Tablas que Faltan

#### ⏳ SERVICIOS
**Necesario para:**
- Catálogo de servicios
- Precios y duraciones
- Categorización

**Nota:** Actualmente las citas tienen `servicio` como TEXT libre.

**Opciones:**
1. Mantener servicio como TEXT (más flexible)
2. Crear tabla de servicios y migrar (más estructurado)

**Por favor comparte:**
- ¿Tienes tabla de servicios?
- Si sí: `CREATE TABLE servicios (...)`
- Si no: ¿Quieres que la creemos?

#### ⏳ PRODUCTOS (Opcional)
**Para inventario:**
```sql
CREATE TABLE productos (...);
```

#### ⏳ PAGOS (Opcional)
**Para transacciones:**
```sql
CREATE TABLE pagos (...);
```

## 🎯 Uso en las Apps

### Ejemplo: App Salón - Lista de Citas de Hoy

```javascript
import { db } from '@shared/config/supabaseClient';

// En un componente
const [citas, setCitas] = useState([]);

useEffect(() => {
  loadCitasHoy();
}, []);

const loadCitasHoy = async () => {
  const { data, error } = await db.citas.getHoy();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  setCitas(data);
  // data incluye: cita.cliente.nombre, cita.empleado.nombre, etc.
};
```

### Ejemplo: App Clientes - Crear Reserva

```javascript
import { db } from '@shared/config/supabaseClient';

const crearReserva = async () => {
  const { data, error } = await db.citas.create({
    cliente_id: clienteId,
    servicio: 'Corte de cabello',
    precio: 45.00,
    duracion_minutos: 60,
    fecha_hora: '2026-05-10T14:00:00',
    empleado_id: empleadoSeleccionado,
  });
  
  if (error) {
    alert('Error al crear cita');
    return;
  }
  
  alert('¡Cita creada exitosamente!');
};
```

### Ejemplo: Dashboard - Estadísticas

```javascript
import { db } from '@shared/config/supabaseClient';

const loadStats = async () => {
  const stats = await db.stats.getDashboard();
  
  console.log(`Citas hoy: ${stats.citasHoy}`);
  console.log(`Total clientes: ${stats.totalClientes}`);
  console.log(`Citas pendientes: ${stats.citasPendientes}`);
};
```

## 🔐 Seguridad (RLS)

**Importante:** Tus tablas tienen RLS habilitado. Asegúrate de tener políticas configuradas para:

### Para App Salón (Staff)
```sql
-- Staff puede ver y modificar todo
CREATE POLICY "staff_all_access" ON citas
  FOR ALL
  USING (auth.jwt()->>'role' = 'staff');
```

### Para App Clientes
```sql
-- Clientes solo ven sus propias citas
CREATE POLICY "clients_own_appointments" ON citas
  FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM clientes WHERE user_id = auth.uid()
  ));
```

## 📱 Siguientes Pasos

1. **Comparte tabla `empleados`** (requerida)
2. **Confirma tabla `servicios`** (¿existe o creamos?)
3. **Implementaré:**
   - Funciones CRUD completas para empleados
   - Funciones para servicios (si existen)
   - Conexión de pantallas a las funciones
   - Validaciones de formularios
   - Manejo de estados

## 🎨 Estados de Citas

Según tu esquema, las citas tienen estado TEXT. Valores comunes:
- `'pendiente'` - Cita agendada
- `'confirmada'` - Cliente confirmó
- `'completada'` - Servicio realizado
- `'cancelada'` - Cita cancelada
- `'no_asistio'` - No show

¿Estos son tus estados o tienes otros?

## 📊 Categorías de Clientes

Tu tabla clientes tiene `categoria` con default 'Nuevo'. ¿Qué categorías usas?
- Nuevo
- Regular
- VIP
- Premium
- ¿Otros?

---

**Actualización:** Mayo 3, 2026 - 11:25 PM  
**Estado:** 2/4 tablas principales implementadas  
**Próximo:** Esperando esquema de empleados y servicios
