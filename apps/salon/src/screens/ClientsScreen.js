import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Search, Phone, Mail, Star } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function ClientsScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClientes, setFilteredClientes] = useState([]);

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClientes(clientes);
    } else {
      const filtered = clientes.filter(cliente =>
        cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cliente.telefono && cliente.telefono.includes(searchQuery)) ||
        (cliente.email && cliente.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredClientes(filtered);
    }
  }, [searchQuery, clientes]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.clientes.getAll();

      if (error) {
        console.error('Error al cargar clientes:', error);
        return;
      }

      setClientes(data || []);
      setFilteredClientes(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientes();
  };

  const getCategoriaColor = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'nuevo': return '#4CAF50';
      case 'regular': return '#2196F3';
      case 'vip': return '#D4AF37';
      case 'premium': return '#9C27B0';
      default: return '#C0C0C0';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando clientes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Clientes
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {clientes.length} clientes registrados
        </Text>
      </View>

      {/* Buscador */}
      <View className="px-6 mb-4">
        <View className="bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm">
          <Search size={20} color="#C0C0C0" />
          <TextInput
            className="flex-1 ml-3 text-base font-light text-[#2C2C2C]"
            placeholder="Buscar por nombre, teléfono o email..."
            placeholderTextColor="#C0C0C0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Lista de Clientes */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {filteredClientes.length === 0 ? (
          <View className="items-center justify-center py-16">
            <User size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {filteredClientes.map((cliente) => (
              <TouchableOpacity
                key={cliente.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
                activeOpacity={0.7}
              >
                {/* Header con Nombre y Categoría */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-light text-[#2C2C2C] mb-1">
                      {cliente.nombre}
                    </Text>
                    {cliente.categoria && (
                      <View className="self-start">
                        <View 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: getCategoriaColor(cliente.categoria) + '20' }}
                        >
                          <Text 
                            className="text-xs font-light"
                            style={{ color: getCategoriaColor(cliente.categoria) }}
                          >
                            {cliente.categoria}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Puntos de Fidelidad */}
                  {cliente.puntos_fidelidad > 0 && (
                    <View className="flex-row items-center">
                      <Star size={16} color="#D4AF37" fill="#D4AF37" />
                      <Text className="ml-1 text-sm font-light text-[#D4AF37]">
                        {cliente.puntos_fidelidad}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Información de Contacto */}
                <View className="space-y-2">
                  {cliente.telefono && (
                    <View className="flex-row items-center">
                      <Phone size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {cliente.telefono}
                      </Text>
                    </View>
                  )}

                  {cliente.email && (
                    <View className="flex-row items-center">
                      <Mail size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {cliente.email}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notas (si existen) */}
                {cliente.notas && (
                  <View className="mt-3 pt-3 border-t border-[#F0F0F0]">
                    <Text className="text-xs text-[#C0C0C0] font-light italic">
                      {cliente.notas.length > 80 
                        ? cliente.notas.substring(0, 80) + '...'
                        : cliente.notas
                      }
                    </Text>
                  </View>
                )}

                {/* Footer con Fecha de Registro */}
                <View className="mt-3 pt-3 border-t border-[#F0F0F0]">
                  <Text className="text-xs text-[#C0C0C0] font-light">
                    Cliente desde {new Date(cliente.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nuevo Cliente */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
