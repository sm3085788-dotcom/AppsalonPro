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
  Target,
  TrendingUp,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function GoalsScreen() {
  const [metas, setMetas] = useState([]);
  const [filteredMetas, setFilteredMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Activas');
  const [selectedTipo, setSelectedTipo] = useState('Todas');
  const [selectedAlcance, setSelectedAlcance] = useState('Todas');
  const [estadisticas, setEstadisticas] = useState(null);

  const filters = ['Todas', 'Activas', 'Completadas', 'Vencidas'];
  const tipoFilters = ['Todas', 'ventas', 'servicios', 'clientes', 'ingresos'];
  const alcanceFilters = ['Todas', 'global', 'individual'];

  useEffect(() => {
    cargarMetas();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [metas, searchQuery, selectedFilter, selectedTipo, selectedAlcance]);

  const cargarMetas = async () => {
    try {
      const { data, error } = await db.metas.getAll();
      if (error) throw error;
      setMetas(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las metas');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.metas.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...metas];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(
        (meta) =>
          meta.titulo?.toLowerCase().includes(query) ||
          meta.tipo?.toLowerCase().includes(query) ||
          meta.asignado_a?.nombre?.toLowerCase().includes(query)
      );
    }

    if (selectedFilter === 'Activas') {
      resultado = resultado.filter((meta) => meta.activo);
    } else if (selectedFilter === 'Completadas') {
      resultado = resultado.filter((meta) => {
        const progreso = db.metas.getProgreso(meta);
        return progreso >= 100;
      });
    } else if (selectedFilter === 'Vencidas') {
      const hoy = new Date().toISOString().split('T')[0];
      resultado = resultado.filter(
        (meta) => meta.activo && meta.fecha_fin && meta.fecha_fin < hoy
      );
    }

    if (selectedTipo !== 'Todas') {
      resultado = resultado.filter((meta) => meta.tipo === selectedTipo);
    }

    if (selectedAlcance !== 'Todas') {
      resultado = resultado.filter((meta) => meta.alcance === selectedAlcance);
    }

    setFilteredMetas(resultado);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarMetas();
    cargarEstadisticas();
  };

  const toggleActivo = async (id) => {
    try {
      const { data, error } = await db.metas.toggleActivo(id);
      if (error) throw error;
      setMetas((prev) =>
        prev.map((meta) => (meta.id === id ? { ...meta, activo: !meta.activo } : meta))
      );
      Alert.alert('Éxito', 'Estado de la meta actualizado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
      console.error(error);
    }
  };

  const getProgresoColor = (progreso) => {
    if (progreso >= 100) return 'bg-green-500';
    if (progreso >= 75) return 'bg-blue-500';
    if (progreso >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'ventas':
        return TrendingUp;
      case 'servicios':
        return Target;
      case 'clientes':
        return Users;
      case 'ingresos':
        return Award;
      default:
        return Target;
    }
  };

  const getPeriodoLabel = (periodo) => {
    const labels = {
      diario: 'Diaria',
      semanal: 'Semanal',
      mensual: 'Mensual',
      trimestral: 'Trimestral',
      anual: 'Anual',
    };
    return labels[periodo] || periodo;
  };

  const MetaCard = ({ meta }) => {
    const progreso = db.metas.getProgreso(meta);
    const TipoIcon = getTipoIcon(meta.tipo);
    const isVencida =
      meta.activo && meta.fecha_fin && new Date(meta.fecha_fin) < new Date();
    const isCompletada = progreso >= 100;

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <TipoIcon size={18} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-600 uppercase">
                {meta.tipo}
              </Text>
              {meta.alcance === 'global' && (
                <View className="ml-2 bg-purple-100 px-2 py-1 rounded-full">
                  <Text className="text-xs font-luxury-medium text-purple-700">
                    Global
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-lg font-luxury-medium text-gray-900 mb-1">
              {meta.titulo}
            </Text>
            {meta.asignado_a && (
              <Text className="text-sm font-luxury-regular text-gray-500">
                👤 {meta.asignado_a.nombre}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => toggleActivo(meta.id)}
            className={`px-3 py-1 rounded-full ${
              meta.activo ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-luxury-medium ${
                meta.activo ? 'text-green-700' : 'text-gray-600'
              }`}
            >
              {meta.activo ? 'Activa' : 'Inactiva'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-3">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-luxury-regular text-gray-600">
              Progreso: {meta.actual || 0} / {meta.valor_objetivo}
            </Text>
            <Text
              className={`text-sm font-luxury-medium ${
                isCompletada ? 'text-green-600' : 'text-gray-700'
              }`}
            >
              {progreso}%
            </Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className={`h-full ${getProgresoColor(progreso)}`}
              style={{ width: `${Math.min(progreso, 100)}%` }}
            />
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Calendar size={14} color="#6B7280" />
            <Text className="ml-1 text-xs font-luxury-regular text-gray-600">
              {getPeriodoLabel(meta.periodo)}
            </Text>
          </View>
          {meta.fecha_fin && (
            <View className="flex-row items-center">
              {isVencida && !isCompletada && (
                <AlertCircle size={14} color="#EF4444" />
              )}
              {isCompletada && <CheckCircle2 size={14} color="#10B981" />}
              <Text
                className={`ml-1 text-xs font-luxury-regular ${
                  isVencida && !isCompletada ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {isVencida && !isCompletada
                  ? 'Vencida'
                  : new Date(meta.fecha_fin).toLocaleDateString()}
              </Text>
            </View>
          )}
          {meta.bono_monto > 0 && (
            <View className="bg-yellow-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-luxury-medium text-yellow-700">
                💰 ${meta.bono_monto}
              </Text>
            </View>
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
            Cargando metas...
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
              Metas y Objetivos
            </Text>
            <Text className="text-base font-luxury-regular text-gray-600">
              Seguimiento de objetivos del equipo
            </Text>
          </View>

          {estadisticas && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-gray-900">
                    {estadisticas.metasActivas}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Activas
                  </Text>
                </View>
                <View className="flex-1 items-center border-l border-r border-gray-200">
                  <Text className="text-2xl font-luxury-medium text-green-600">
                    {estadisticas.metasCompletadas}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Completadas
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-blue-600">
                    {estadisticas.progresoPromedio}%
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Progreso
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-sm font-luxury-medium text-gray-700">
                    {estadisticas.metasGlobales}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Globales
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-sm font-luxury-medium text-gray-700">
                    {estadisticas.metasIndividuales}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Individuales
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
                placeholder="Buscar metas..."
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
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedFilter === filter
                      ? 'bg-luxury-gold'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedFilter === filter ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row items-center mb-2">
              <Target size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Tipo
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {tipoFilters.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  onPress={() => setSelectedTipo(tipo)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedTipo === tipo
                      ? 'bg-blue-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedTipo === tipo ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row items-center mb-2">
              <Users size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Alcance
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {alcanceFilters.map((alcance) => (
                <TouchableOpacity
                  key={alcance}
                  onPress={() => setSelectedAlcance(alcance)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedAlcance === alcance
                      ? 'bg-purple-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedAlcance === alcance ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {alcance}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="mb-4">
            <Text className="text-lg font-luxury-medium text-gray-900 mb-3">
              {filteredMetas.length} {filteredMetas.length === 1 ? 'Meta' : 'Metas'}
            </Text>
          </View>

          {filteredMetas.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Target size={48} color="#D1D5DB" />
              <Text className="mt-4 text-base font-luxury-medium text-gray-900">
                No hay metas
              </Text>
              <Text className="mt-2 text-sm font-luxury-regular text-gray-600 text-center">
                {searchQuery || selectedFilter !== 'Todas'
                  ? 'No se encontraron metas con los filtros seleccionados'
                  : 'Aún no hay metas creadas'}
              </Text>
            </View>
          ) : (
            filteredMetas.map((meta) => <MetaCard key={meta.id} meta={meta} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
