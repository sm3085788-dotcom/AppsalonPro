import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check, X, Calendar, Package, AlertCircle, Users, DollarSign } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function NotificationsScreen() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('todas'); // 'todas', 'no_leidas', 'leidas'
  const [empleadoId, setEmpleadoId] = useState(null); // En producción, obtener del usuario actual
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // TODO: Obtener empleadoId del usuario actual logueado
    // Por ahora usamos un ID de ejemplo
    loadEmpleadoId();
  }, []);

  useEffect(() => {
    if (empleadoId) {
      loadNotificaciones();
      loadStats();
      
      // Suscribirse a cambios en tiempo real
      const subscription = db.notificaciones.subscribeToEmpleado(
        empleadoId,
        (payload) => {
          console.log('Nueva notificación:', payload);
          loadNotificaciones();
          loadStats();
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [empleadoId, filter]);

  const loadEmpleadoId = async () => {
    // TODO: Obtener del contexto de autenticación
    // Por ahora simulamos obtener el primer empleado
    const { data } = await db.empleados.getAll();
    if (data && data.length > 0) {
      setEmpleadoId(data[0].id);
    }
  };

  const loadNotificaciones = async () => {
    if (!empleadoId) return;

    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'no_leidas':
          result = await db.notificaciones.getNoLeidasByEmpleado(empleadoId);
          break;
        case 'leidas':
          result = await db.notificaciones.getByEmpleado(empleadoId);
          result.data = result.data?.filter(n => n.leida);
          break;
        default:
          result = await db.notificaciones.getByEmpleado(empleadoId);
      }

      if (result.error) {
        console.error('Error al cargar notificaciones:', result.error);
        return;
      }

      setNotificaciones(result.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    if (!empleadoId) return;
    const { data } = await db.notificaciones.getEstadisticas(empleadoId);
    if (data) setStats(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotificaciones();
    loadStats();
  };

  const handleMarcarLeida = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        await db.notificaciones.marcarNoLeida(id);
      } else {
        await db.notificaciones.marcarLeida(id);
      }
      loadNotificaciones();
      loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    if (!empleadoId) return;
    
    try {
      await db.notificaciones.marcarTodasLeidas(empleadoId);
      loadNotificaciones();
      loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await db.notificaciones.delete(id);
      loadNotificaciones();
      loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'cita': return Calendar;
      case 'inventario': return Package;
      case 'venta': return DollarSign;
      case 'cliente': return Users;
      case 'alerta': return AlertCircle;
      default: return Bell;
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'cita': return '#2196F3';
      case 'inventario': return '#FFA726';
      case 'venta': return '#4CAF50';
      case 'cliente': return '#9C27B0';
      case 'alerta': return '#f44336';
      default: return '#C0C0C0';
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return notifDate.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando notificaciones...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
              Notificaciones
            </Text>
            {stats && (
              <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
                {stats.noLeidas} sin leer de {stats.total}
              </Text>
            )}
          </View>

          {/* Marcar todas como leídas */}
          {stats && stats.noLeidas > 0 && (
            <TouchableOpacity 
              onPress={handleMarcarTodasLeidas}
              className="px-3 py-2 rounded-full bg-[#D4AF37]"
            >
              <Text className="text-white text-xs font-light">
                Marcar todas leídas
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          <TouchableOpacity 
            onPress={() => setFilter('todas')}
            className={`px-4 py-2 rounded-full ${filter === 'todas' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'todas' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Todas {stats && `(${stats.total})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('no_leidas')}
            className={`px-4 py-2 rounded-full ${filter === 'no_leidas' ? 'bg-[#2196F3]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'no_leidas' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Sin leer {stats && stats.noLeidas > 0 && `(${stats.noLeidas})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('leidas')}
            className={`px-4 py-2 rounded-full ${filter === 'leidas' ? 'bg-[#4CAF50]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'leidas' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Leídas {stats && `(${stats.leidas})`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Notificaciones */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {notificaciones.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Bell size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {filter === 'no_leidas' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {notificaciones.map((notif) => {
              const TipoIcon = getTipoIcon(notif.tipo);
              
              return (
                <TouchableOpacity
                  key={notif.id}
                  className={`rounded-2xl p-4 shadow-sm ${
                    notif.leida ? 'bg-white' : 'bg-[#D4AF37]/10 border border-[#D4AF37]/20'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    {/* Icono de tipo */}
                    <View 
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: getTipoColor(notif.tipo) + '20' }}
                    >
                      <TipoIcon size={20} color={getTipoColor(notif.tipo)} />
                    </View>

                    {/* Contenido */}
                    <View className="flex-1">
                      {/* Título y tiempo */}
                      <View className="flex-row justify-between items-start mb-1">
                        <Text className={`text-base font-light flex-1 ${
                          notif.leida ? 'text-[#2C2C2C]' : 'text-[#2C2C2C] font-normal'
                        }`}>
                          {notif.titulo}
                        </Text>
                        <Text className="text-xs text-[#C0C0C0] font-light ml-2">
                          {formatDate(notif.created_at)}
                        </Text>
                      </View>

                      {/* Mensaje */}
                      <Text className={`text-sm font-light leading-5 mb-3 ${
                        notif.leida ? 'text-[#C0C0C0]' : 'text-[#2C2C2C]/80'
                      }`}>
                        {notif.mensaje}
                      </Text>

                      {/* Acciones */}
                      <View className="flex-row space-x-2">
                        <TouchableOpacity 
                          onPress={() => handleMarcarLeida(notif.id, notif.leida)}
                          className={`flex-1 rounded-full py-2 ${
                            notif.leida ? 'bg-[#F0F0F0]' : 'bg-[#4CAF50]'
                          }`}
                        >
                          <View className="flex-row items-center justify-center">
                            <Check size={14} color={notif.leida ? '#2C2C2C' : '#FFFFFF'} />
                            <Text className={`ml-1 text-xs font-light ${
                              notif.leida ? 'text-[#2C2C2C]' : 'text-white'
                            }`}>
                              {notif.leida ? 'Marcar sin leer' : 'Marcar leída'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={() => handleDelete(notif.id)}
                          className="w-10 h-10 rounded-full bg-[#f44336]/10 items-center justify-center"
                        >
                          <X size={16} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
