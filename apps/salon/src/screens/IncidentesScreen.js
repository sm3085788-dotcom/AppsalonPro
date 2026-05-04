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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function IncidentesScreen() {
  const [incidentes, setIncidentes] = useState([]);
  const [filteredIncidentes, setFilteredIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('Todos');
  const [selectedTipo, setSelectedTipo] = useState('Todos');
  const [estadisticas, setEstadisticas] = useState(null);

  const estadoFilters = ['Todos', 'registrado', 'en_proceso', 'resuelto'];
  const tipoFilters = ['Todos', 'daño', 'pérdida', 'robo', 'accidente', 'queja', 'otro'];

  useEffect(() => {
    cargarIncidentes();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [incidentes, searchQuery, selectedEstado, selectedTipo]);

  const cargarIncidentes = async () => {
    try {
      const { data, error } = await db.incidentes.getAll();
      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los incidentes');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.incidentes.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...incidentes];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(
        (inc) =>
          inc.folio?.toLowerCase().includes(query) ||
          inc.tipo_incidente?.toLowerCase().includes(query) ||
          inc.empleado_nombre?.toLowerCase().includes(query) ||
          inc.cliente_nombre?.toLowerCase().includes(query) ||
          inc.descripcion?.toLowerCase().includes(query)
      );
    }

    if (selectedEstado !== 'Todos') {
      resultado = resultado.filter((inc) => inc.estado === selectedEstado);
    }

    if (selectedTipo !== 'Todos') {
      resultado = resultado.filter((inc) => inc.tipo_incidente === selectedTipo);
    }

    setFilteredIncidentes(resultado);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarIncidentes();
    cargarEstadisticas();
  };

  const handleMarcarEnProceso = async (id) => {
    try {
      const { data, error } = await db.incidentes.marcarEnProceso(id);
      if (error) throw error;
      setIncidentes((prev) => prev.map((inc) => (inc.id === id ? data : inc)));
      Alert.alert('Éxito', 'Incidente marcado como en proceso');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el incidente');
      console.error(error);
    }
  };

  const handleMarcarResuelto = async (id) => {
    try {
      const { data, error } = await db.incidentes.marcarResuelto(id);
      if (error) throw error;
      setIncidentes((prev) => prev.map((inc) => (inc.id === id ? data : inc)));
      Alert.alert('Éxito', 'Incidente marcado como resuelto');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el incidente');
      console.error(error);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'resuelto':
        return 'bg-green-500';
      case 'en_proceso':
        return 'bg-yellow-500';
      case 'registrado':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'resuelto':
        return CheckCircle2;
      case 'en_proceso':
        return Clock;
      case 'registrado':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      registrado: 'Registrado',
      en_proceso: 'En Proceso',
      resuelto: 'Resuelto',
    };
    return labels[estado] || estado;
  };

  const IncidenteCard = ({ incidente }) => {
    const EstadoIcon = getEstadoIcon(incidente.estado);
    const tieneImagenes = incidente.imagen_url || incidente.foto_2 || incidente.foto_3;

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <FileText size={16} color="#6B7280" />
              <Text className="ml-1 text-sm font-luxury-medium text-gray-600">
                {incidente.folio}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <AlertTriangle size={18} color="#EF4444" />
              <Text className="ml-2 text-lg font-luxury-medium text-gray-900">
                {incidente.tipo_incidente || 'Sin tipo'}
              </Text>
            </View>
          </View>
          <View className={`flex-row items-center px-3 py-1 rounded-full ${getEstadoColor(incidente.estado)}`}>
            <EstadoIcon size={14} color="#FFFFFF" />
            <Text className="ml-1 text-xs font-luxury-medium text-white">
              {getEstadoLabel(incidente.estado)}
            </Text>
          </View>
        </View>

        {incidente.descripcion && (
          <View className="mb-3 bg-gray-50 p-3 rounded-lg">
            <Text className="text-sm font-luxury-regular text-gray-700">
              {incidente.descripcion}
            </Text>
          </View>
        )}

        <View className="mb-3 space-y-2">
          {incidente.empleado_nombre && (
            <View className="flex-row items-center">
              <User size={14} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-regular text-gray-600">
                Empleado: <Text className="font-luxury-medium">{incidente.empleado_nombre}</Text>
              </Text>
            </View>
          )}
          {incidente.cliente_nombre && (
            <View className="flex-row items-center">
              <User size={14} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-regular text-gray-600">
                Cliente: <Text className="font-luxury-medium">{incidente.cliente_nombre}</Text>
              </Text>
            </View>
          )}
          {(incidente.monto_perdida > 0 || incidente.costo_estimado > 0) && (
            <View className="flex-row justify-between items-center pt-2 border-t border-gray-200">
              {incidente.monto_perdida > 0 && (
                <View className="flex-row items-center">
                  <DollarSign size={14} color="#EF4444" />
                  <Text className="ml-1 text-sm font-luxury-medium text-red-600">
                    Pérdida: ${incidente.monto_perdida}
                  </Text>
                </View>
              )}
              {incidente.costo_estimado > 0 && (
                <View className="flex-row items-center">
                  <DollarSign size={14} color="#F59E0B" />
                  <Text className="ml-1 text-sm font-luxury-medium text-yellow-600">
                    Costo: ${incidente.costo_estimado}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {tieneImagenes && (
          <View className="mb-3">
            <View className="flex-row items-center mb-2">
              <ImageIcon size={14} color="#6B7280" />
              <Text className="ml-1 text-xs font-luxury-medium text-gray-600">
                Imágenes adjuntas
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-2">
              {incidente.imagen_url && (
                <Image
                  source={{ uri: incidente.imagen_url }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
              )}
              {incidente.foto_2 && (
                <Image
                  source={{ uri: incidente.foto_2 }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
              )}
              {incidente.foto_3 && (
                <Image
                  source={{ uri: incidente.foto_3 }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
              )}
            </ScrollView>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center space-x-3">
            {incidente.aplica_reembolso && (
              <View className="bg-blue-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-luxury-medium text-blue-700">
                  Reembolso
                </Text>
              </View>
            )}
            {incidente.aplica_compensacion && (
              <View className="bg-purple-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-luxury-medium text-purple-700">
                  Compensación
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            <Calendar size={12} color="#6B7280" />
            <Text className="ml-1 text-xs font-luxury-regular text-gray-500">
              {new Date(incidente.fecha).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View className="flex-row space-x-2">
          {incidente.estado === 'registrado' && (
            <TouchableOpacity
              onPress={() => handleMarcarEnProceso(incidente.id)}
              className="flex-1 bg-yellow-500 py-2 rounded-lg"
            >
              <Text className="text-center text-sm font-luxury-medium text-white">
                En Proceso
              </Text>
            </TouchableOpacity>
          )}
          {(incidente.estado === 'registrado' || incidente.estado === 'en_proceso') && (
            <TouchableOpacity
              onPress={() => handleMarcarResuelto(incidente.id)}
              className="flex-1 bg-green-500 py-2 rounded-lg"
            >
              <Text className="text-center text-sm font-luxury-medium text-white">
                Marcar Resuelto
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text className="mt-4 text-base font-luxury-regular text-gray-600">
            Cargando incidentes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
          />
        }
      >
        <View className="px-4 py-6">
          <View className="mb-6">
            <Text className="text-3xl font-luxury-medium text-gray-900 mb-2">
              Incidentes
            </Text>
            <Text className="text-base font-luxury-regular text-gray-600">
              Registro y seguimiento de incidencias
            </Text>
          </View>

          {estadisticas && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-gray-900">
                    {estadisticas.totalIncidentes}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Total
                  </Text>
                </View>
                <View className="flex-1 items-center border-l border-r border-gray-200">
                  <Text className="text-2xl font-luxury-medium text-green-600">
                    {estadisticas.resueltos}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Resueltos
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-yellow-600">
                    {estadisticas.enProceso}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    En Proceso
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-around border-t border-gray-200 pt-4">
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-red-600">
                    ${estadisticas.totalPerdidas}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Pérdidas
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-gray-700">
                    {estadisticas.tasaResolucion}%
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Tasa Resolución
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-blue-600">
                    {estadisticas.incidentesHoy}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Hoy
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-3 shadow-sm">
              <Search size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base font-luxury-regular text-gray-900"
                placeholder="Buscar incidentes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="flex-row items-center mb-2">
              <Filter size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Estado
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {estadoFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedEstado(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedEstado === filter
                      ? 'bg-luxury-gold'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedEstado === filter ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {filter === 'Todos' ? filter : getEstadoLabel(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row items-center mb-2">
              <AlertTriangle size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Tipo
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tipoFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedTipo(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedTipo === filter
                      ? 'bg-red-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedTipo === filter ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="mb-4">
            <Text className="text-lg font-luxury-medium text-gray-900 mb-3">
              {filteredIncidentes.length} {filteredIncidentes.length === 1 ? 'Incidente' : 'Incidentes'}
            </Text>
          </View>

          {filteredIncidentes.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <AlertTriangle size={48} color="#D1D5DB" />
              <Text className="mt-4 text-base font-luxury-medium text-gray-900">
                No hay incidentes
              </Text>
              <Text className="mt-2 text-sm font-luxury-regular text-gray-600 text-center">
                {searchQuery || selectedEstado !== 'Todos'
                  ? 'No se encontraron incidentes con los filtros seleccionados'
                  : 'Aún no hay incidentes registrados'}
              </Text>
            </View>
          ) : (
            filteredIncidentes.map((incidente) => <IncidenteCard key={incidente.id} incidente={incidente} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
