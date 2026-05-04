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
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Package,
  FileText,
  TrendingDown,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function DevolucionesScreen() {
  const [devoluciones, setDevoluciones] = useState([]);
  const [filteredDevoluciones, setFilteredDevoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todas');
  const [estadisticas, setEstadisticas] = useState(null);

  const filters = ['Todas', 'Aprobadas', 'Rechazadas', 'Pendientes', 'Hoy'];

  useEffect(() => {
    cargarDevoluciones();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchQuery, selectedFilter, devoluciones]);

  const cargarDevoluciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.devoluciones.getAll();

      if (error) {
        console.error('Error al cargar devoluciones:', error);
        Alert.alert('Error', 'No se pudieron cargar las devoluciones');
        return;
      }

      setDevoluciones(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las devoluciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.devoluciones.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...devoluciones];

    if (selectedFilter === 'Aprobadas') {
      filtered = filtered.filter(d => d.cumple_politicas === true);
    } else if (selectedFilter === 'Rechazadas') {
      filtered = filtered.filter(d => d.cumple_politicas === false);
    } else if (selectedFilter === 'Pendientes') {
      filtered = filtered.filter(d => d.cumple_politicas === null);
    } else if (selectedFilter === 'Hoy') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(d => new Date(d.fecha) >= today);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.no_factura?.toLowerCase().includes(query) ||
        d.motivo?.toLowerCase().includes(query) ||
        d.responsable?.toLowerCase().includes(query) ||
        d.producto?.nombre?.toLowerCase().includes(query)
      );
    }

    setFilteredDevoluciones(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDevoluciones();
    cargarEstadisticas();
  };

  const handleAprobar = async (id) => {
    try {
      const { error } = await db.devoluciones.aprobar(id);
      if (error) {
        Alert.alert('Error', 'No se pudo aprobar la devolución');
        return;
      }
      Alert.alert('Éxito', 'Devolución aprobada');
      cargarDevoluciones();
      cargarEstadisticas();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al aprobar la devolución');
    }
  };

  const handleRechazar = async (id) => {
    try {
      const { error } = await db.devoluciones.rechazar(id);
      if (error) {
        Alert.alert('Error', 'No se pudo rechazar la devolución');
        return;
      }
      Alert.alert('Éxito', 'Devolución rechazada');
      cargarDevoluciones();
      cargarEstadisticas();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al rechazar la devolución');
    }
  };

  const getEstadoIcon = (cumplePoliticas) => {
    if (cumplePoliticas === true) return CheckCircle2;
    if (cumplePoliticas === false) return XCircle;
    return Clock;
  };

  const getEstadoColor = (cumplePoliticas) => {
    if (cumplePoliticas === true) return '#4CAF50';
    if (cumplePoliticas === false) return '#f44336';
    return '#FFA726';
  };

  const getEstadoText = (cumplePoliticas) => {
    if (cumplePoliticas === true) return 'Aprobada';
    if (cumplePoliticas === false) return 'Rechazada';
    return 'Pendiente';
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
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando devoluciones...</Text>
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
            Devoluciones
          </Text>
          <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
            {filteredDevoluciones.length} devoluciones
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
                    {estadisticas.totalDevoluciones}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Devoluciones</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#4CAF50]">
                    {estadisticas.aprobadas}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Aprobadas</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#f44336]">
                    {estadisticas.rechazadas}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Rechazadas</Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-[#F0F0F0]">
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    ${estadisticas.totalDevuelto}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Devuelto</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.tasaAprobacion}%
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Tasa Aprobación</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.devolucionesHoy}
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
              placeholder="Buscar por factura, motivo, producto..."
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

        {/* Lista de Devoluciones */}
        <View className="px-6 pb-6">
          {filteredDevoluciones.length === 0 ? (
            <View className="items-center justify-center py-16">
              <RotateCcw size={64} color="#C0C0C0" />
              <Text className="text-[#C0C0C0] font-light mt-4">
                {searchQuery ? 'No se encontraron devoluciones' : 'No hay devoluciones'}
              </Text>
            </View>
          ) : (
            filteredDevoluciones.map(devolucion => {
              const EstadoIcon = getEstadoIcon(devolucion.cumple_politicas);
              const estadoColor = getEstadoColor(devolucion.cumple_politicas);

              return (
                <View key={devolucion.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  {/* Header con Estado */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View>
                      {devolucion.no_factura && (
                        <Text className="text-xs text-[#C0C0C0] font-light">
                          Factura: {devolucion.no_factura}
                        </Text>
                      )}
                      <Text className="text-xs text-[#C0C0C0] font-light mt-1">
                        {formatDate(devolucion.fecha)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <EstadoIcon size={16} color={estadoColor} />
                      <Text className="ml-1 text-xs font-light" style={{ color: estadoColor }}>
                        {getEstadoText(devolucion.cumple_politicas)}
                      </Text>
                    </View>
                  </View>

                  {/* Producto */}
                  <View className="flex-row items-center mb-3">
                    <Package size={16} color="#C0C0C0" />
                    <Text className="text-base font-light text-[#2C2C2C] ml-2">
                      {devolucion.producto?.nombre || 'Producto no especificado'}
                    </Text>
                  </View>

                  {/* Cantidad y Monto */}
                  <View className="flex-row justify-between mb-3 pb-3 border-b border-[#F0F0F0]">
                    <View>
                      <Text className="text-xs text-[#C0C0C0] font-light">Cantidad</Text>
                      <Text className="text-base font-light text-[#2C2C2C]">
                        {devolucion.cantidad} unidad(es)
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-[#C0C0C0] font-light">Monto Devuelto</Text>
                      <Text className="text-xl font-light text-[#f44336]">
                        ${Number(devolucion.monto_devuelto || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Estado del Producto */}
                  {devolucion.estado_producto && (
                    <View className="mb-2">
                      <Text className="text-xs text-[#C0C0C0] font-light">Estado del producto</Text>
                      <Text className="text-sm font-light text-[#2C2C2C]">
                        {devolucion.estado_producto}
                      </Text>
                    </View>
                  )}

                  {/* Motivo */}
                  {devolucion.motivo && (
                    <View className="mb-2">
                      <Text className="text-xs text-[#C0C0C0] font-light">Motivo</Text>
                      <Text className="text-sm font-light text-[#2C2C2C] italic">
                        {devolucion.motivo}
                      </Text>
                    </View>
                  )}

                  {/* Responsable */}
                  {devolucion.responsable && (
                    <View className="mb-3">
                      <Text className="text-xs text-[#C0C0C0] font-light">Responsable</Text>
                      <Text className="text-sm font-light text-[#2C2C2C]">
                        {devolucion.responsable}
                      </Text>
                    </View>
                  )}

                  {/* Acciones (solo si está pendiente) */}
                  {devolucion.cumple_politicas === null && (
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => handleAprobar(devolucion.id)}
                        className="flex-1 bg-[#4CAF50] py-2 rounded-lg"
                      >
                        <Text className="text-center text-sm font-light text-white">
                          Aprobar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRechazar(devolucion.id)}
                        className="flex-1 bg-[#f44336] py-2 rounded-lg"
                      >
                        <Text className="text-center text-sm font-light text-white">
                          Rechazar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Botón Flotante para Nueva Devolución */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
