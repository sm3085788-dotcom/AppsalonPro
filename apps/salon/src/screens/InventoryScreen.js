import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Search, AlertTriangle, TrendingDown, ShoppingCart, Barcode } from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function InventoryScreen() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('todos'); // 'todos', 'bajo_stock', 'sin_stock', 'tienda'
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadProductos();
    loadStats();
  }, [filter]);

  const loadProductos = async () => {
    try {
      setLoading(true);
      let result;

      switch (filter) {
        case 'bajo_stock':
          result = await db.inventario.getStockBajo();
          break;
        case 'sin_stock':
          result = await db.inventario.getSinStock();
          break;
        case 'tienda':
          result = await db.inventario.getVisiblesEnTienda();
          break;
        default:
          result = await db.inventario.getAll();
      }

      if (result.error) {
        console.error('Error al cargar productos:', result.error);
        return;
      }

      // Filtrar por búsqueda
      let data = result.data || [];
      if (searchQuery.trim()) {
        data = data.filter(p =>
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.barcode && p.barcode.includes(searchQuery))
        );
      }

      setProductos(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const { data } = await db.inventario.getEstadisticas();
    if (data) setStats(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProductos();
    loadStats();
  };

  useEffect(() => {
    if (searchQuery !== '') {
      const timer = setTimeout(() => {
        loadProductos();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadProductos();
    }
  }, [searchQuery]);

  const toggleVisibilidadTienda = async (productoId, currentStatus) => {
    try {
      const { error } = await db.inventario.setVisibilidadTienda(productoId, !currentStatus);
      
      if (error) {
        console.error('Error al cambiar visibilidad:', error);
        return;
      }

      loadProductos();
      loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStockColor = (producto) => {
    if (producto.stock_actual === 0) return '#f44336';
    if (producto.stock_actual <= producto.stock_minimo) return '#FFA726';
    return '#4CAF50';
  };

  const getStockStatus = (producto) => {
    if (producto.stock_actual === 0) return 'Sin stock';
    if (producto.stock_actual <= producto.stock_minimo) return 'Stock bajo';
    return 'Stock normal';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando inventario...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          Inventario
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          {productos.length} productos
        </Text>
      </View>

      {/* Estadísticas */}
      {stats && (
        <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3">
            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Total Productos</Text>
              <Text className="text-2xl font-light text-[#2C2C2C]">{stats.totalProductos}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Stock Bajo</Text>
              <Text className="text-2xl font-light text-[#FFA726]">{stats.productosBajoStock}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Sin Stock</Text>
              <Text className="text-2xl font-light text-[#f44336]">{stats.productosSinStock}</Text>
            </View>

            <View className="bg-white rounded-2xl p-4 shadow-sm min-w-[140px]">
              <Text className="text-xs text-[#C0C0C0] font-light mb-1">Valor Total</Text>
              <Text className="text-xl font-light text-[#D4AF37]">${stats.valorInventario}</Text>
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
            placeholder="Buscar producto, categoría o código..."
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
            className={`px-4 py-2 rounded-full ${filter === 'todos' ? 'bg-[#D4AF37]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'todos' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('bajo_stock')}
            className={`px-4 py-2 rounded-full ${filter === 'bajo_stock' ? 'bg-[#FFA726]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'bajo_stock' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Stock Bajo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('sin_stock')}
            className={`px-4 py-2 rounded-full ${filter === 'sin_stock' ? 'bg-[#f44336]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'sin_stock' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              Sin Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFilter('tienda')}
            className={`px-4 py-2 rounded-full ${filter === 'tienda' ? 'bg-[#4CAF50]' : 'bg-white'}`}
          >
            <Text className={`font-light ${filter === 'tienda' ? 'text-white' : 'text-[#2C2C2C]'}`}>
              En Tienda
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de Productos */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
      >
        {productos.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Package size={64} color="#C0C0C0" />
            <Text className="text-[#C0C0C0] font-light mt-4">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos en inventario'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {productos.map((producto) => (
              <View key={producto.id} className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Header con Nombre y Categoría */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-light text-[#2C2C2C] mb-1">
                      {producto.nombre}
                    </Text>
                    {producto.categoria && (
                      <Text className="text-xs text-[#C0C0C0] font-light">
                        {producto.categoria}
                      </Text>
                    )}
                  </View>

                  {/* Visible en tienda */}
                  <View className="flex-row items-center">
                    <ShoppingCart size={16} color={producto.visible_en_tienda ? '#4CAF50' : '#C0C0C0'} />
                    <Switch
                      value={producto.visible_en_tienda}
                      onValueChange={() => toggleVisibilidadTienda(producto.id, producto.visible_en_tienda)}
                      trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                </View>

                {/* Stock Status */}
                <View className="flex-row items-center mb-3">
                  {producto.stock_actual <= producto.stock_minimo && (
                    <AlertTriangle size={16} color={getStockColor(producto)} />
                  )}
                  <Text 
                    className="text-sm font-light ml-2"
                    style={{ color: getStockColor(producto) }}
                  >
                    {getStockStatus(producto)}
                  </Text>
                </View>

                {/* Stock y Precios */}
                <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-[#F0F0F0]">
                  <View>
                    <Text className="text-xs text-[#C0C0C0] font-light">Stock Actual</Text>
                    <Text className="text-2xl font-light text-[#2C2C2C]">
                      {producto.stock_actual}
                    </Text>
                    <Text className="text-xs text-[#C0C0C0] font-light">
                      Mín: {producto.stock_minimo}
                    </Text>
                  </View>

                  <View className="items-end">
                    {producto.precio_venta && (
                      <>
                        <Text className="text-xs text-[#C0C0C0] font-light">Precio Venta</Text>
                        <Text className="text-xl font-light text-[#D4AF37]">
                          ${Number(producto.precio_venta).toFixed(2)}
                        </Text>
                      </>
                    )}
                    {producto.costo && (
                      <Text className="text-xs text-[#C0C0C0] font-light mt-1">
                        Costo: ${Number(producto.costo).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Barcode y Ubicación */}
                <View className="flex-row justify-between items-center">
                  {producto.barcode && (
                    <View className="flex-row items-center">
                      <Barcode size={14} color="#C0C0C0" />
                      <Text className="text-xs text-[#C0C0C0] font-light ml-1">
                        {producto.barcode}
                      </Text>
                    </View>
                  )}
                  {producto.ubicacion && (
                    <Text className="text-xs text-[#C0C0C0] font-light">
                      📍 {producto.ubicacion}
                    </Text>
                  )}
                </View>

                {/* Fecha de Vencimiento */}
                {producto.fecha_vencimiento && (
                  <View className="mt-2 pt-2 border-t border-[#F0F0F0]">
                    <Text className="text-xs text-[#FFA726] font-light">
                      Vence: {new Date(producto.fecha_vencimiento).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón Flotante para Nuevo Producto */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
