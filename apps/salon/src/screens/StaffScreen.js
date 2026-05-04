import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, Phone, Mail, Award, TrendingUp } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function StaffScreen() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmpleados, setFilteredEmpleados] = useState([]);
  const [showInactivos, setShowInactivos] = useState(false);

  useEffect(() => {
    loadEmpleados();
  }, [showInactivos]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmpleados(empleados);
    } else {
      const filtered = empleados.filter(empleado =>
        empleado.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (empleado.telefono && empleado.telefono.includes(searchQuery)) ||
        (empleado.email && empleado.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredEmpleados(filtered);
    }
  }, [searchQuery, empleados]);

  const loadEmpleados = async () => {
    try {
      setLoading(true);
      const { data, error } = showInactivos 
        ? await db.empleados.getAll()
        : await db.empleados.getActivos();

      if (error) {
        console.error('Error al cargar empleados:', error);
        return;
      }

      setEmpleados(data || []);
      setFilteredEmpleados(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEmpleados();
  };

  const toggleActivo = async (empleadoId, currentStatus) => {
    try {
      const { error } = await db.empleados.setActivo(empleadoId, !currentStatus);
      
      if (error) {
        console.error('Error al cambiar estado:', error);
        return;
      }

      loadEmpleados();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getRolColor = (rol) => {
    switch (rol?.toLowerCase()) {
      case 'admin': return '#9C27B0';
      case 'gerente': return '#D4AF37';
      case 'estilista': return '#2196F3';
      case 'barbero': return '#00BCD4';
      case 'recepcionista': return '#4CAF50';
      default: return '#C0C0C0';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando personal...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Personal
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {empleados.length} {showInactivos ? 'empleados' : 'empleados activos'}
        </Text>
      </View>

      {/* Buscador */}
      <View className="px-6 mb-4">
        <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
          <Search size={20} color="#C0C0C0" />
          <TextInput
            className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
            placeholder="Buscar empleado..."
            placeholderTextColor="#C0C0C0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Toggle Mostrar Inactivos */}
      <View className="px-6 mb-4 flex-row items-center justify-between">
        <Text className="text-sm text-[#C0C0C0] font-light">
          Mostrar inactivos
        </Text>
        <Switch
          value={showInactivos}
          onValueChange={setShowInactivos}
          trackColor={{ false: '#E0E0E0', true: '#D4AF37' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Lista de Empleados */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {filteredEmpleados.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Users size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron empleados' : 'No hay empleados registrados'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {filteredEmpleados.map((empleado) => (
              <View
                key={empleado.id}
                className={`bg-white rounded-2xl p-4 shadow-sm ${!empleado.activo ? 'opacity-50' : ''}`}
              >
                {/* Header con Nombre, Rol y Estado */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-light text-[#2C2C2C] mb-1">
                      {empleado.nombre}
                    </Text>
                    {empleado.rol && (
                      <View className="self-start">
                        <View 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: getRolColor(empleado.rol) + '20' }}
                        >
                          <Text 
                            className="text-xs font-light capitalize"
                            style={{ color: getRolColor(empleado.rol) }}
                          >
                            {empleado.rol}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Switch Activo/Inactivo */}
                  <Switch
                    value={empleado.activo}
                    onValueChange={() => toggleActivo(empleado.id, empleado.activo)}
                    trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Información de Contacto */}
                <View className="space-y-2">
                  {empleado.telefono && (
                    <View className="flex-row items-center">
                      <Phone size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {empleado.telefono}
                      </Text>
                    </View>
                  )}

                  {empleado.email && (
                    <View className="flex-row items-center">
                      <Mail size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {empleado.email}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Comisión */}
                {empleado.comision_porcentaje > 0 && (
                  <View className="mt-3 pt-3 border-t border-[#F0F0F0] flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Award size={16} color="#D4AF37" />
                      <Text className="ml-2 text-sm text-[#2C2C2C] font-light">
                        Comisión
                      </Text>
                    </View>
                    <Text className="text-base font-light text-[#D4AF37]">
                      {empleado.comision_porcentaje}%
                    </Text>
                  </View>
                )}

                {/* Footer */}
                <View className="mt-3 pt-3 border-t border-[#F0F0F0]">
                  <Text className="text-xs text-[#C0C0C0] font-light">
                    Miembro desde {new Date(empleado.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </Text>
                </View>

                {/* Botón Ver Estadísticas */}
                {empleado.activo && (
                  <TouchableOpacity 
                    className="mt-3 bg-[#FDFBF7] rounded-full py-2 flex-row items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <TrendingUp size={16} color="#D4AF37" />
                    <Text className="ml-2 text-sm font-light text-[#D4AF37]">
                      Ver Estadísticas
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nuevo Empleado */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
