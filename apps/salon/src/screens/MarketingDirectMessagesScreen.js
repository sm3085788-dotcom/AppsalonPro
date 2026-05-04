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
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  Phone,
  Image as ImageIcon,
  Video,
  FileText,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function MarketingDirectMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedContentType, setSelectedContentType] = useState('Todos');
  const [estadisticas, setEstadisticas] = useState(null);

  const statusFilters = ['Todos', 'pending_sync', 'delivered', 'failed'];
  const contentTypeFilters = ['Todos', 'post', 'announcement', 'promotion', 'reminder'];

  useEffect(() => {
    cargarMensajes();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [messages, searchQuery, selectedStatus, selectedContentType]);

  const cargarMensajes = async () => {
    try {
      const { data, error } = await db.marketingDirectMessages.getAll();
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.marketingDirectMessages.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...messages];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(
        (msg) =>
          msg.content?.toLowerCase().includes(query) ||
          msg.client_name?.toLowerCase().includes(query) ||
          msg.client_phone?.toLowerCase().includes(query) ||
          msg.cliente?.nombre?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'Todos') {
      resultado = resultado.filter((msg) => msg.status === selectedStatus);
    }

    if (selectedContentType !== 'Todos') {
      resultado = resultado.filter((msg) => msg.content_type === selectedContentType);
    }

    setFilteredMessages(resultado);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarMensajes();
    cargarEstadisticas();
  };

  const handleMarkAsDelivered = async (id) => {
    try {
      const { data, error } = await db.marketingDirectMessages.markAsDelivered(id);
      if (error) throw error;
      setMessages((prev) => prev.map((msg) => (msg.id === id ? data : msg)));
      Alert.alert('Éxito', 'Mensaje marcado como entregado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar el mensaje como entregado');
      console.error(error);
    }
  };

  const handleMarkAsFailed = async (id) => {
    try {
      const { data, error } = await db.marketingDirectMessages.markAsFailed(id);
      if (error) throw error;
      setMessages((prev) => prev.map((msg) => (msg.id === id ? data : msg)));
      Alert.alert('Éxito', 'Mensaje marcado como fallido');
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar el mensaje como fallido');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'pending_sync':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return CheckCircle2;
      case 'pending_sync':
        return Clock;
      case 'failed':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      delivered: 'Entregado',
      pending_sync: 'Pendiente',
      failed: 'Fallido',
    };
    return labels[status] || status;
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'post':
        return FileText;
      case 'announcement':
        return MessageSquare;
      case 'promotion':
        return Send;
      case 'reminder':
        return Clock;
      default:
        return MessageSquare;
    }
  };

  const getMediaIcon = (mediaKind) => {
    switch (mediaKind) {
      case 'image':
        return ImageIcon;
      case 'video':
        return Video;
      default:
        return ImageIcon;
    }
  };

  const MessageCard = ({ message }) => {
    const StatusIcon = getStatusIcon(message.status);
    const ContentTypeIcon = getContentTypeIcon(message.content_type);
    const MediaIcon = message.media_kind ? getMediaIcon(message.media_kind) : null;

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <ContentTypeIcon size={16} color="#6B7280" />
              <Text className="ml-1 text-xs font-luxury-medium text-gray-600 uppercase">
                {message.content_type}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <User size={14} color="#6B7280" />
              <Text className="ml-1 text-sm font-luxury-medium text-gray-900">
                {message.client_name || message.cliente?.nombre || 'Sin nombre'}
              </Text>
            </View>
            {(message.client_phone || message.cliente?.telefono) && (
              <View className="flex-row items-center">
                <Phone size={14} color="#6B7280" />
                <Text className="ml-1 text-sm font-luxury-regular text-gray-600">
                  {message.client_phone || message.cliente?.telefono}
                </Text>
              </View>
            )}
          </View>
          <View className="items-end">
            <View className={`flex-row items-center px-3 py-1 rounded-full ${getStatusColor(message.status)}`}>
              <StatusIcon size={14} color="#FFFFFF" />
              <Text className="ml-1 text-xs font-luxury-medium text-white">
                {getStatusLabel(message.status)}
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-luxury-regular text-gray-700" numberOfLines={4}>
            {message.content}
          </Text>
        </View>

        {message.media_url && (
          <View className="mb-3 rounded-xl overflow-hidden bg-gray-100">
            {message.media_kind === 'image' ? (
              <Image
                source={{ uri: message.media_url }}
                className="w-full h-40"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-40 justify-center items-center">
                {MediaIcon && <MediaIcon size={40} color="#9CA3AF" />}
                <Text className="mt-2 text-sm font-luxury-regular text-gray-600">
                  Video
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs font-luxury-regular text-gray-500">
            {new Date(message.created_at).toLocaleString()}
          </Text>
          {message.delivered_at && (
            <Text className="text-xs font-luxury-regular text-green-600">
              Entregado: {new Date(message.delivered_at).toLocaleString()}
            </Text>
          )}
        </View>

        {message.created_by_name && (
          <Text className="text-xs font-luxury-regular text-gray-500 mb-3">
            Creado por: {message.created_by_name}
          </Text>
        )}

        <View className="flex-row space-x-2">
          {message.status === 'pending_sync' && (
            <>
              <TouchableOpacity
                onPress={() => handleMarkAsDelivered(message.id)}
                className="flex-1 bg-green-500 py-2 rounded-lg"
              >
                <Text className="text-center text-sm font-luxury-medium text-white">
                  Marcar Entregado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMarkAsFailed(message.id)}
                className="flex-1 bg-red-500 py-2 rounded-lg"
              >
                <Text className="text-center text-sm font-luxury-medium text-white">
                  Marcar Fallido
                </Text>
              </TouchableOpacity>
            </>
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
            Cargando mensajes...
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
              Mensajes Directos
            </Text>
            <Text className="text-base font-luxury-regular text-gray-600">
              Campañas de marketing dirigidas
            </Text>
          </View>

          {estadisticas && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-gray-900">
                    {estadisticas.totalMensajes}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Total
                  </Text>
                </View>
                <View className="flex-1 items-center border-l border-r border-gray-200">
                  <Text className="text-2xl font-luxury-medium text-green-600">
                    {estadisticas.delivered}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Entregados
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-yellow-600">
                    {estadisticas.pending}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Pendientes
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-around border-t border-gray-200 pt-4">
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-gray-700">
                    {estadisticas.tasaEntrega}%
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Tasa Entrega
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-gray-700">
                    {estadisticas.clientesUnicos}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Clientes
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-red-600">
                    {estadisticas.failed}
                  </Text>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Fallidos
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-luxury-medium text-blue-600">
                    {estadisticas.mensajesHoy}
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
                placeholder="Buscar mensajes..."
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
              {statusFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedStatus(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedStatus === filter
                      ? 'bg-luxury-gold'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedStatus === filter ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {filter === 'Todos' ? filter : getStatusLabel(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row items-center mb-2">
              <MessageSquare size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Tipo de Contenido
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {contentTypeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedContentType(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedContentType === filter
                      ? 'bg-blue-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedContentType === filter ? 'text-white' : 'text-gray-700'
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
              {filteredMessages.length} {filteredMessages.length === 1 ? 'Mensaje' : 'Mensajes'}
            </Text>
          </View>

          {filteredMessages.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <MessageSquare size={48} color="#D1D5DB" />
              <Text className="mt-4 text-base font-luxury-medium text-gray-900">
                No hay mensajes
              </Text>
              <Text className="mt-2 text-sm font-luxury-regular text-gray-600 text-center">
                {searchQuery || selectedStatus !== 'Todos'
                  ? 'No se encontraron mensajes con los filtros seleccionados'
                  : 'Aún no hay mensajes directos creados'}
              </Text>
            </View>
          ) : (
            filteredMessages.map((message) => <MessageCard key={message.id} message={message} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
