import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { supabase, db } from '../../../../shared/config/supabaseClient';

export default function AppointmentsScreen() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('hoy'); // 'hoy', 'proximas', 'pendientes'

  useEffect(() => {
    loadCitas();
  }, [filter]);

  const loadCitas = async () => {
    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'hoy':
          result = await db.citas.getHoy();
          break;
        case 'proximas':
          result = await db.citas.getProximas();
          break;
        case 'pendientes':
          result = await db.citas.getByEstado('pendiente');
          break;
        default:
          result = await db.citas.getAll();
      }

      if (result.error) {
        console.error('Error al cargar citas:', result.error);
        return;
      }

      setCitas(result.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCitas();
  };

  const handleUpdateEstado = async (citaId, nuevoEstado) => {
    try {
      const { error } = await db.citas.updateEstado(citaId, nuevoEstado);
      
      if (error) {
        console.error('Error al actualizar estado:', error);
        return;
      }

      // Recargar citas
      loadCitas();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#D4AF37';
      case 'confirmada': return '#4CAF50';
      case 'completada': return '#2196F3';
      case 'cancelada': return '#f44336';
      default: return '#C0C0C0';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'completada': return CheckCircle;
      case 'cancelada': return XCircle;
      default: return AlertCircle;
    }
  };

  const formatFechaHora = (fecha) => {
    const date = new Date(fecha);
    const hora = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dia = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return { hora, dia };
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando citas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Citas
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          Gestión de agenda
        </Text>
      </View>

      {/* Filtros */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          <TouchableOpacity 
            onPress={() => setFilter('hoy')}
            className={`px-4 py-2 rounded-full ${filter === 'hoy' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'hoy' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('proximas')}
            className={`px-4 py-2 rounded-full ${filter === 'proximas' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'proximas' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Próximas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('pendientes')}
            className={`px-4 py-2 rounded-full ${filter === 'pendientes' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'pendientes' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Pendientes
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Citas */}
      <ScrollView 
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {citas.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Calendar size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              No hay citas {filter === 'hoy' ? 'para hoy' : filter}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {citas.map((cita) => {
              const { hora, dia } = formatFechaHora(cita.fecha_hora);
              const EstadoIcon = getEstadoIcon(cita.estado);
              
              return (
                <View key={cita.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Hora y Estado */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <Clock size={16} color="#D4AF37" />
                      <Text className="ml-2 text-lg font-light text-[#2C2C2C]">
                        {hora}
                      </Text>
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {dia}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <EstadoIcon size={16} color={getEstadoColor(cita.estado)} />
                      <Text 
                        className="ml-1 text-xs font-light capitalize"
                        style={{ color: getEstadoColor(cita.estado) }}
                      >
                        {cita.estado}
                      </Text>
                    </View>
                  </View>

                  {/* Cliente */}
                  <View className="flex-row items-center mb-2">
                    <User size={16} color="#C0C0C0" />
                    <Text className="ml-2 text-base font-light text-[#2C2C2C]">
                      {cita.cliente?.nombre || 'Cliente no especificado'}
                    </Text>
                  </View>

                  {/* Servicio */}
                  <Text className="text-sm text-[#C0C0C0] font-light mb-1">
                    {cita.servicio}
                  </Text>

                  {/* Precio y Duración */}
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-light text-[#D4AF37]">
                      ${cita.precio}
                    </Text>
                    <Text className="text-xs text-[#C0C0C0] font-light">
                      {cita.duracion_minutos} min
                    </Text>
                  </View>

                  {/* Acciones */}
                  {cita.estado === 'pendiente' && (
                    <View className="flex-row space-x-2">
                      <TouchableOpacity 
                        onPress={() => handleUpdateEstado(cita.id, 'confirmada')}
                        className="flex-1 bg-[#4CAF50] rounded-full py-2"
                      >
                        <Text className="text-white text-center font-light text-sm">
                          Confirmar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleUpdateEstado(cita.id, 'cancelada')}
                        className="flex-1 bg-[#f44336] rounded-full py-2"
                      >
                        <Text className="text-white text-center font-light text-sm">
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {cita.estado === 'confirmada' && (
                    <TouchableOpacity 
                      onPress={() => handleUpdateEstado(cita.id, 'completada')}
                      className="bg-[#2196F3] rounded-full py-2"
                    >
                      <Text className="text-white text-center font-light text-sm">
                        Marcar como Completada
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nueva Cita */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
