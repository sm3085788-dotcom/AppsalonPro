import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, Shield, UserCheck, Phone, Mail, Crown } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('todos'); // 'todos', 'admin', 'staff'
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadStats();
  }, [filter]);

  const loadCurrentUser = async () => {
    const { data } = await db.profiles.getCurrentProfile();
    setCurrentUser(data);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'admin':
          result = await db.profiles.getAdmins();
          break;
        case 'staff':
          result = await db.profiles.getStaff();
          break;
        default:
          result = await db.profiles.getAll();
      }

      if (result.error) {
        console.error('Error al cargar usuarios:', result.error);
        return;
      }

      // Filtrar por búsqueda
      let data = result.data || [];
      if (searchQuery.trim()) {
        data = data.filter(u =>
          (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (u.phone && u.phone.includes(searchQuery))
        );
      }

      setUsers(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const { data } = await db.profiles.getEstadisticas();
    if (data) setStats(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
    loadStats();
  };

  useEffect(() => {
    if (searchQuery !== '') {
      const timer = setTimeout(() => {
        loadUsers();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadUsers();
    }
  }, [searchQuery]);

  const toggleMarketingAccess = async (userId, currentStatus) => {
    try {
      const { error } = await db.profiles.setMarketingAccess(userId, !currentStatus);
      
      if (error) {
        console.error('Error al cambiar marketing access:', error);
        return;
      }

      loadUsers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleCommunity = async (userId, currentStatus) => {
    try {
      const { error } = await db.profiles.setCommunityEnabled(userId, !currentStatus);
      
      if (error) {
        console.error('Error al cambiar comunidad:', error);
        return;
      }

      loadUsers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const changeUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    
    try {
      const { error } = await db.profiles.changeRole(userId, newRole);
      
      if (error) {
        console.error('Error al cambiar rol:', error);
        return;
      }

      loadUsers();
      loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getRoleColor = (role) => {
    return role === 'admin' ? '#D4AF37' : '#2196F3';
  };

  const getRoleIcon = (role) => {
    return role === 'admin' ? Crown : UserCheck;
  };

  const isCurrentUserAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando usuarios...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Usuarios
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {users.length} usuarios del sistema
        </Text>
      </View>

      {/* Estadísticas */}
      {stats && (
        <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3">
            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[120px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Total</Text>
              <Text className="text-2xl font-light text-[#2C2C2C]">{stats.totalUsuarios}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[120px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Admins</Text>
              <Text className="text-2xl font-light text-[#D4AF37]">{stats.admins}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[120px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Staff</Text>
              <Text className="text-2xl font-light text-[#2196F3]">{stats.staff}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Con Marketing</Text>
              <Text className="text-2xl font-light text-[#4CAF50]">{stats.conMarketingAccess}</Text>
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
            placeholder="Buscar por nombre o teléfono..."
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
            onPress={() => setFilter('todos')}
            className={`px-4 py-2 rounded-full ${filter === 'todos' ? 'bg-[#2C2C2C]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'todos' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('admin')}
            className={`px-4 py-2 rounded-full ${filter === 'admin' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'admin' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Admins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('staff')}
            className={`px-4 py-2 rounded-full ${filter === 'staff' ? 'bg-[#2196F3]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'staff' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Staff
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Usuarios */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {users.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Users size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {users.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              const isCurrentUser = currentUser?.id === user.id;
              
              return (
                <View key={user.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Header con Nombre y Rol */}
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-lg font-light text-[#2C2C2C]">
                          {user.full_name || 'Sin nombre'}
                        </Text>
                        {isCurrentUser && (
                          <View className="ml-2 px-2 py-1 rounded-full bg-[#D4AF37]/20">
                            <Text className="text-xs text-[#D4AF37] font-light">Tú</Text>
                          </View>
                        )}
                      </View>
                      
                      <View className="flex-row items-center">
                        <RoleIcon size={14} color={getRoleColor(user.role)} />
                        <Text 
                          className="ml-1 text-xs font-light capitalize"
                          style={{ color: getRoleColor(user.role) }}
                        >
                          {user.role}
                        </Text>
                      </View>
                    </View>

                    {/* Cambiar rol (solo para admins) */}
                    {isCurrentUserAdmin && !isCurrentUser && (
                      <TouchableOpacity 
                        onPress={() => changeUserRole(user.id, user.role)}
                        className="px-3 py-1 rounded-full bg-[#F0F0F0]"
                      >
                        <Text className="text-xs font-light text-[#2C2C2C]">
                          Cambiar rol
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Información de Contacto */}
                  {user.phone && (
                    <View className="flex-row items-center mb-2">
                      <Phone size={14} color="#C0C0C0" />
                      <Text className="ml-2 text-sm text-[#C0C0C0] font-light">
                        {user.phone}
                      </Text>
                    </View>
                  )}

                  {/* App Scope */}
                  {user.app_scope && (
                    <Text className="text-xs text-[#C0C0C0] font-light mb-3">
                      Ámbito: {user.app_scope}
                    </Text>
                  )}

                  {/* Permisos (solo para admins) */}
                  {isCurrentUserAdmin && (
                    <View className="pt-3 border-t border-[#F0F0F0] space-y-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-[#2C2C2C] font-light">
                          Acceso a Marketing
                        </Text>
                        <Switch
                          value={user.marketing_access}
                          onValueChange={() => toggleMarketingAccess(user.id, user.marketing_access)}
                          trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                          thumbColor="#FFFFFF"
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-[#2C2C2C] font-light">
                          Comunidad Habilitada
                        </Text>
                        <Switch
                          value={user.community_enabled}
                          onValueChange={() => toggleCommunity(user.id, user.community_enabled)}
                          trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
                          thumbColor="#FFFFFF"
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Fecha de registro */}
                  <View className="mt-3 pt-3 border-t border-[#F0F0F0]">
                    <Text className="text-xs text-[#C0C0C0] font-light">
                      Registrado {new Date(user.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nuevo Usuario (solo admins) */}
      {isCurrentUserAdmin && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
          style={{ elevation: 5 }}
        >
          <Text className="text-white text-3xl font-light">+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
