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
 * Una vez que me proporciones las credenciales, mapearé aquí las funciones
 * a tus tablas y procedimientos existentes.
 */

// Ejemplo de estructura que adaptaremos:
export const db = {
  // Autenticación
  auth: {
    signIn: async (email, password) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    signUp: async (email, password, metadata) => {
      return await supabase.auth.signUp({ email, password, options: { data: metadata } });
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
    getUser: async () => {
      return await supabase.auth.getUser();
    },
  },

  // Aquí mapearemos tus tablas existentes
  // Ejemplo: citas, clientes, servicios, inventario, etc.
  
  // appointments: {
  //   getAll: async () => { ... },
  //   create: async (data) => { ... },
  //   update: async (id, data) => { ... },
  // },
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
