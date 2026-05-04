import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Search, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('todas'); // 'todas', 'pending', 'confirmed', 'prepared', 'delivered'

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'pending':
        case 'confirmed':
        case 'prepared':
        case 'delivered':
          result = await db.orders.getByStatus(filter);
          break;
        case 'hoy':
          result = await db.orders.getHoy();
          break;
        default:
          result = await db.orders.getAll();
      }

      if (result.error) {
        console.error('Error al cargar órdenes:', result.error);
        return;
      }

      // Filtrar por búsqueda si hay query
      let data = result.data || [];
      if (searchQuery.trim()) {
        data = data.filter(order =>
          order.tracking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_phone.includes(searchQuery)
        );
      }

      setOrders(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  useEffect(() => {
    if (searchQuery !== '') {
      const timer = setTimeout(() => {
        loadOrders();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadOrders();
    }
  }, [searchQuery]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await db.orders.updateStatus(orderId, newStatus);
      
      if (error) {
        console.error('Error al actualizar estado:', error);
        return;
      }

      loadOrders();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA726';
      case 'confirmed': return '#D4AF37';
      case 'prepared': return '#42A5F5';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#f44336';
      default: return '#C0C0C0';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      prepared: 'Preparada',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'confirmed': return CheckCircle;
      case 'prepared': return Package;
      case 'delivered': return Truck;
      case 'cancelled': return XCircle;
      default: return ShoppingBag;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando órdenes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Órdenes
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {orders.length} órdenes {filter !== 'todas' && `- ${getStatusText(filter)}`}
        </Text>
      </View>

      {/* Buscador */}
      <View className="px-6 mb-4">
        <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
          <Search size={20} color="#C0C0C0" />
          <TextInput
            className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
            placeholder="Buscar por código, nombre o teléfono..."
            placeholderTextColor="#C0C0C0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('hoy')}
            className={`px-4 py-2 rounded-full ${filter === 'hoy' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'hoy' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full ${filter === 'pending' ? 'bg-[#FFA726]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'pending' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Pendientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-full ${filter === 'confirmed' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'confirmed' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Confirmadas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('prepared')}
            className={`px-4 py-2 rounded-full ${filter === 'prepared' ? 'bg-[#42A5F5]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'prepared' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Preparadas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('delivered')}
            className={`px-4 py-2 rounded-full ${filter === 'delivered' ? 'bg-[#4CAF50]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'delivered' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Entregadas
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Órdenes */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {orders.length === 0 ? (
          <View className="items-center justify-center py-16">
            <ShoppingBag size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron órdenes' : 'No hay órdenes'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              
              return (
                <View key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Header con Tracking y Estado */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View>
                      <Text className="text-xs text-[#C0C0C0] font-light">
                        Orden #{order.tracking_code}
                      </Text>
                      <Text className="text-xs text-[#C0C0C0] font-light mt-1">
                        {formatDate(order.created_at)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <StatusIcon size={16} color={getStatusColor(order.status)} />
                      <Text 
                        className="ml-1 text-xs font-light"
                        style={{ color: getStatusColor(order.status) }}
                      >
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Cliente */}
                  <Text className="text-lg font-light text-[#2C2C2C] mb-1">
                    {order.customer_name}
                  </Text>
                  <Text className="text-sm text-[#C0C0C0] font-light mb-3">
                    {order.customer_phone}
                  </Text>

                  {/* Total */}
                  <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-[#F0F0F0]">
                    <Text className="text-sm text-[#C0C0C0] font-light">
                      Total
                    </Text>
                    <Text className="text-2xl font-light text-[#D4AF37]">
                      ${Number(order.total_amount).toFixed(2)}
                    </Text>
                  </View>

                  {/* Notas */}
                  {order.notes && (
                    <View className="mb-3">
                      <Text className="text-xs text-[#C0C0C0] font-light italic">
                        {order.notes}
                      </Text>
                    </View>
                  )}

                  {/* Acciones según estado */}
                  {order.status === 'pending' && (
                    <View className="flex-row space-x-2">
                      <TouchableOpacity 
                        onPress={() => handleUpdateStatus(order.id, 'confirmed')}
                        className="flex-1 bg-[#D4AF37] rounded-full py-2"
                      >
                        <Text className="text-white text-center font-light text-sm">
                          Confirmar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleUpdateStatus(order.id, 'cancelled')}
                        className="flex-1 bg-[#f44336] rounded-full py-2"
                      >
                        <Text className="text-white text-center font-light text-sm">
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {order.status === 'confirmed' && (
                    <TouchableOpacity 
                      onPress={() => handleUpdateStatus(order.id, 'prepared')}
                      className="bg-[#42A5F5] rounded-full py-2"
                    >
                      <Text className="text-white text-center font-light text-sm">
                        Marcar como Preparada
                      </Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'prepared' && (
                    <TouchableOpacity 
                      onPress={() => handleUpdateStatus(order.id, 'delivered')}
                      className="bg-[#4CAF50] rounded-full py-2"
                    >
                      <Text className="text-white text-center font-light text-sm">
                        Marcar como Entregada
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nueva Orden */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
