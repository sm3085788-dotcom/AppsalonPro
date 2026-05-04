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
  Megaphone,
  Eye,
  Heart,
  Search,
  Filter,
  Globe,
  Lock,
  Users,
  FileText,
  Image as ImageIcon,
  Video,
  Calendar,
  Send,
  Archive,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function MarketingPostsScreen() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedContentType, setSelectedContentType] = useState('Todos');
  const [selectedVisibility, setSelectedVisibility] = useState('Todos');
  const [estadisticas, setEstadisticas] = useState(null);

  const statusFilters = ['Todos', 'published', 'draft', 'archived'];
  const contentTypeFilters = ['Todos', 'post', 'announcement', 'promotion', 'event'];
  const visibilityFilters = ['Todos', 'public', 'private', 'members'];

  useEffect(() => {
    cargarPosts();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [posts, searchQuery, selectedStatus, selectedContentType, selectedVisibility]);

  const cargarPosts = async () => {
    try {
      const { data, error } = await db.marketingPosts.getAll();
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los posts');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data } = await db.marketingPosts.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...posts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(
        (post) =>
          post.title?.toLowerCase().includes(query) ||
          post.body?.toLowerCase().includes(query) ||
          post.author_name?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'Todos') {
      resultado = resultado.filter((post) => post.status === selectedStatus);
    }

    if (selectedContentType !== 'Todos') {
      resultado = resultado.filter((post) => post.content_type === selectedContentType);
    }

    if (selectedVisibility !== 'Todos') {
      resultado = resultado.filter((post) => post.visibility === selectedVisibility);
    }

    setFilteredPosts(resultado);
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarPosts();
    cargarEstadisticas();
  };

  const handlePublish = async (id) => {
    try {
      const { data, error } = await db.marketingPosts.publish(id);
      if (error) throw error;
      setPosts((prev) => prev.map((post) => (post.id === id ? data : post)));
      Alert.alert('Éxito', 'Post publicado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo publicar el post');
      console.error(error);
    }
  };

  const handleUnpublish = async (id) => {
    try {
      const { data, error } = await db.marketingPosts.unpublish(id);
      if (error) throw error;
      setPosts((prev) => prev.map((post) => (post.id === id ? data : post)));
      Alert.alert('Éxito', 'Post movido a borradores');
    } catch (error) {
      Alert.alert('Error', 'No se pudo mover a borradores');
      console.error(error);
    }
  };

  const handleArchive = async (id) => {
    Alert.alert(
      'Archivar Post',
      '¿Estás seguro de que quieres archivar este post?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await db.marketingPosts.archive(id);
              if (error) throw error;
              setPosts((prev) => prev.map((post) => (post.id === id ? data : post)));
              Alert.alert('Éxito', 'Post archivado');
            } catch (error) {
              Alert.alert('Error', 'No se pudo archivar el post');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      published: 'Publicado',
      draft: 'Borrador',
      archived: 'Archivado',
    };
    return labels[status] || status;
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public':
        return Globe;
      case 'private':
        return Lock;
      case 'members':
        return Users;
      default:
        return Globe;
    }
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'post':
        return FileText;
      case 'announcement':
        return Megaphone;
      case 'promotion':
        return Send;
      case 'event':
        return Calendar;
      default:
        return FileText;
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

  const PostCard = ({ post }) => {
    const VisibilityIcon = getVisibilityIcon(post.visibility);
    const ContentTypeIcon = getContentTypeIcon(post.content_type);
    const MediaIcon = post.media_kind ? getMediaIcon(post.media_kind) : null;

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <ContentTypeIcon size={16} color="#6B7280" />
              <Text className="ml-1 text-xs font-luxury-medium text-gray-600 uppercase">
                {post.content_type}
              </Text>
              <View className="ml-2">
                <VisibilityIcon size={14} color="#9CA3AF" />
              </View>
            </View>
            {post.title && (
              <Text className="text-lg font-luxury-medium text-gray-900 mb-2">
                {post.title}
              </Text>
            )}
            <Text
              className="text-sm font-luxury-regular text-gray-700"
              numberOfLines={3}
            >
              {post.body}
            </Text>
          </View>
        </View>

        {post.media_url && (
          <View className="mb-3 rounded-xl overflow-hidden bg-gray-100">
            {post.media_kind === 'image' ? (
              <Image
                source={{ uri: post.media_url }}
                className="w-full h-48"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-48 justify-center items-center">
                {MediaIcon && <MediaIcon size={48} color="#9CA3AF" />}
                <Text className="mt-2 text-sm font-luxury-regular text-gray-600">
                  Video
                </Text>
              </View>
            )}
          </View>
        )}

        {post.cta_text && (
          <View className="mb-3 bg-luxury-gold/10 px-3 py-2 rounded-lg">
            <Text className="text-sm font-luxury-medium text-luxury-gold">
              📢 {post.cta_text}
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <Eye size={16} color="#6B7280" />
              <Text className="ml-1 text-sm font-luxury-regular text-gray-600">
                {post.views_count || 0}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Heart size={16} color="#EF4444" />
              <Text className="ml-1 text-sm font-luxury-regular text-gray-600">
                {post.reactions_count || 0}
              </Text>
            </View>
          </View>
          <View className={`px-3 py-1 rounded-full ${getStatusColor(post.status)}`}>
            <Text className="text-xs font-luxury-medium text-white">
              {getStatusLabel(post.status)}
            </Text>
          </View>
        </View>

        {post.author_name && (
          <Text className="text-xs font-luxury-regular text-gray-500 mb-3">
            Por {post.author_name} •{' '}
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        )}

        <View className="flex-row space-x-2">
          {post.status === 'draft' && (
            <TouchableOpacity
              onPress={() => handlePublish(post.id)}
              className="flex-1 bg-green-500 py-2 rounded-lg"
            >
              <Text className="text-center text-sm font-luxury-medium text-white">
                Publicar
              </Text>
            </TouchableOpacity>
          )}
          {post.status === 'published' && (
            <>
              <TouchableOpacity
                onPress={() => handleUnpublish(post.id)}
                className="flex-1 bg-yellow-500 py-2 rounded-lg"
              >
                <Text className="text-center text-sm font-luxury-medium text-white">
                  A Borrador
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleArchive(post.id)}
                className="flex-1 bg-gray-500 py-2 rounded-lg"
              >
                <Text className="text-center text-sm font-luxury-medium text-white">
                  Archivar
                </Text>
              </TouchableOpacity>
            </>
          )}
          {post.status === 'archived' && (
            <TouchableOpacity
              onPress={() => handlePublish(post.id)}
              className="flex-1 bg-blue-500 py-2 rounded-lg"
            >
              <Text className="text-center text-sm font-luxury-medium text-white">
                Restaurar
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
            Cargando posts...
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
              Marketing Posts
            </Text>
            <Text className="text-base font-luxury-regular text-gray-600">
              Gestión de contenido y publicaciones
            </Text>
          </View>

          {estadisticas && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-gray-900">
                    {estadisticas.totalPosts}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Total
                  </Text>
                </View>
                <View className="flex-1 items-center border-l border-r border-gray-200">
                  <Text className="text-2xl font-luxury-medium text-green-600">
                    {estadisticas.published}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Publicados
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-luxury-medium text-yellow-600">
                    {estadisticas.drafts}
                  </Text>
                  <Text className="text-sm font-luxury-regular text-gray-600">
                    Borradores
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-around border-t border-gray-200 pt-4">
                <View className="items-center">
                  <View className="flex-row items-center">
                    <Eye size={16} color="#6B7280" />
                    <Text className="ml-1 text-lg font-luxury-medium text-gray-700">
                      {estadisticas.totalViews}
                    </Text>
                  </View>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Vistas Totales
                  </Text>
                </View>
                <View className="items-center">
                  <View className="flex-row items-center">
                    <Heart size={16} color="#EF4444" />
                    <Text className="ml-1 text-lg font-luxury-medium text-gray-700">
                      {estadisticas.totalReactions}
                    </Text>
                  </View>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Reacciones
                  </Text>
                </View>
                <View className="items-center">
                  <View className="flex-row items-center">
                    <ImageIcon size={16} color="#6B7280" />
                    <Text className="ml-1 text-lg font-luxury-medium text-gray-700">
                      {estadisticas.withMedia}
                    </Text>
                  </View>
                  <Text className="text-xs font-luxury-regular text-gray-500">
                    Con Media
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
                placeholder="Buscar posts..."
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
              <FileText size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Tipo de Contenido
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
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

            <View className="flex-row items-center mb-2">
              <Globe size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-luxury-medium text-gray-700">
                Visibilidad
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {visibilityFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedVisibility(filter)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedVisibility === filter
                      ? 'bg-purple-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-luxury-medium ${
                      selectedVisibility === filter ? 'text-white' : 'text-gray-700'
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
              {filteredPosts.length} {filteredPosts.length === 1 ? 'Post' : 'Posts'}
            </Text>
          </View>

          {filteredPosts.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Megaphone size={48} color="#D1D5DB" />
              <Text className="mt-4 text-base font-luxury-medium text-gray-900">
                No hay posts
              </Text>
              <Text className="mt-2 text-sm font-luxury-regular text-gray-600 text-center">
                {searchQuery || selectedStatus !== 'Todos'
                  ? 'No se encontraron posts con los filtros seleccionados'
                  : 'Aún no hay posts creados'}
              </Text>
            </View>
          ) : (
            filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
