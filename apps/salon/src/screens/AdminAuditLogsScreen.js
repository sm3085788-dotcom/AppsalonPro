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
  Shield,
  Search,
  Filter,
  AlertTriangle,
  User,
  Calendar,
  Trash2,
  FileText,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function AdminAuditLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [estadisticas, setEstadisticas] = useState(null);
  const [accionesSospechosas, setAccionesSospechosas] = useState(null);

  const filters = ['Todos', 'Hoy', 'Últimos 7 días', 'Eliminaciones', 'Sospechosas'];

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchQuery, selectedFilter, logs]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [logsResult, statsResult, suspiciousResult] = await Promise.all([
        db.adminAuditLogs.getRecent(100),
        db.adminAuditLogs.getEstadisticas(),
        db.adminAuditLogs.getAccionesSospechosas(),
      ]);

      if (!logsResult.error) {
        setLogs(logsResult.data || []);
      }

      if (!statsResult.error) {
        setEstadisticas(statsResult.data);
      }

      if (!suspiciousResult.error) {
        setAccionesSospechosas(suspiciousResult.data);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los logs de auditoría');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...logs];

    if (selectedFilter === 'Hoy') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.created_at) >= today);
    } else if (selectedFilter === 'Últimos 7 días') {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      filtered = filtered.filter(log => new Date(log.created_at) >= last7Days);
    } else if (selectedFilter === 'Eliminaciones') {
      filtered = filtered.filter(log => log.removed_count > 0);
    } else if (selectedFilter === 'Sospechosas') {
      filtered = filtered.filter(log => 
        log.removed_count >= 50 || 
        accionesSospechosas?.adminsSospechosos?.includes(log.admin_id)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.action_key?.toLowerCase().includes(query) ||
        log.target_table?.toLowerCase().includes(query) ||
        log.label?.toLowerCase().includes(query) ||
        log.admin?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (actionKey) => {
    if (actionKey?.includes('delete') || actionKey?.includes('remove')) return '#f44336';
    if (actionKey?.includes('create') || actionKey?.includes('add')) return '#4CAF50';
    if (actionKey?.includes('update') || actionKey?.includes('edit')) return '#42A5F5';
    return '#C0C0C0';
  };

  const getActionIcon = (actionKey, removedCount) => {
    if (removedCount > 0) return Trash2;
    if (actionKey?.includes('delete') || actionKey?.includes('remove')) return Trash2;
    return FileText;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando logs de auditoría...</Text>
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
          <View className="flex-row items-center">
            <Shield size={32} color="#D4AF37" />
            <View className="ml-3">
              <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
                Auditoría Admin
              </Text>
              <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
                {filteredLogs.length} registros
              </Text>
            </View>
          </View>
        </View>

        {/* Alerta de Acciones Sospechosas */}
        {accionesSospechosas && accionesSospechosas.totalSospechosas > 0 && (
          <View className="px-6 mb-4">
            <View className="bg-[#f44336] rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <AlertTriangle size={20} color="#FFFFFF" />
                <Text className="text-lg font-light text-white ml-2">
                  Actividad Sospechosa Detectada
                </Text>
              </View>
              <Text className="text-sm text-white/80 font-light">
                {accionesSospechosas.eliminacionesMasivas.length} eliminaciones masivas detectadas
              </Text>
              <Text className="text-sm text-white/80 font-light">
                {accionesSospechosas.adminsSospechosos.length} admins con actividad inusual
              </Text>
            </View>
          </View>
        )}

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
                    {estadisticas.totalLogs}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Registros</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#4CAF50]">
                    {estadisticas.logsHoy}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Hoy</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#42A5F5]">
                    {estadisticas.logsUltimos7Dias}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Últimos 7 días</Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-[#F0F0F0]">
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#f44336]">
                    {estadisticas.totalEliminaciones}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Eliminaciones</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.adminsActivos}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Admins Activos</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    {estadisticas.promedioLogsPorDia}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Logs/día (7d)</Text>
                </View>
              </View>

              {estadisticas.accionMasFrecuente && (
                <View className="pt-3 border-t border-[#F0F0F0] mt-2">
                  <Text className="text-xs text-[#C0C0C0] font-light">Acción más frecuente</Text>
                  <Text className="text-sm font-light text-[#2C2C2C]">
                    {estadisticas.accionMasFrecuente} ({estadisticas.frecuenciaAccion})
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Buscador */}
        <View className="px-6 mb-4">
          <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
            <Search size={20} color="#C0C0C0" />
            <TextInput
              className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
              placeholder="Buscar por acción, tabla, admin..."
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

        {/* Lista de Logs */}
        <View className="px-6 pb-6">
          {filteredLogs.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Shield size={64} color="#C0C0C0" />
              <Text className="text-[#C0C0C0] font-light mt-4">
                {searchQuery ? 'No se encontraron logs' : 'No hay logs de auditoría'}
              </Text>
            </View>
          ) : (
            filteredLogs.map(log => {
              const ActionIcon = getActionIcon(log.action_key, log.removed_count);
              const actionColor = getActionColor(log.action_key);
              const isSospechoso = log.removed_count >= 50;

              return (
                <View 
                  key={log.id} 
                  className={`bg-white rounded-2xl p-4 mb-3 shadow-sm ${
                    isSospechoso ? 'border-2 border-[#f44336]' : ''
                  }`}
                >
                  {/* Header con Acción */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center flex-1">
                      <ActionIcon size={16} color={actionColor} />
                      <Text
                        className="ml-2 text-sm font-light flex-1"
                        style={{ color: actionColor }}
                        numberOfLines={1}
                      >
                        {log.action_key}
                      </Text>
                    </View>
                    <Text className="text-xs text-[#C0C0C0] font-light ml-2">
                      {formatDate(log.created_at)}
                    </Text>
                  </View>

                  {/* Tabla Objetivo */}
                  <View className="mb-2">
                    <Text className="text-xs text-[#C0C0C0] font-light">Tabla</Text>
                    <Text className="text-sm font-light text-[#2C2C2C]">
                      {log.target_table}
                    </Text>
                  </View>

                  {/* Label/Descripción */}
                  {log.label && (
                    <View className="mb-2">
                      <Text className="text-xs text-[#C0C0C0] font-light">Descripción</Text>
                      <Text className="text-sm font-light text-[#2C2C2C] italic">
                        {log.label}
                      </Text>
                    </View>
                  )}

                  {/* Administrador */}
                  <View className="flex-row items-center mb-2">
                    <User size={14} color="#C0C0C0" />
                    <Text className="text-sm font-light text-[#2C2C2C] ml-2">
                      {log.admin?.profiles?.full_name || log.admin?.email || 'Admin desconocido'}
                    </Text>
                  </View>

                  {/* Eliminaciones */}
                  {log.removed_count > 0 && (
                    <View className="flex-row items-center justify-between pt-3 border-t border-[#F0F0F0]">
                      <View className="flex-row items-center">
                        <Trash2 size={16} color="#f44336" />
                        <Text className="text-sm text-[#C0C0C0] font-light ml-2">
                          Registros eliminados
                        </Text>
                      </View>
                      <Text
                        className="text-xl font-light"
                        style={{ color: log.removed_count >= 50 ? '#f44336' : '#FFA726' }}
                      >
                        {log.removed_count}
                      </Text>
                    </View>
                  )}

                  {/* Alerta si es sospechoso */}
                  {isSospechoso && (
                    <View className="flex-row items-center bg-[#f44336]/10 rounded-lg p-2 mt-2">
                      <AlertTriangle size={16} color="#f44336" />
                      <Text className="text-xs text-[#f44336] font-light ml-2">
                        Eliminación masiva - Requiere revisión
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
