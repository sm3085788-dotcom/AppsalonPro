import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Package,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function CambiosProductosScreen() {
  const [cambios, setCambios] = useState([]);
  const [filteredCambios, setFilteredCambios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [estadisticas, setEstadisticas] = useState(null);

  const filters = ['Todos', 'Con Diferencia', 'Sin Diferencia', 'Hoy'];

  useEffect(() => {
    cargarCambios();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchQuery, selectedFilter, cambios]);

  const cargarCambios = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.cambiosProductos.getAll();

      if (error) {
        console.error('Error al cargar cambios:', error);
        Alert.alert('Error', 'No se pudieron cargar los cambios de productos');
        return;
      }

      setCambios(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los cambios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.cambiosProductos.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...cambios];

    if (selectedFilter === 'Con Diferencia') {
      filtered = filtered.filter(c => Number(c.diferencia_cobrada) > 0);
    } else if (selectedFilter === 'Sin Diferencia') {
      filtered = filtered.filter(c => Number(c.diferencia_cobrada) === 0);
    } else if (selectedFilter === 'Hoy') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(c => new Date(c.fecha) >= today);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.venta?.no_factura?.toLowerCase().includes(query) ||
        c.producto_entrada?.nombre?.toLowerCase().includes(query) ||
        c.producto_salida?.nombre?.toLowerCase().includes(query)
      );
    }

    setFilteredCambios(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarCambios();
    cargarEstadisticas();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando cambios...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
            Cambios de Productos
          </Text>
          <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
            {filteredCambios.length} cambios registrados
          </Text>
        </View>

        {/* Dashboard Stats */}
        {estadisticas && (
          <View className="px-6 mb-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-light text-[#2C2C2C] mb-3">
                Resumen General
              </Text>
              
              <View className="flex-row justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#D4AF37]">
                    {estadisticas.totalCambios}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Cambios</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#42A5F5]">
                    {estadisticas.conDiferencia}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Con Diferencia</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#4CAF50]">
                    {estadisticas.sinDiferencia}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Sin Diferencia</Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-[#F0F0F0]">
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    ${estadisticas.totalDiferenciaCobrada}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Cobrado</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.porcentajeConDiferencia}%
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Con Diferencia</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.cambiosHoy}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Hoy</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Buscador */}
        <View className="px-6 mb-4">
          <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
            <Search size={20} color="#C0C0C0" />
            <TextInput
              className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
              placeholder="Buscar por factura o producto..."
              placeholderTextColor="#C0C0C0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filtros */}
        <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
            {filters.map(filter => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-full ${
                  selectedFilter === filter ? 'bg-[#D4AF37]' : 'bg-white'
                }`}
              >
                <Text
                  className={`font-light ${
                    selectedFilter === filter ? 'text-white' : 'text-[#2C2C2C]'
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Cambios */}
        <View className="px-6 pb-6">
          {filteredCambios.length === 0 ? (
            <View className="items-center justify-center py-16">
              <RefreshCw size={64} color="#C0C0C0" />
              <Text className="text-[#C0C0C0] font-light mt-4">
                {searchQuery ? 'No se encontraron cambios' : 'No hay cambios registrados'}
              </Text>
            </View>
          ) : (
            filteredCambios.map(cambio => {
              const tieneDiferencia = Number(cambio.diferencia_cobrada) > 0;

              return (
                <View key={cambio.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  {/* Header con Fecha y Factura */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View>
                      {cambio.venta?.no_factura && (
                        <Text className="text-xs text-[#C0C0C0] font-light">
                          Factura: {cambio.venta.no_factura}
                        </Text>
                      )}
                      <Text className="text-xs text-[#C0C0C0] font-light mt-1">
                        {formatDate(cambio.fecha)}
                      </Text>
                    </View>
                    {tieneDiferencia && (
                      <View className="bg-[#42A5F5] px-3 py-1 rounded-full">
                        <Text className="text-xs font-light text-white">
                          Diferencia
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Productos Cambiados */}
                  <View className="bg-[#F8F8F8] rounded-xl p-3 mb-3">
                    <View className="flex-row items-center justify-between">
                      {/* Producto Entrada (devuelve) */}
                      <View className="flex-1">
                        <Text className="text-xs text-[#C0C0C0] font-light mb-1">
                          Devuelve
                        </Text>
                        <View className="flex-row items-center">
                          <Package size={14} color="#f44336" />
                          <Text className="text-sm font-light text-[#2C2C2C] ml-2 flex-1">
                            {cambio.producto_entrada?.nombre || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {/* Flecha */}
                      <View className="mx-3">
                        <ArrowRight size={20} color="#D4AF37" />
                      </View>

                      {/* Producto Salida (recibe) */}
                      <View className="flex-1">
                        <Text className="text-xs text-[#C0C0C0] font-light mb-1">
                          Recibe
                        </Text>
                        <View className="flex-row items-center">
                          <Package size={14} color="#4CAF50" />
                          <Text className="text-sm font-light text-[#2C2C2C] ml-2 flex-1">
                            {cambio.producto_salida?.nombre || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Diferencia Cobrada */}
                  {tieneDiferencia && (
                    <View className="flex-row items-center justify-between pt-3 border-t border-[#F0F0F0]">
                      <View className="flex-row items-center">
                        <DollarSign size={16} color="#42A5F5" />
                        <Text className="text-sm text-[#C0C0C0] font-light ml-1">
                          Diferencia cobrada
                        </Text>
                      </View>
                      <Text className="text-xl font-light text-[#42A5F5]">
                        ${Number(cambio.diferencia_cobrada).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {/* Sin Diferencia */}
                  {!tieneDiferencia && (
                    <View className="flex-row items-center justify-center pt-3 border-t border-[#F0F0F0]">
                      <Text className="text-sm text-[#4CAF50] font-light">
                        Cambio directo sin diferencia
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Botón Flotante para Nuevo Cambio */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
