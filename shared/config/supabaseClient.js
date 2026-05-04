/**
 * Supabase Client - Configuración Compartida
 * 
 * Este archivo conecta todas las apps (Salon, Clientes, Web) con tu base de datos existente.
 * NO crea tablas nuevas, solo se conecta a tu esquema actual.
 * 
 * Uso en cualquier app:
 * import { supabase } from '@shared/config/supabaseClient';
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Variables de entorno - Configura en cada app
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validación de credenciales
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials not configured. Please add them to your .env file.');
}

// Configuración de storage para React Native
const supabaseStorageAdapter = {
  getItem: async (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.removeItem(key);
    }
    return AsyncStorage.removeItem(key);
  },
};

// Cliente Supabase configurado
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper Functions para interactuar con tu base de datos
 * Funciones mapeadas a tu esquema existente
 */

export const db = {
  // ==================== AUTENTICACIÓN ====================
  auth: {
    signIn: async (email, password) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    signUp: async (email, password, metadata) => {
      return await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: metadata } 
      });
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
    getUser: async () => {
      return await supabase.auth.getUser();
    },
    getSession: async () => {
      return await supabase.auth.getSession();
    },
  },

  // ==================== CLIENTES ====================
  clientes: {
    // Obtener todos los clientes
    getAll: async () => {
      return await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
    },

    // Obtener un cliente por ID
    getById: async (id) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Buscar clientes por nombre o teléfono
    search: async (query) => {
      return await supabase
        .from('clientes')
        .select('*')
        .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nombre');
    },

    // Crear nuevo cliente
    create: async (data) => {
      return await supabase
        .from('clientes')
        .insert({
          nombre: data.nombre,
          telefono: data.telefono || null,
          email: data.email || null,
          notas: data.notas || null,
          tipo_registro: data.tipo_registro || 'manual',
          categoria: data.categoria || 'Nuevo',
          cumpleanos: data.cumpleanos || null,
          direccion: data.direccion || null,
          contacto_emergencia: data.contacto_emergencia || null,
          tel_emergencia: data.tel_emergencia || null,
          referido_por: data.referido_por || null,
          photo_url: data.photo_url || null,
        })
        .select()
        .single();
    },

    // Actualizar cliente
    update: async (id, data) => {
      return await supabase
        .from('clientes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar cliente
    delete: async (id) => {
      return await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
    },

    // Actualizar puntos de fidelidad
    updatePuntos: async (id, puntos) => {
      return await supabase
        .from('clientes')
        .update({ puntos_fidelidad: puntos })
        .eq('id', id)
        .select()
        .single();
    },

    // Obtener clientes por categoría
    getByCategoria: async (categoria) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('categoria', categoria)
        .order('nombre');
    },

    // Obtener clientes referidos por un usuario
    getReferidos: async (userId) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('referido_por', userId);
    },
  },

  // ==================== CITAS ====================
  citas: {
    // Obtener todas las citas
    getAll: async () => {
      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .order('fecha_hora', { ascending: false });
    },

    // Obtener citas por fecha
    getByDate: async (fecha) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', startOfDay.toISOString())
        .lte('fecha_hora', endOfDay.toISOString())
        .order('fecha_hora');
    },

    // Obtener citas por rango de fechas
    getByDateRange: async (startDate, endDate) => {
      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', startDate)
        .lte('fecha_hora', endDate)
        .order('fecha_hora');
    },

    // Obtener citas de un cliente
    getByCliente: async (clienteId) => {
      return await supabase
        .from('citas')
        .select(`
          *,
          empleado:empleados(id, nombre)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_hora', { ascending: false });
    },

    // Obtener citas de un empleado
    getByEmpleado: async (empleadoId) => {
      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email)
        `)
        .eq('empleado_id', empleadoId)
        .order('fecha_hora');
    },

    // Obtener citas por estado
    getByEstado: async (estado) => {
      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .eq('estado', estado)
        .order('fecha_hora');
    },

    // Crear nueva cita
    create: async (data) => {
      return await supabase
        .from('citas')
        .insert({
          cliente_id: data.cliente_id,
          servicio: data.servicio,
          precio: data.precio || 0,
          duracion_minutos: data.duracion_minutos || 30,
          fecha_hora: data.fecha_hora,
          estado: data.estado || 'pendiente',
          notas_servicio: data.notas_servicio || null,
          empleado_id: data.empleado_id || null,
        })
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .single();
    },

    // Actualizar cita
    update: async (id, data) => {
      return await supabase
        .from('citas')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .single();
    },

    // Actualizar estado de cita
    updateEstado: async (id, estado) => {
      return await supabase
        .from('citas')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar cita como completada y venta generada
    completar: async (id) => {
      return await supabase
        .from('citas')
        .update({ 
          estado: 'completada',
          venta_generada: true 
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Cancelar cita
    cancelar: async (id, motivo = null) => {
      return await supabase
        .from('citas')
        .update({ 
          estado: 'cancelada',
          notas_servicio: motivo 
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar cita
    delete: async (id) => {
      return await supabase
        .from('citas')
        .delete()
        .eq('id', id);
    },

    // Obtener citas próximas (siguientes 7 días)
    getProximas: async () => {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', now.toISOString())
        .lte('fecha_hora', nextWeek.toISOString())
        .eq('estado', 'pendiente')
        .order('fecha_hora');
    },

    // Obtener citas del día actual
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', today.toISOString())
        .lt('fecha_hora', tomorrow.toISOString())
        .order('fecha_hora');
    },
  },

  // ==================== EMPLEADOS ====================
  empleados: {
    // Obtener todos los empleados
    getAll: async () => {
      return await supabase
        .from('empleados')
        .select('*')
        .order('nombre');
    },

    // Obtener solo empleados activos
    getActivos: async () => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre');
    },

    // Obtener empleado por ID
    getById: async (id) => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener empleados por rol
    getByRol: async (rol) => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('rol', rol)
        .eq('activo', true)
        .order('nombre');
    },

    // Buscar empleados
    search: async (query) => {
      return await supabase
        .from('empleados')
        .select('*')
        .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nombre');
    },

    // Crear nuevo empleado
    create: async (data) => {
      return await supabase
        .from('empleados')
        .insert({
          nombre: data.nombre,
          rol: data.rol || null,
          telefono: data.telefono || null,
          email: data.email || null,
          comision_porcentaje: data.comision_porcentaje || 0,
          tipo_registro: data.tipo_registro || 'manual',
          direccion: data.direccion || null,
          contacto_emergencia: data.contacto_emergencia || null,
          tel_emergencia: data.tel_emergencia || null,
          activo: data.activo !== undefined ? data.activo : true,
        })
        .select()
        .single();
    },

    // Actualizar empleado
    update: async (id, data) => {
      return await supabase
        .from('empleados')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Activar/Desactivar empleado
    setActivo: async (id, activo) => {
      return await supabase
        .from('empleados')
        .update({ activo })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar empleado
    delete: async (id) => {
      return await supabase
        .from('empleados')
        .delete()
        .eq('id', id);
    },

    // Obtener citas de un empleado
    getCitas: async (empleadoId, startDate = null, endDate = null) => {
      let query = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email)
        `)
        .eq('empleado_id', empleadoId)
        .order('fecha_hora', { ascending: false });

      if (startDate) {
        query = query.gte('fecha_hora', startDate);
      }
      if (endDate) {
        query = query.lte('fecha_hora', endDate);
      }

      return await query;
    },

    // Obtener estadísticas de un empleado
    getEstadisticas: async (empleadoId, mes = null, anio = null) => {
      let query = supabase
        .from('citas')
        .select('precio, estado, venta_generada')
        .eq('empleado_id', empleadoId);

      // Si se especifica mes/año, filtrar
      if (mes && anio) {
        const startDate = new Date(anio, mes - 1, 1);
        const endDate = new Date(anio, mes, 0, 23, 59, 59);
        query = query
          .gte('fecha_hora', startDate.toISOString())
          .lte('fecha_hora', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) return { error };

      // Calcular estadísticas
      const totalCitas = data.length;
      const citasCompletadas = data.filter(c => c.estado === 'completada').length;
      const ventasTotales = data
        .filter(c => c.venta_generada)
        .reduce((sum, c) => sum + Number(c.precio), 0);

      return {
        data: {
          totalCitas,
          citasCompletadas,
          ventasTotales,
          tasaCompletacion: totalCitas > 0 ? (citasCompletadas / totalCitas * 100).toFixed(1) : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MOVIMIENTOS DE CAJA ====================
  movimientosCaja: {
    // Obtener todos los movimientos
    getAll: async () => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .order('fecha', { ascending: false });
    },

    // Obtener movimientos de una caja
    getByCaja: async (cajaId) => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
    },

    // Obtener movimiento por ID
    getById: async (id) => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener movimientos por tipo
    getByTipo: async (tipo, cajaId = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .eq('tipo', tipo)
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Obtener movimientos por fecha
    getByFecha: async (fecha, cajaId = null) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', startOfDay.toISOString())
        .lte('fecha', endOfDay.toISOString())
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Obtener movimientos por rango de fechas
    getByRangoFechas: async (startDate, endDate, cajaId = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Crear movimiento
    create: async (data) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: data.caja_id,
          tipo: data.tipo, // 'ingreso', 'egreso', 'apertura', 'cierre', 'retiro'
          monto: data.monto,
          descripcion: data.descripcion || null,
        })
        .select()
        .single();
    },

    // Registrar ingreso
    registrarIngreso: async (cajaId, monto, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'ingreso',
          monto: monto,
          descripcion: descripcion,
        })
        .select()
        .single();
    },

    // Registrar egreso
    registrarEgreso: async (cajaId, monto, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'egreso',
          monto: monto,
          descripcion: descripcion,
        })
        .select()
        .single();
    },

    // Registrar apertura de caja
    registrarApertura: async (cajaId, montoInicial, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'apertura',
          monto: montoInicial,
          descripcion: descripcion || 'Apertura de caja',
        })
        .select()
        .single();
    },

    // Registrar cierre de caja
    registrarCierre: async (cajaId, montoFinal, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'cierre',
          monto: montoFinal,
          descripcion: descripcion || 'Cierre de caja',
        })
        .select()
        .single();
    },

    // Actualizar movimiento
    update: async (id, data) => {
      return await supabase
        .from('movimientos_caja')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar movimiento
    delete: async (id) => {
      return await supabase
        .from('movimientos_caja')
        .delete()
        .eq('id', id);
    },

    // Obtener movimientos de hoy
    getHoy: async (cajaId = null) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Calcular balance de una caja
    calcularBalance: async (cajaId, startDate = null, endDate = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('tipo, monto')
        .eq('caja_id', cajaId);

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const ingresos = data
        .filter(m => ['ingreso', 'apertura'].includes(m.tipo))
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const egresos = data
        .filter(m => ['egreso', 'retiro', 'cierre'].includes(m.tipo))
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const balance = ingresos - egresos;

      return {
        data: {
          ingresos: ingresos.toFixed(2),
          egresos: egresos.toFixed(2),
          balance: balance.toFixed(2),
          totalMovimientos: data.length,
        },
        error: null,
      };
    },

    // Estadísticas de movimientos
    getEstadisticas: async (cajaId, startDate = null, endDate = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('tipo, monto')
        .eq('caja_id', cajaId);

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const porTipo = data.reduce((acc, m) => {
        const tipo = m.tipo || 'otros';
        if (!acc[tipo]) {
          acc[tipo] = { cantidad: 0, total: 0 };
        }
        acc[tipo].cantidad++;
        acc[tipo].total += Number(m.monto);
        return acc;
      }, {});

      return {
        data: porTipo,
        error: null,
      };
    },
  },

  // ==================== NOTIFICACIONES ====================
  notificaciones: {
    // Obtener todas las notificaciones
    getAll: async () => {
      return await supabase
        .from('notificaciones')
        .select(`
          *,
          empleado:empleados(id, nombre)
        `)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones de un empleado
    getByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones no leídas de un empleado
    getNoLeidasByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('leida', false)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones por tipo
    getByTipo: async (tipo, empleadoId = null) => {
      let query = supabase
        .from('notificaciones')
        .select('*')
        .eq('tipo', tipo)
        .order('created_at', { ascending: false });

      if (empleadoId) {
        query = query.eq('empleado_id', empleadoId);
      }

      return await query;
    },

    // Obtener notificación por ID
    getById: async (id) => {
      return await supabase
        .from('notificaciones')
        .select(`
          *,
          empleado:empleados(id, nombre)
        `)
        .eq('id', id)
        .single();
    },

    // Crear notificación
    create: async (data) => {
      return await supabase
        .from('notificaciones')
        .insert({
          empleado_id: data.empleado_id,
          titulo: data.titulo || null,
          mensaje: data.mensaje || null,
          tipo: data.tipo || null,
          target_screen: data.target_screen || null,
          target_id: data.target_id || null,
          leida: false,
        })
        .select()
        .single();
    },

    // Crear notificación masiva (para múltiples empleados)
    createBulk: async (empleadoIds, data) => {
      const notifications = empleadoIds.map(empleadoId => ({
        empleado_id: empleadoId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo || null,
        target_screen: data.target_screen || null,
        target_id: data.target_id || null,
        leida: false,
      }));

      return await supabase
        .from('notificaciones')
        .insert(notifications)
        .select();
    },

    // Marcar como leída
    marcarLeida: async (id) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar todas como leídas para un empleado
    marcarTodasLeidas: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('empleado_id', empleadoId)
        .eq('leida', false);
    },

    // Marcar como no leída
    marcarNoLeida: async (id) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: false })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar notificación
    delete: async (id) => {
      return await supabase
        .from('notificaciones')
        .delete()
        .eq('id', id);
    },

    // Eliminar todas las notificaciones de un empleado
    deleteAllByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .delete()
        .eq('empleado_id', empleadoId);
    },

    // Eliminar notificaciones leídas antiguas (cleanup)
    deleteOldLeidas: async (dias = 30) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('notificaciones')
        .delete()
        .eq('leida', true)
        .lt('created_at', fecha.toISOString());
    },

    // Contar notificaciones no leídas de un empleado
    countNoLeidas: async (empleadoId) => {
      const { count, error } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('empleado_id', empleadoId)
        .eq('leida', false);

      return { count: count || 0, error };
    },

    // Obtener notificaciones recientes (últimos N días)
    getRecientes: async (empleadoId, dias = 7) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .gte('created_at', fecha.toISOString())
        .order('created_at', { ascending: false });
    },

    // Suscribirse a cambios en tiempo real
    subscribeToEmpleado: (empleadoId, callback) => {
      return supabase
        .channel(`notificaciones:${empleadoId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `empleado_id=eq.${empleadoId}`,
          },
          callback
        )
        .subscribe();
    },

    // Enviar notificación de nueva cita
    notificarNuevaCita: async (empleadoId, citaId, clienteNombre) => {
      return await supabase
        .from('notificaciones')
        .insert({
          empleado_id: empleadoId,
          titulo: 'Nueva Cita Asignada',
          mensaje: `Se te ha asignado una cita con ${clienteNombre}`,
          tipo: 'cita',
          target_screen: 'Citas',
          target_id: citaId,
          leida: false,
        })
        .select()
        .single();
    },

    // Enviar notificación de stock bajo
    notificarStockBajo: async (empleadoIds, productoNombre, stockActual) => {
      const notifications = empleadoIds.map(empleadoId => ({
        empleado_id: empleadoId,
        titulo: 'Alerta de Stock Bajo',
        mensaje: `El producto "${productoNombre}" tiene stock bajo (${stockActual} unidades)`,
        tipo: 'inventario',
        target_screen: 'Inventario',
        leida: false,
      }));

      return await supabase
        .from('notificaciones')
        .insert(notifications)
        .select();
    },

    // Estadísticas de notificaciones
    getEstadisticas: async (empleadoId) => {
      const { data } = await supabase
        .from('notificaciones')
        .select('leida, tipo')
        .eq('empleado_id', empleadoId);

      if (!data) return { error: 'Error al obtener notificaciones' };

      const total = data.length;
      const noLeidas = data.filter(n => !n.leida).length;
      const leidas = data.filter(n => n.leida).length;
      
      const porTipo = data.reduce((acc, n) => {
        const tipo = n.tipo || 'general';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});

      return {
        data: {
          total,
          noLeidas,
          leidas,
          porTipo,
        },
        error: null,
      };
    },
  },

  // ==================== PROFILES (Usuarios del Sistema) ====================
  profiles: {
    // Obtener todos los perfiles
    getAll: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    },

    // Obtener perfil por ID (user_id de auth.users)
    getById: async (id) => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener perfil del usuario actual
    getCurrentProfile: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { data: null, error: { message: 'No user logged in' } };

      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    },

    // Obtener perfiles por rol
    getByRole: async (role) => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('full_name');
    },

    // Obtener todos los admins
    getAdmins: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('full_name');
    },

    // Obtener todo el staff
    getStaff: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff')
        .order('full_name');
    },

    // Buscar perfiles
    search: async (query) => {
      return await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('full_name');
    },

    // Crear perfil (normalmente se hace automáticamente con trigger)
    create: async (data) => {
      return await supabase
        .from('profiles')
        .insert({
          id: data.id, // UUID del auth.users
          full_name: data.full_name || null,
          role: data.role || 'staff',
          phone: data.phone || null,
          address: data.address || null,
          birthday: data.birthday || null,
          age: data.age || null,
          photo_url: data.photo_url || null,
          marketing_access: data.marketing_access || false,
          app_scope: data.app_scope || 'staff',
          community_enabled: data.community_enabled !== undefined ? data.community_enabled : true,
        })
        .select()
        .single();
    },

    // Actualizar perfil
    update: async (id, data) => {
      return await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Actualizar perfil actual
    updateCurrent: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { data: null, error: { message: 'No user logged in' } };

      return await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();
    },

    // Cambiar rol
    changeRole: async (userId, newRole) => {
      // Validar que el rol sea válido
      if (!['admin', 'staff'].includes(newRole)) {
        return { error: { message: 'Invalid role. Must be admin or staff' } };
      }

      return await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();
    },

    // Actualizar acceso a marketing
    setMarketingAccess: async (userId, enabled) => {
      return await supabase
        .from('profiles')
        .update({ marketing_access: enabled })
        .eq('id', userId)
        .select()
        .single();
    },

    // Actualizar acceso a comunidad
    setCommunityEnabled: async (userId, enabled) => {
      return await supabase
        .from('profiles')
        .update({ community_enabled: enabled })
        .eq('id', userId)
        .select()
        .single();
    },

    // Eliminar perfil
    delete: async (id) => {
      return await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
    },

    // Verificar si el usuario es admin
    isAdmin: async (userId = null) => {
      let id = userId;
      
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        id = user.id;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single();

      return data?.role === 'admin';
    },

    // Obtener perfiles con marketing habilitado
    getWithMarketingAccess: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('marketing_access', true)
        .order('full_name');
    },

    // Estadísticas de usuarios
    getEstadisticas: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role, marketing_access, app_scope');

      if (!profiles) return { error: 'Error al obtener perfiles' };

      const totalUsuarios = profiles.length;
      const admins = profiles.filter(p => p.role === 'admin').length;
      const staff = profiles.filter(p => p.role === 'staff').length;
      const conMarketingAccess = profiles.filter(p => p.marketing_access).length;

      return {
        data: {
          totalUsuarios,
          admins,
          staff,
          conMarketingAccess,
        },
        error: null,
      };
    },
  },

  // ==================== VENTAS ====================
  ventas: {
    // Obtener todas las ventas
    getAll: async () => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .order('fecha', { ascending: false });
    },

    // Obtener venta por ID
    getById: async (id) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, categoria),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre, rol)
        `)
        .eq('id', id)
        .single();
    },

    // Obtener ventas por fecha
    getByFecha: async (fecha) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', startOfDay.toISOString())
        .lte('fecha', endOfDay.toISOString())
        .order('fecha', { ascending: false });
    },

    // Obtener ventas por rango de fechas
    getByRangoFechas: async (startDate, endDate) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de un cliente
    getByCliente: async (clienteId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de un vendedor
    getByVendedor: async (vendedorId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre)
        `)
        .eq('vendedor_id', vendedorId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de una caja
    getByCaja: async (cajaId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas por método de pago
    getByMetodoPago: async (metodoPago) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('metodo_pago', metodoPago)
        .order('fecha', { ascending: false });
    },

    // Buscar ventas por número de factura
    getByFactura: async (noFactura) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('no_factura', noFactura)
        .single();
    },

    // Crear venta
    create: async (data) => {
      return await supabase
        .from('ventas')
        .insert({
          cliente_id: data.cliente_id || null,
          cliente_nombre: data.cliente_nombre || null,
          profesional: data.profesional || null,
          total: data.total || 0,
          monto: data.monto || data.total || 0,
          metodo_pago: data.metodo_pago || null,
          items: data.items || null, // JSONB
          notas: data.notas || null,
          detalles_pago: data.detalles_pago || null,
          no_factura: data.no_factura || null,
          descuento: data.descuento || 0,
          vendedor_id: data.vendedor_id || null,
          caja_id: data.caja_id || null,
        })
        .select(`
          *,
          cliente:clientes(id, nombre, telefono),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .single();
    },

    // Actualizar venta
    update: async (id, data) => {
      return await supabase
        .from('ventas')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .single();
    },

    // Marcar venta como alterada (para auditoría)
    marcarAlterada: async (id, motivo) => {
      return await supabase
        .from('ventas')
        .update({
          fue_alterada: true,
          motivo_alteracion: motivo,
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar venta
    delete: async (id) => {
      // Primero marcar como alterada antes de eliminar (para auditoría)
      await supabase
        .from('ventas')
        .update({
          fue_alterada: true,
          motivo_alteracion: 'Venta eliminada',
        })
        .eq('id', id);

      return await supabase
        .from('ventas')
        .delete()
        .eq('id', id);
    },

    // Obtener ventas de hoy
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });
    },

    // Obtener ventas alteradas (auditoría)
    getAlteradas: async () => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('fue_alterada', true)
        .order('fecha', { ascending: false });
    },

    // Estadísticas de ventas
    getEstadisticas: async (startDate = null, endDate = null) => {
      let query = supabase
        .from('ventas')
        .select('total, monto, descuento, metodo_pago, fecha, vendedor_id');

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const totalVentas = data.length;
      const ventasTotales = data.reduce((sum, v) => sum + Number(v.total || v.monto || 0), 0);
      const descuentosTotales = data.reduce((sum, v) => sum + Number(v.descuento || 0), 0);
      const promedioVenta = totalVentas > 0 ? (ventasTotales / totalVentas).toFixed(2) : 0;

      // Ventas por método de pago
      const porMetodoPago = data.reduce((acc, v) => {
        const metodo = v.metodo_pago || 'Sin especificar';
        acc[metodo] = (acc[metodo] || 0) + Number(v.total || v.monto || 0);
        return acc;
      }, {});

      // Top vendedores
      const porVendedor = data.reduce((acc, v) => {
        if (v.vendedor_id) {
          acc[v.vendedor_id] = (acc[v.vendedor_id] || 0) + Number(v.total || v.monto || 0);
        }
        return acc;
      }, {});

      return {
        data: {
          totalVentas,
          ventasTotales: ventasTotales.toFixed(2),
          descuentosTotales: descuentosTotales.toFixed(2),
          ventasNetas: (ventasTotales - descuentosTotales).toFixed(2),
          promedioVenta,
          porMetodoPago,
          porVendedor,
        },
        error: null,
      };
    },

    // Obtener ticket de venta (con formato)
    getTicket: async (id) => {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('id', id)
        .single();

      if (error) return { error };

      // Parsear items del JSONB
      const items = data.items || [];

      return {
        data: {
          ...data,
          items_detalle: items,
        },
        error: null,
      };
    },
  },

  // ==================== INVENTARIO ====================
  inventario: {
    // Obtener todos los productos
    getAll: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .order('nombre');
    },

    // Obtener productos visibles en tienda (para e-commerce)
    getVisiblesEnTienda: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('visible_en_tienda', true)
        .gt('stock_actual', 0)
        .order('nombre');
    },

    // Obtener por ID
    getById: async (id) => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener por categoría
    getByCategoria: async (categoria) => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('categoria', categoria)
        .order('nombre');
    },

    // Obtener productos con stock bajo
    getStockBajo: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .filter('stock_actual', 'lte', 'stock_minimo')
        .order('stock_actual');
    },

    // Obtener productos sin stock
    getSinStock: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('stock_actual', 0)
        .order('nombre');
    },

    // Buscar productos
    search: async (query) => {
      return await supabase
        .from('inventario')
        .select('*')
        .or(`nombre.ilike.%${query}%,categoria.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('nombre');
    },

    // Buscar por barcode
    getByBarcode: async (barcode) => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('barcode', barcode)
        .single();
    },

    // Crear producto
    create: async (data) => {
      return await supabase
        .from('inventario')
        .insert({
          nombre: data.nombre,
          categoria: data.categoria || null,
          stock_actual: data.stock_actual || 0,
          stock_minimo: data.stock_minimo || 5,
          precio_costo: data.precio_costo || null,
          costo: data.costo || null,
          precio_venta: data.precio_venta || null,
          es_consumible: data.es_consumible || false,
          barcode: data.barcode || null,
          imagen_url: data.imagen_url || null,
          imagenes_urls: data.imagenes_urls || [],
          fecha_vencimiento: data.fecha_vencimiento || null,
          ubicacion: data.ubicacion || null,
          notas: data.notas || null,
          visible_en_tienda: data.visible_en_tienda || false,
          descripcion_tienda: data.descripcion_tienda || null,
        })
        .select()
        .single();
    },

    // Actualizar producto
    update: async (id, data) => {
      return await supabase
        .from('inventario')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Actualizar stock
    updateStock: async (id, nuevoStock) => {
      return await supabase
        .from('inventario')
        .update({
          stock_actual: nuevoStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Incrementar stock
    incrementarStock: async (id, cantidad) => {
      const { data: producto } = await supabase
        .from('inventario')
        .select('stock_actual')
        .eq('id', id)
        .single();

      if (!producto) return { error: 'Producto no encontrado' };

      return await supabase
        .from('inventario')
        .update({
          stock_actual: producto.stock_actual + cantidad,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Decrementar stock
    decrementarStock: async (id, cantidad) => {
      const { data: producto } = await supabase
        .from('inventario')
        .select('stock_actual')
        .eq('id', id)
        .single();

      if (!producto) return { error: 'Producto no encontrado' };

      const nuevoStock = Math.max(0, producto.stock_actual - cantidad);

      return await supabase
        .from('inventario')
        .update({
          stock_actual: nuevoStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Cambiar visibilidad en tienda
    setVisibilidadTienda: async (id, visible) => {
      return await supabase
        .from('inventario')
        .update({
          visible_en_tienda: visible,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar producto
    delete: async (id) => {
      return await supabase
        .from('inventario')
        .delete()
        .eq('id', id);
    },

    // Obtener productos próximos a vencer
    getProximosAVencer: async (dias = 30) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + dias);

      return await supabase
        .from('inventario')
        .select('*')
        .not('fecha_vencimiento', 'is', null)
        .lte('fecha_vencimiento', fecha.toISOString().split('T')[0])
        .order('fecha_vencimiento');
    },

    // Obtener estadísticas de inventario
    getEstadisticas: async () => {
      const { data: productos } = await supabase
        .from('inventario')
        .select('*');

      if (!productos) return { error: 'Error al obtener productos' };

      const totalProductos = productos.length;
      const productosBajoStock = productos.filter(p => 
        p.stock_actual <= p.stock_minimo
      ).length;
      const productosSinStock = productos.filter(p => p.stock_actual === 0).length;
      const productosVisiblesTienda = productos.filter(p => p.visible_en_tienda).length;
      
      const valorInventario = productos.reduce((sum, p) => {
        const costo = Number(p.costo || p.precio_costo || 0);
        return sum + (costo * p.stock_actual);
      }, 0);

      const valorVentaPotencial = productos.reduce((sum, p) => {
        const precioVenta = Number(p.precio_venta || 0);
        return sum + (precioVenta * p.stock_actual);
      }, 0);

      return {
        data: {
          totalProductos,
          productosBajoStock,
          productosSinStock,
          productosVisiblesTienda,
          valorInventario: valorInventario.toFixed(2),
          valorVentaPotencial: valorVentaPotencial.toFixed(2),
          margenPotencial: (valorVentaPotencial - valorInventario).toFixed(2),
        },
        error: null,
      };
    },

    // Obtener productos por rango de precio
    getByPrecioVenta: async (min, max) => {
      return await supabase
        .from('inventario')
        .select('*')
        .gte('precio_venta', min)
        .lte('precio_venta', max)
        .order('precio_venta');
    },
  },

  // ==================== E-COMMERCE ORDERS ====================
  orders: {
    // Obtener todas las órdenes
    getAll: async () => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .order('created_at', { ascending: false });
    },

    // Obtener órdenes por estado
    getByStatus: async (status) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
    },

    // Obtener orden por ID
    getById: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener orden por tracking code
    getByTrackingCode: async (trackingCode) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('tracking_code', trackingCode)
        .single();
    },

    // Obtener órdenes de un cliente
    getByCliente: async (clientUserId) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
    },

    // Buscar órdenes (por nombre, teléfono o tracking code)
    search: async (query) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%,tracking_code.ilike.%${query}%`)
        .order('created_at', { ascending: false });
    },

    // Crear nueva orden
    create: async (data) => {
      return await supabase
        .from('ecommerce_orders')
        .insert({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          notes: data.notes || null,
          status: data.status || 'pending',
          total_amount: data.total_amount || 0,
          source: data.source || 'mobile-client',
          client_user_id: data.client_user_id || null,
          payment_method: data.payment_method || null,
          card_last4: data.card_last4 || null,
          fulfillment_type: data.fulfillment_type || null,
          delivery_address: data.delivery_address || null,
          delivery_reference: data.delivery_reference || null,
          checkout_snapshot: data.checkout_snapshot || null,
        })
        .select()
        .single();
    },

    // Actualizar orden
    update: async (id, data) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Actualizar estado de orden
    updateStatus: async (id, newStatus) => {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Actualizar timestamps según el estado
      switch (newStatus) {
        case 'confirmed':
          updates.confirmed_at = new Date().toISOString();
          break;
        case 'prepared':
          updates.prepared_at = new Date().toISOString();
          break;
        case 'delivered':
          updates.delivered_at = new Date().toISOString();
          break;
        case 'cancelled':
          updates.cancelled_at = new Date().toISOString();
          break;
      }

      return await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    },

    // Confirmar orden
    confirmar: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar como preparada
    marcarPreparada: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'prepared',
          prepared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar como entregada
    marcarEntregada: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Cancelar orden
    cancelar: async (id, reason) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar orden
    delete: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .delete()
        .eq('id', id);
    },

    // Obtener órdenes recientes (últimos 7 días)
    getRecientes: async (dias = 7) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .gte('created_at', fecha.toISOString())
        .order('created_at', { ascending: false });
    },

    // Obtener órdenes de hoy
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: false });
    },

    // Estadísticas de órdenes
    getEstadisticas: async (startDate = null, endDate = null) => {
      let query = supabase
        .from('ecommerce_orders')
        .select('status, total_amount, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const totalOrdenes = data.length;
      const ordenesEntregadas = data.filter(o => o.status === 'delivered').length;
      const ordenesCanceladas = data.filter(o => o.status === 'cancelled').length;
      const ventasTotales = data
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);
      const promedioOrden = totalOrdenes > 0 ? (ventasTotales / totalOrdenes).toFixed(2) : 0;

      return {
        data: {
          totalOrdenes,
          ordenesEntregadas,
          ordenesCanceladas,
          ventasTotales,
          promedioOrden,
          tasaEntrega: totalOrdenes > 0 ? (ordenesEntregadas / totalOrdenes * 100).toFixed(1) : 0,
        },
        error: null,
      };
    },
  },

  // ==================== METAS (OBJETIVOS) ====================
  metas: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getActivas: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByEmpleado: async (empleadoId) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('asignado_a', empleadoId)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByTipo: async (tipo) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('tipo', tipo)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByPeriodo: async (periodo) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('periodo', periodo)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getGlobales: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('alcance', 'global')
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getIndividuales: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('alcance', 'individual')
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const { data: nuevaMeta, error } = await supabase
        .from('metas')
        .insert([data])
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data: nuevaMeta, error };
    },

    update: async (id, data) => {
      const { data: metaActualizada, error } = await supabase
        .from('metas')
        .update(data)
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data: metaActualizada, error };
    },

    updateProgreso: async (id, nuevoActual) => {
      const { data, error } = await supabase
        .from('metas')
        .update({ actual: nuevoActual })
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data, error };
    },

    toggleActivo: async (id) => {
      const { data: meta } = await supabase
        .from('metas')
        .select('activo')
        .eq('id', id)
        .single();

      if (!meta) return { data: null, error: { message: 'Meta no encontrada' } };

      const { data, error } = await supabase
        .from('metas')
        .update({ activo: !meta.activo })
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', id);
      return { error };
    },

    getProgreso: (meta) => {
      if (!meta || !meta.valor_objetivo || meta.valor_objetivo === 0) return 0;
      const progreso = (Number(meta.actual || 0) / Number(meta.valor_objetivo)) * 100;
      return Math.min(Math.round(progreso), 100);
    },

    calcularProgresoEmpleado: async (empleadoId) => {
      const { data: metas } = await supabase
        .from('metas')
        .select('*')
        .eq('asignado_a', empleadoId)
        .eq('activo', true);

      if (!metas || metas.length === 0) {
        return { data: { progresoPromedio: 0, metasActivas: 0, metasCompletadas: 0 }, error: null };
      }

      let totalProgreso = 0;
      let metasCompletadas = 0;

      metas.forEach(meta => {
        const progreso = db.metas.getProgreso(meta);
        totalProgreso += progreso;
        if (progreso >= 100) metasCompletadas++;
      });

      return {
        data: {
          progresoPromedio: Math.round(totalProgreso / metas.length),
          metasActivas: metas.length,
          metasCompletadas,
        },
        error: null,
      };
    },

    getMetasVencidas: async () => {
      const hoy = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .lt('fecha_fin', hoy)
        .order('fecha_fin', { ascending: true });
      return { data, error };
    },

    getMetasProximasAVencer: async (dias = 7) => {
      const hoy = new Date();
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + dias);

      const hoyISO = hoy.toISOString().split('T')[0];
      const futuroISO = futuro.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .gte('fecha_fin', hoyISO)
        .lte('fecha_fin', futuroISO)
        .order('fecha_fin', { ascending: true });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: todasLasMetas } = await supabase
        .from('metas')
        .select('*');

      const metasActivas = todasLasMetas?.filter(m => m.activo) || [];
      const metasGlobales = metasActivas.filter(m => m.alcance === 'global');
      const metasIndividuales = metasActivas.filter(m => m.alcance === 'individual');

      let metasCompletadas = 0;
      let progresoPromedio = 0;

      metasActivas.forEach(meta => {
        const progreso = db.metas.getProgreso(meta);
        progresoPromedio += progreso;
        if (progreso >= 100) metasCompletadas++;
      });

      return {
        data: {
          totalMetas: todasLasMetas?.length || 0,
          metasActivas: metasActivas.length,
          metasGlobales: metasGlobales.length,
          metasIndividuales: metasIndividuales.length,
          metasCompletadas,
          progresoPromedio: metasActivas.length > 0 ? Math.round(progresoPromedio / metasActivas.length) : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MARKETING POSTS ====================
  marketingPosts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getPublished: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      return { data, error };
    },

    getDrafts: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByVisibility: async (visibility) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('visibility', visibility)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByContentType: async (contentType) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAudience: async (audience) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('audience', audience)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAuthor: async (authorId) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getWithMedia: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .or(`title.ilike.%${query}%,body.ilike.%${query}%,author_name.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const postData = {
        ...data,
        created_at: new Date().toISOString(),
      };

      if (data.status === 'published' && !data.published_at) {
        postData.published_at = new Date().toISOString();
      }

      const { data: newPost, error } = await supabase
        .from('marketing_posts')
        .insert([postData])
        .select()
        .single();
      return { data: newPost, error };
    },

    update: async (id, data) => {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedPost, error } = await supabase
        .from('marketing_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return { data: updatedPost, error };
    },

    publish: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    unpublish: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    archive: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_posts')
        .delete()
        .eq('id', id);
      return { error };
    },

    incrementViews: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('views_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    incrementReactions: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('reactions_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ reactions_count: (post.reactions_count || 0) + 1 })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    decrementReactions: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('reactions_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const newCount = Math.max(0, (post.reactions_count || 0) - 1);

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ reactions_count: newCount })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    getMostViewed: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getMostReacted: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('reactions_count', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allPosts } = await supabase
        .from('marketing_posts')
        .select('*');

      const published = allPosts?.filter(p => p.status === 'published') || [];
      const drafts = allPosts?.filter(p => p.status === 'draft') || [];
      const archived = allPosts?.filter(p => p.status === 'archived') || [];

      const totalViews = allPosts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalReactions = allPosts?.reduce((sum, p) => sum + (p.reactions_count || 0), 0) || 0;

      const withMedia = allPosts?.filter(p => p.media_url) || [];

      return {
        data: {
          totalPosts: allPosts?.length || 0,
          published: published.length,
          drafts: drafts.length,
          archived: archived.length,
          totalViews,
          totalReactions,
          withMedia: withMedia.length,
          avgViewsPerPost: allPosts?.length > 0 ? Math.round(totalViews / allPosts.length) : 0,
          avgReactionsPerPost: allPosts?.length > 0 ? Math.round(totalReactions / allPosts.length) : 0,
        },
        error: null,
      };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      return { data, error };
    },
  },

  // ==================== MARKETING POST LIKES ====================
  marketingPostLikes: {
    getLikesByPost: async (postId) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getLikesCount: async (postId) => {
      const { count, error } = await supabase
        .from('marketing_post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return { data: count || 0, error };
    },

    hasLiked: async (postId, clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('client_key', clientKey)
        .maybeSingle();
      return { data: !!data, error };
    },

    addLike: async (postId, clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .insert([{ post_id: postId, client_key: clientKey }])
        .select()
        .single();

      if (!error) {
        await db.marketingPosts.incrementReactions(postId);
      }

      return { data, error };
    },

    removeLike: async (postId, clientKey) => {
      const { error } = await supabase
        .from('marketing_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('client_key', clientKey);

      if (!error) {
        await db.marketingPosts.decrementReactions(postId);
      }

      return { error };
    },

    toggleLike: async (postId, clientKey) => {
      const { data: hasLiked } = await db.marketingPostLikes.hasLiked(postId, clientKey);

      if (hasLiked) {
        const { error } = await db.marketingPostLikes.removeLike(postId, clientKey);
        return { data: { liked: false }, error };
      } else {
        const { data, error } = await db.marketingPostLikes.addLike(postId, clientKey);
        return { data: { liked: true, like: data }, error };
      }
    },

    getPostsLikedByClient: async (clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('post_id, created_at, marketing_posts(*)')
        .eq('client_key', clientKey)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getLikesWithPagination: async (postId, offset = 0, limit = 20) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    deleteAllByPost: async (postId) => {
      const { error } = await supabase
        .from('marketing_post_likes')
        .delete()
        .eq('post_id', postId);
      return { error };
    },

    getTopLikedPosts: async (limit = 10, startDate = null, endDate = null) => {
      let query = supabase
        .from('marketing_post_likes')
        .select('post_id, marketing_posts(*)');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const likesCount = {};
      data?.forEach(like => {
        if (like.post_id) {
          likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
        }
      });

      const topPosts = Object.entries(likesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([postId, count]) => ({
          post_id: postId,
          likes_count: count,
          post: data.find(d => d.post_id === parseInt(postId))?.marketing_posts,
        }));

      return { data: topPosts, error: null };
    },

    getRecentLikes: async (postId, limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allLikes } = await supabase
        .from('marketing_post_likes')
        .select('*');

      const uniquePosts = new Set(allLikes?.map(like => like.post_id) || []);
      const uniqueClients = new Set(allLikes?.map(like => like.client_key) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const likesToday = allLikes?.filter(like => 
        new Date(like.created_at) >= today
      ) || [];

      return {
        data: {
          totalLikes: allLikes?.length || 0,
          postsConLikes: uniquePosts.size,
          clientesActivos: uniqueClients.size,
          likesHoy: likesToday.length,
          promedioLikesPorPost: uniquePosts.size > 0 
            ? Math.round((allLikes?.length || 0) / uniquePosts.size) 
            : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MARKETING DIRECT MESSAGES ====================
  marketingDirectMessages: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getPendingSync: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'pending_sync')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getDelivered: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      return { data, error };
    },

    getByClient: async (clientId) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByCreator: async (creatorId) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByContentType: async (contentType) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getWithMedia: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .or(`content.ilike.%${query}%,client_name.ilike.%${query}%,client_phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const messageData = {
        ...data,
        created_at: new Date().toISOString(),
      };

      const { data: newMessage, error } = await supabase
        .from('marketing_direct_messages')
        .insert([messageData])
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data: newMessage, error };
    },

    createBulk: async (messages) => {
      const messagesData = messages.map(msg => ({
        ...msg,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .insert(messagesData)
        .select('*, cliente:clientes(id, nombre, telefono, email)');
      return { data, error };
    },

    update: async (id, data) => {
      const { data: updatedMessage, error } = await supabase
        .from('marketing_direct_messages')
        .update(data)
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data: updatedMessage, error };
    },

    markAsDelivered: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data, error };
    },

    markAsFailed: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({ status: 'failed' })
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data, error };
    },

    markBulkAsDelivered: async (ids) => {
      const deliveredAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({
          status: 'delivered',
          delivered_at: deliveredAt,
        })
        .in('id', ids)
        .select('*, cliente:clientes(id, nombre, telefono, email)');
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_direct_messages')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByClient: async (clientId) => {
      const { error } = await supabase
        .from('marketing_direct_messages')
        .delete()
        .eq('client_id', clientId);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getDeliveredInRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'delivered')
        .gte('delivered_at', startDate)
        .lte('delivered_at', endDate)
        .order('delivered_at', { ascending: false });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allMessages } = await supabase
        .from('marketing_direct_messages')
        .select('*');

      const pending = allMessages?.filter(m => m.status === 'pending_sync') || [];
      const delivered = allMessages?.filter(m => m.status === 'delivered') || [];
      const failed = allMessages?.filter(m => m.status === 'failed') || [];

      const uniqueClients = new Set(allMessages?.map(m => m.client_id).filter(Boolean) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesHoy = allMessages?.filter(m => 
        new Date(m.created_at) >= today
      ) || [];

      const deliveredHoy = delivered.filter(m => 
        m.delivered_at && new Date(m.delivered_at) >= today
      );

      const withMedia = allMessages?.filter(m => m.media_url) || [];

      return {
        data: {
          totalMensajes: allMessages?.length || 0,
          pending: pending.length,
          delivered: delivered.length,
          failed: failed.length,
          clientesUnicos: uniqueClients.size,
          mensajesHoy: messagesHoy.length,
          entregadosHoy: deliveredHoy.length,
          conMedia: withMedia.length,
          tasaEntrega: allMessages?.length > 0 
            ? Math.round((delivered.length / allMessages.length) * 100) 
            : 0,
        },
        error: null,
      };
    },

    getCampaignStats: async (startDate, endDate, creatorId = null) => {
      let query = supabase
        .from('marketing_direct_messages')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (creatorId) {
        query = query.eq('created_by', creatorId);
      }

      const { data: messages } = await query;

      const delivered = messages?.filter(m => m.status === 'delivered') || [];
      const failed = messages?.filter(m => m.status === 'failed') || [];
      const pending = messages?.filter(m => m.status === 'pending_sync') || [];
      const uniqueClients = new Set(messages?.map(m => m.client_id).filter(Boolean) || []);

      return {
        data: {
          totalEnviados: messages?.length || 0,
          entregados: delivered.length,
          fallidos: failed.length,
          pendientes: pending.length,
          clientesAlcanzados: uniqueClients.size,
          tasaExito: messages?.length > 0 
            ? Math.round((delivered.length / messages.length) * 100) 
            : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MARKETING COMMENTS ====================
  marketingComments: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByPost: async (postId) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAuthor: async (authorId) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByModerationStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getVisible: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getVisibleByPost: async (postId) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getPendingModeration: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getHidden: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'hidden')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    countByPost: async (postId) => {
      const { count, error } = await supabase
        .from('marketing_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('moderation_status', 'visible');
      return { data: count || 0, error };
    },

    create: async (data) => {
      const commentData = {
        ...data,
        created_at: new Date().toISOString(),
      };

      const { data: newComment, error } = await supabase
        .from('marketing_comments')
        .insert([commentData])
        .select()
        .single();
      return { data: newComment, error };
    },

    update: async (id, data) => {
      const { data: updatedComment, error } = await supabase
        .from('marketing_comments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      return { data: updatedComment, error };
    },

    moderate: async (id, status) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .update({ moderation_status: status })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    approve: async (id) => {
      return await db.marketingComments.moderate(id, 'visible');
    },

    hide: async (id) => {
      return await db.marketingComments.moderate(id, 'hidden');
    },

    markPending: async (id) => {
      return await db.marketingComments.moderate(id, 'pending');
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByPost: async (postId) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('post_id', postId);
      return { error };
    },

    deleteByAuthor: async (authorId) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('author_id', authorId);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getRecentByPost: async (postId, limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getWithPagination: async (offset = 0, limit = 20) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allComments } = await supabase
        .from('marketing_comments')
        .select('*');

      const visible = allComments?.filter(c => c.moderation_status === 'visible') || [];
      const hidden = allComments?.filter(c => c.moderation_status === 'hidden') || [];
      const pending = allComments?.filter(c => c.moderation_status === 'pending') || [];

      const uniquePosts = new Set(allComments?.map(c => c.post_id) || []);
      const uniqueAuthors = new Set(allComments?.map(c => c.author_id).filter(Boolean) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const commentsHoy = allComments?.filter(c => 
        new Date(c.created_at) >= today
      ) || [];

      return {
        data: {
          totalComentarios: allComments?.length || 0,
          visible: visible.length,
          hidden: hidden.length,
          pending: pending.length,
          postsConComentarios: uniquePosts.size,
          autoresUnicos: uniqueAuthors.size,
          comentariosHoy: commentsHoy.length,
          promedioComentariosPorPost: uniquePosts.size > 0 
            ? Math.round((allComments?.length || 0) / uniquePosts.size) 
            : 0,
        },
        error: null,
      };
    },

    getTopCommentedPosts: async (limit = 10) => {
      const { data: allComments } = await supabase
        .from('marketing_comments')
        .select('post_id, marketing_posts(*)');

      if (!allComments) return { data: [], error: null };

      const commentsCount = {};
      allComments.forEach(comment => {
        if (comment.post_id) {
          commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
        }
      });

      const topPosts = Object.entries(commentsCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([postId, count]) => ({
          post_id: postId,
          comments_count: count,
          post: allComments.find(c => c.post_id === parseInt(postId))?.marketing_posts,
        }));

      return { data: topPosts, error: null };
    },
  },

  // ==================== ECOMMERCE ORDER ITEMS ====================
  ecommerceOrderItems: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status), product:inventario(id, nombre, imagen_url)')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status), product:inventario(id, nombre, imagen_url)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByOrder: async (orderId) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, product:inventario(id, nombre, imagen_url, stock_actual)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      return { data, error };
    },

    getByProduct: async (productId) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status, customer_name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const itemData = {
        ...data,
        line_total: Number(data.unit_price) * Number(data.qty),
        created_at: new Date().toISOString(),
      };

      const { data: newItem, error } = await supabase
        .from('ecommerce_order_items')
        .insert([itemData])
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data: newItem, error };
    },

    createBulk: async (items) => {
      const itemsData = items.map(item => ({
        ...item,
        line_total: Number(item.unit_price) * Number(item.qty),
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .insert(itemsData)
        .select('*, product:inventario(id, nombre, imagen_url)');
      return { data, error };
    },

    update: async (id, data) => {
      const updateData = { ...data };
      
      if (data.unit_price !== undefined || data.qty !== undefined) {
        const { data: currentItem } = await supabase
          .from('ecommerce_order_items')
          .select('unit_price, qty')
          .eq('id', id)
          .single();

        if (currentItem) {
          const price = data.unit_price !== undefined ? Number(data.unit_price) : Number(currentItem.unit_price);
          const quantity = data.qty !== undefined ? Number(data.qty) : Number(currentItem.qty);
          updateData.line_total = price * quantity;
        }
      }

      const { data: updatedItem, error } = await supabase
        .from('ecommerce_order_items')
        .update(updateData)
        .eq('id', id)
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data: updatedItem, error };
    },

    updateQuantity: async (id, qty) => {
      const { data: item } = await supabase
        .from('ecommerce_order_items')
        .select('unit_price')
        .eq('id', id)
        .single();

      if (!item) return { data: null, error: { message: 'Item no encontrado' } };

      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .update({
          qty,
          line_total: Number(item.unit_price) * Number(qty),
        })
        .eq('id', id)
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('ecommerce_order_items')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByOrder: async (orderId) => {
      const { error } = await supabase
        .from('ecommerce_order_items')
        .delete()
        .eq('order_id', orderId);
      return { error };
    },

    getOrderTotal: async (orderId) => {
      const { data: items } = await supabase
        .from('ecommerce_order_items')
        .select('line_total')
        .eq('order_id', orderId);

      const total = items?.reduce((sum, item) => sum + Number(item.line_total), 0) || 0;
      return { data: total, error: null };
    },

    getOrderSummary: async (orderId) => {
      const { data: items } = await supabase
        .from('ecommerce_order_items')
        .select('qty, line_total')
        .eq('order_id', orderId);

      if (!items) return { data: null, error: { message: 'No items found' } };

      const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
      const totalAmount = items.reduce((sum, item) => sum + Number(item.line_total), 0);

      return {
        data: {
          itemsCount: items.length,
          totalUnits: totalItems,
          totalAmount: totalAmount.toFixed(2),
        },
        error: null,
      };
    },

    getTopProducts: async (limit = 10, startDate = null, endDate = null) => {
      let query = supabase
        .from('ecommerce_order_items')
        .select('product_id, product_name, qty, inventario(imagen_url)');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: items } = await query;

      if (!items) return { data: [], error: null };

      const productSales = {};
      items.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            total_sold: 0,
            imagen_url: item.inventario?.imagen_url,
          };
        }
        productSales[item.product_id].total_sold += item.qty;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, limit);

      return { data: topProducts, error: null };
    },

    getEstadisticas: async () => {
      const { data: allItems } = await supabase
        .from('ecommerce_order_items')
        .select('*');

      const totalItems = allItems?.length || 0;
      const totalUnidades = allItems?.reduce((sum, item) => sum + item.qty, 0) || 0;
      const totalVentas = allItems?.reduce((sum, item) => sum + Number(item.line_total), 0) || 0;

      const uniqueProducts = new Set(allItems?.map(item => item.product_id) || []);
      const uniqueOrders = new Set(allItems?.map(item => item.order_id) || []);

      const avgUnitsPerOrder = uniqueOrders.size > 0 ? (totalUnidades / uniqueOrders.size).toFixed(2) : 0;
      const avgAmountPerOrder = uniqueOrders.size > 0 ? (totalVentas / uniqueOrders.size).toFixed(2) : 0;

      return {
        data: {
          totalItems,
          totalUnidades,
          totalVentas: totalVentas.toFixed(2),
          productosUnicos: uniqueProducts.size,
          ordenesConItems: uniqueOrders.size,
          promedioUnidadesPorOrden: avgUnitsPerOrder,
          promedioMontoPorOrden: avgAmountPerOrder,
        },
        error: null,
      };
    },
  },

  // ==================== INCIDENTES ====================
  incidentes: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByFolio: async (folio) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('folio', folio)
        .single();
      return { data, error };
    },

    getByEstado: async (estado) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', estado)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getRegistrados: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'registrado')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getEnProceso: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'en_proceso')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getResueltos: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'resuelto')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByTipo: async (tipo) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('tipo_incidente', tipo)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByEmpleado: async (empleadoNombre) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('empleado_nombre', empleadoNombre)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCliente: async (clienteNombre) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('cliente_nombre', clienteNombre)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCreador: async (creadorId) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('creado_por', creadorId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getConReembolso: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('aplica_reembolso', true)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getConCompensacion: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('aplica_compensacion', true)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .or(`folio.ilike.%${query}%,tipo_incidente.ilike.%${query}%,empleado_nombre.ilike.%${query}%,cliente_nombre.ilike.%${query}%,descripcion.ilike.%${query}%`)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const incidenteData = {
        ...data,
        fecha: data.fecha || new Date().toISOString(),
      };

      const { data: nuevoIncidente, error } = await supabase
        .from('incidentes')
        .insert([incidenteData])
        .select()
        .single();
      return { data: nuevoIncidente, error };
    },

    update: async (id, data) => {
      const { data: incidenteActualizado, error } = await supabase
        .from('incidentes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      return { data: incidenteActualizado, error };
    },

    updateEstado: async (id, estado) => {
      const { data, error } = await supabase
        .from('incidentes')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    marcarEnProceso: async (id) => {
      return await db.incidentes.updateEstado(id, 'en_proceso');
    },

    marcarResuelto: async (id) => {
      return await db.incidentes.updateEstado(id, 'resuelto');
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('incidentes')
        .delete()
        .eq('id', id);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allIncidentes } = await supabase
        .from('incidentes')
        .select('*');

      const registrados = allIncidentes?.filter(i => i.estado === 'registrado') || [];
      const enProceso = allIncidentes?.filter(i => i.estado === 'en_proceso') || [];
      const resueltos = allIncidentes?.filter(i => i.estado === 'resuelto') || [];

      const conReembolso = allIncidentes?.filter(i => i.aplica_reembolso) || [];
      const conCompensacion = allIncidentes?.filter(i => i.aplica_compensacion) || [];

      const totalPerdidas = allIncidentes?.reduce((sum, i) => sum + Number(i.monto_perdida || 0), 0) || 0;
      const totalCostos = allIncidentes?.reduce((sum, i) => sum + Number(i.costo_estimado || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const incidentesHoy = allIncidentes?.filter(i => 
        new Date(i.fecha) >= today
      ) || [];

      const tiposCount = {};
      allIncidentes?.forEach(i => {
        if (i.tipo_incidente) {
          tiposCount[i.tipo_incidente] = (tiposCount[i.tipo_incidente] || 0) + 1;
        }
      });

      const tipoMasFrecuente = Object.entries(tiposCount)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        data: {
          totalIncidentes: allIncidentes?.length || 0,
          registrados: registrados.length,
          enProceso: enProceso.length,
          resueltos: resueltos.length,
          conReembolso: conReembolso.length,
          conCompensacion: conCompensacion.length,
          totalPerdidas: totalPerdidas.toFixed(2),
          totalCostos: totalCostos.toFixed(2),
          incidentesHoy: incidentesHoy.length,
          tipoMasFrecuente: tipoMasFrecuente ? tipoMasFrecuente[0] : null,
          frecuenciaMasFrecuente: tipoMasFrecuente ? tipoMasFrecuente[1] : 0,
          tasaResolucion: allIncidentes?.length > 0 
            ? Math.round((resueltos.length / allIncidentes.length) * 100) 
            : 0,
        },
        error: null,
      };
    },

    getEstadisticasPorTipo: async () => {
      const { data: allIncidentes } = await supabase
        .from('incidentes')
        .select('*');

      const porTipo = {};
      allIncidentes?.forEach(i => {
        if (!i.tipo_incidente) return;
        
        if (!porTipo[i.tipo_incidente]) {
          porTipo[i.tipo_incidente] = {
            tipo: i.tipo_incidente,
            cantidad: 0,
            perdidas: 0,
            costos: 0,
            resueltos: 0,
          };
        }

        porTipo[i.tipo_incidente].cantidad++;
        porTipo[i.tipo_incidente].perdidas += Number(i.monto_perdida || 0);
        porTipo[i.tipo_incidente].costos += Number(i.costo_estimado || 0);
        if (i.estado === 'resuelto') {
          porTipo[i.tipo_incidente].resueltos++;
        }
      });

      const resultado = Object.values(porTipo).map(tipo => ({
        ...tipo,
        perdidas: tipo.perdidas.toFixed(2),
        costos: tipo.costos.toFixed(2),
        tasaResolucion: tipo.cantidad > 0 
          ? Math.round((tipo.resueltos / tipo.cantidad) * 100) 
          : 0,
      }));

      return { data: resultado, error: null };
    },
  },

  // ==================== ESTADÍSTICAS ====================
  stats: {
    // Resumen del dashboard
    getDashboard: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Citas de hoy
      const { count: citasHoy } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_hora', today.toISOString())
        .lt('fecha_hora', tomorrow.toISOString());

      // Total clientes
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      // Total empleados activos
      const { count: totalEmpleados } = await supabase
        .from('empleados')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Citas pendientes
      const { count: citasPendientes } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .gte('fecha_hora', today.toISOString());

      // Ingresos del mes actual
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const { data: citasMes } = await supabase
        .from('citas')
        .select('precio')
        .eq('venta_generada', true)
        .gte('fecha_hora', startOfMonth.toISOString())
        .lte('fecha_hora', endOfMonth.toISOString());

      const ingresosMes = citasMes?.reduce((sum, cita) => sum + Number(cita.precio), 0) || 0;

      // Órdenes de e-commerce de hoy
      const { count: ordenesHoy } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      // Órdenes pendientes
      const { count: ordenesPendientes } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'prepared']);

      // Ventas e-commerce del mes
      const { data: ordenesMes } = await supabase
        .from('ecommerce_orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const ventasEcommerceMes = ordenesMes?.reduce((sum, orden) => sum + Number(orden.total_amount), 0) || 0;

      // Estadísticas de inventario
      const statsInventario = await db.inventario.getEstadisticas();

      // Ventas del mes
      const { data: statsVentas } = await db.ventas.getEstadisticas(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );

      // Ventas de hoy
      const { data: ventasHoy } = await db.ventas.getHoy();
      const totalVentasHoy = ventasHoy?.reduce((sum, v) => sum + Number(v.total || v.monto || 0), 0) || 0;

      // Estadísticas de usuarios del sistema
      const { data: statsProfiles } = await db.profiles.getEstadisticas();

      // Estadísticas de metas
      const { data: statsMetas } = await db.metas.getEstadisticas();

      // Estadísticas de marketing posts
      const { data: statsMarketing } = await db.marketingPosts.getEstadisticas();

      // Estadísticas de marketing post likes
      const { data: statsMarketingLikes } = await db.marketingPostLikes.getEstadisticas();

      // Estadísticas de marketing direct messages
      const { data: statsDirectMessages } = await db.marketingDirectMessages.getEstadisticas();

      // Estadísticas de marketing comments
      const { data: statsComments } = await db.marketingComments.getEstadisticas();

      // Estadísticas de incidentes
      const { data: statsIncidentes } = await db.incidentes.getEstadisticas();

      // Estadísticas de ecommerce order items
      const { data: statsOrderItems } = await db.ecommerceOrderItems.getEstadisticas();

      return {
        citasHoy: citasHoy || 0,
        totalClientes: totalClientes || 0,
        totalEmpleados: totalEmpleados || 0,
        citasPendientes: citasPendientes || 0,
        ingresosMes: ingresosMes,
        ordenesHoy: ordenesHoy || 0,
        ordenesPendientes: ordenesPendientes || 0,
        ventasEcommerceMes: ventasEcommerceMes,
        // Inventario
        totalProductos: statsInventario.data?.totalProductos || 0,
        productosBajoStock: statsInventario.data?.productosBajoStock || 0,
        productosSinStock: statsInventario.data?.productosSinStock || 0,
        valorInventario: statsInventario.data?.valorInventario || 0,
        // Ventas
        ventasHoy: ventasHoy?.length || 0,
        totalVentasHoy: totalVentasHoy.toFixed(2),
        ventasMes: statsVentas?.totalVentas || 0,
        ventasTotalesMes: statsVentas?.ventasTotales || 0,
        // Usuarios del Sistema
        totalUsuarios: statsProfiles?.totalUsuarios || 0,
        adminsCount: statsProfiles?.admins || 0,
        staffCount: statsProfiles?.staff || 0,
        // Metas y Objetivos
        totalMetas: statsMetas?.totalMetas || 0,
        metasActivas: statsMetas?.metasActivas || 0,
        metasCompletadas: statsMetas?.metasCompletadas || 0,
        progresoPromedioMetas: statsMetas?.progresoPromedio || 0,
        // Marketing Posts
        totalPosts: statsMarketing?.totalPosts || 0,
        postsPublicados: statsMarketing?.published || 0,
        postsBorradores: statsMarketing?.drafts || 0,
        totalVistasMarketing: statsMarketing?.totalViews || 0,
        totalReacciones: statsMarketing?.totalReactions || 0,
        // Marketing Likes
        totalLikes: statsMarketingLikes?.totalLikes || 0,
        postsConLikes: statsMarketingLikes?.postsConLikes || 0,
        clientesActivosMarketing: statsMarketingLikes?.clientesActivos || 0,
        likesHoy: statsMarketingLikes?.likesHoy || 0,
        // Marketing Direct Messages
        totalMensajesDirectos: statsDirectMessages?.totalMensajes || 0,
        mensajesPendientes: statsDirectMessages?.pending || 0,
        mensajesEntregados: statsDirectMessages?.delivered || 0,
        mensajesFallidos: statsDirectMessages?.failed || 0,
        mensajesHoy: statsDirectMessages?.mensajesHoy || 0,
        tasaEntregaMensajes: statsDirectMessages?.tasaEntrega || 0,
        // Marketing Comments
        totalComentarios: statsComments?.totalComentarios || 0,
        comentariosVisibles: statsComments?.visible || 0,
        comentariosOcultos: statsComments?.hidden || 0,
        comentariosPendientes: statsComments?.pending || 0,
        comentariosHoy: statsComments?.comentariosHoy || 0,
        postsConComentarios: statsComments?.postsConComentarios || 0,
        // Incidentes
        totalIncidentes: statsIncidentes?.totalIncidentes || 0,
        incidentesRegistrados: statsIncidentes?.registrados || 0,
        incidentesEnProceso: statsIncidentes?.enProceso || 0,
        incidentesResueltos: statsIncidentes?.resueltos || 0,
        incidentesHoy: statsIncidentes?.incidentesHoy || 0,
        totalPerdidasIncidentes: statsIncidentes?.totalPerdidas || 0,
        tasaResolucionIncidentes: statsIncidentes?.tasaResolucion || 0,
        // E-commerce Order Items
        totalOrderItems: statsOrderItems?.totalItems || 0,
        totalUnidadesVendidas: statsOrderItems?.totalUnidades || 0,
        totalVentasOrderItems: statsOrderItems?.totalVentas || 0,
        productosUnicosVendidos: statsOrderItems?.productosUnicos || 0,
        promedioUnidadesPorOrden: statsOrderItems?.promedioUnidadesPorOrden || 0,
        // Total General
        ingresosTotalesMes: ingresosMes + ventasEcommerceMes + Number(statsVentas?.ventasTotales || 0),
      };
    },

    // Estadísticas por período
    getPorPeriodo: async (startDate, endDate) => {
      const { data: citas } = await supabase
        .from('citas')
        .select('precio, estado, venta_generada, fecha_hora')
        .gte('fecha_hora', startDate)
        .lte('fecha_hora', endDate);

      const totalCitas = citas?.length || 0;
      const citasCompletadas = citas?.filter(c => c.estado === 'completada').length || 0;
      const ingresos = citas?.filter(c => c.venta_generada)
        .reduce((sum, c) => sum + Number(c.precio), 0) || 0;

      return {
        totalCitas,
        citasCompletadas,
        ingresos,
        promedioPorCita: totalCitas > 0 ? (ingresos / totalCitas).toFixed(2) : 0,
      };
    },
  },
};

// Helpers para verificar conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

export default supabase;
