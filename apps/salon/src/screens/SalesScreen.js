import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, Search, CreditCard, Wallet, Calendar, User, AlertCircle } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function SalesScreen() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('hoy'); // 'hoy', 'todas', 'efectivo', 'tarjeta'
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadVentas();
    loadStats();
  }, [filter]);

  const loadVentas = async () => {
    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'hoy':
          result = await db.ventas.getHoy();
          break;
        case 'efectivo':
          result = await db.ventas.getByMetodoPago('efectivo');
          break;
        case 'tarjeta':
          result = await db.ventas.getByMetodoPago('tarjeta');
          break;
        default:
          result = await db.ventas.getAll();
      }

      if (result.error) {
        console.error('Error al cargar ventas:', result.error);
        return;
      }

      // Filtrar por búsqueda
      let data = result.data || [];
      if (searchQuery.trim()) {
        data = data.filter(v =>
          (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (v.no_factura && v.no_factura.includes(searchQuery)) ||
          (v.cliente?.nombre && v.cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      setVentas(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const { data } = await db.ventas.getEstadisticas(
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    );
    
    if (data) setStats(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVentas();
    loadStats();
  };

  useEffect(() => {
    if (searchQuery !== '') {
      const timer = setTimeout(() => {
        loadVentas();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadVentas();
    }
  }, [searchQuery]);

  const getMetodoPagoIcon = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return Wallet;
      case 'tarjeta': return CreditCard;
      case 'transferencia': return DollarSign;
      default: return DollarSign;
    }
  };

  const getMetodoPagoColor = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return '#4CAF50';
      case 'tarjeta': return '#2196F3';
      case 'transferencia': return '#9C27B0';
      default: return '#C0C0C0';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
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
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando ventas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Ventas
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {ventas.length} ventas {filter !== 'todas' && `- ${filter}`}
        </Text>
      </View>

      {/* Estadísticas */}
      {stats && (
        <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3">
            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Total Ventas</Text>
              <Text className="text-2xl font-light text-[#2C2C2C]">{stats.totalVentas}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[160px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Ventas del Mes</Text>
              <Text className="text-2xl font-light text-[#D4AF37]">${stats.ventasTotales}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Descuentos</Text>
              <Text className="text-xl font-light text-[#FFA726]">${stats.descuentosTotales}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Promedio</Text>
              <Text className="text-xl font-light text-[#2196F3]">${stats.promedioVenta}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[160px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Ventas Netas</Text>
              <Text className="text-2xl font-light text-[#4CAF50]">${stats.ventasNetas}</Text>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Buscador */}
      <View className="px-6 mb-4">
        <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
          <Search size={20} color="#C0C0C0" />
          <TextInput
            className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
            placeholder="Buscar por cliente o factura..."
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
            onPress={() => setFilter('hoy')}
            className={`px-4 py-2 rounded-full ${filter === 'hoy' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'hoy' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('todas')}
            className={`px-4 py-2 rounded-full ${filter === 'todas' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'todas' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('efectivo')}
            className={`px-4 py-2 rounded-full ${filter === 'efectivo' ? 'bg-[#4CAF50]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'efectivo' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Efectivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('tarjeta')}
            className={`px-4 py-2 rounded-full ${filter === 'tarjeta' ? 'bg-[#2196F3]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'tarjeta' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Tarjeta
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Ventas */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {ventas.length === 0 ? (
          <View className="items-center justify-center py-16">
            <DollarSign size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron ventas' : 'No hay ventas registradas'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {ventas.map((venta) => {
              const MetodoIcon = getMetodoPagoIcon(venta.metodo_pago);
              
              return (
                <View key={venta.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Header con Fecha y Método de Pago */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <Calendar size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-xs text-[#C0C0C0] font-light">
                        {formatDate(venta.fecha)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <MetodoIcon size={16} color={getMetodoPagoColor(venta.metodo_pago)} />
                      <Text 
                        className="ml-1 text-xs font-light capitalize"
                        style={{ color: getMetodoPagoColor(venta.metodo_pago) }}
                      >
                        {venta.metodo_pago || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Cliente */}
                  <View className="flex-row items-center mb-2">
                    <User size={16} color="#C0C0C0" />
                    <Text className="ml-2 text-base font-light text-[#2C2C2C]">
                      {venta.cliente?.nombre || venta.cliente_nombre || 'Cliente no especificado'}
                    </Text>
                  </View>

                  {/* Vendedor/Profesional */}
                  {(venta.vendedor?.nombre || venta.profesional) && (
                    <Text className="text-xs text-[#C0C0C0] font-light mb-2">
                      Atendió: {venta.vendedor?.nombre || venta.profesional}
                    </Text>
                  )}

                  {/* No. Factura */}
                  {venta.no_factura && (
                    <Text className="text-xs text-[#C0C0C0] font-light mb-2">
                      Factura: #{venta.no_factura}
                    </Text>
                  )}

                  {/* Total y Descuento */}
                  <View className="flex-row justify-between items-center pt-3 border-t border-[#F0F0F0]">
                    <View>
                      {venta.descuento > 0 && (
                        <Text className="text-xs text-[#FFA726] font-light mb-1">
                          Descuento: ${Number(venta.descuento).toFixed(2)}
                        </Text>
                      )}
                      <Text className="text-xs text-[#C0C0C0] font-light">
                        Total
                      </Text>
                    </View>
                    <Text className="text-2xl font-light text-[#D4AF37]">
                      ${Number(venta.total || venta.monto || 0).toFixed(2)}
                    </Text>
                  </View>

                  {/* Alerta si fue alterada */}
                  {venta.fue_alterada && (
                    <View className="mt-3 pt-3 border-t border-[#F0F0F0] flex-row items-center">
                      <AlertCircle size={14} color="#f44336" />
                      <Text className="ml-2 text-xs text-[#f44336] font-light">
                        Venta alterada: {venta.motivo_alteracion}
                      </Text>
                    </View>
                  )}

                  {/* Notas */}
                  {venta.notas && (
                    <View className="mt-2 pt-2 border-t border-[#F0F0F0]">
                      <Text className="text-xs text-[#C0C0C0] font-light italic">
                        {venta.notas}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nueva Venta */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
