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

      return {
        citasHoy: citasHoy || 0,
        totalClientes: totalClientes || 0,
        totalEmpleados: totalEmpleados || 0,
        citasPendientes: citasPendientes || 0,
        ingresosMes: ingresosMes,
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
