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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
  Unlock,
  Lock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react-native';
import { db } from '../../../../shared/config/supabaseClient';

export default function CajasScreen() {
  const [cajas, setCajas] = useState([]);
  const [cajaActual, setCajaActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [selectedCaja, setSelectedCaja] = useState(null);
  const [cuadre, setCuadre] = useState(null);
  
  // Modal states
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showCuadreModal, setShowCuadreModal] = useState(false);
  
  // Form states
  const [montoApertura, setMontoApertura] = useState('');
  const [responsableApertura, setResponsableApertura] = useState('');
  const [montoCierre, setMontoCierre] = useState('');
  const [responsableCierre, setResponsableCierre] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [cajasResult, cajaActualResult, statsResult] = await Promise.all([
        db.cajas.getAll(),
        db.cajas.getCajaActual(),
        db.cajas.getEstadisticas(),
      ]);

      if (!cajasResult.error) {
        setCajas(cajasResult.data || []);
      }

      if (!cajaActualResult.error && cajaActualResult.data) {
        setCajaActual(cajaActualResult.data);
      } else {
        setCajaActual(null);
      }

      if (!statsResult.error) {
        setEstadisticas(statsResult.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const handleAbrirCaja = async () => {
    if (!montoApertura || !responsableApertura) {
      Alert.alert('Error', 'Complete todos los campos');
      return;
    }

    try {
      const { data, error } = await db.cajas.abrir({
        monto_apertura: parseFloat(montoApertura),
        responsable: responsableApertura,
        responsable_apertura: responsableApertura,
      });

      if (error) {
        Alert.alert('Error', 'No se pudo abrir la caja');
        return;
      }

      Alert.alert('Éxito', 'Caja abierta correctamente');
      setShowAbrirModal(false);
      setMontoApertura('');
      setResponsableApertura('');
      cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al abrir la caja');
    }
  };

  const handleCerrarCaja = async () => {
    if (!montoCierre || !responsableCierre) {
      Alert.alert('Error', 'Complete todos los campos');
      return;
    }

    if (!cajaActual) {
      Alert.alert('Error', 'No hay caja abierta');
      return;
    }

    try {
      const { error } = await db.cajas.cerrar(cajaActual.id, {
        monto_cierre: parseFloat(montoCierre),
        responsable_cierre: responsableCierre,
      });

      if (error) {
        Alert.alert('Error', 'No se pudo cerrar la caja');
        return;
      }

      Alert.alert('Éxito', 'Caja cerrada correctamente');
      setShowCerrarModal(false);
      setMontoCierre('');
      setResponsableCierre('');
      cargarDatos();
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al cerrar la caja');
    }
  };

  const handleVerCuadre = async (cajaId) => {
    try {
      const { data, error } = await db.cajas.calcularCuadre(cajaId);
      
      if (error) {
        Alert.alert('Error', 'No se pudo calcular el cuadre');
        return;
      }

      setCuadre(data);
      setShowCuadreModal(true);
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al calcular el cuadre');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCuadreIcon = (estadoCuadre) => {
    if (estadoCuadre === 'correcto') return CheckCircle2;
    if (estadoCuadre === 'pendiente') return AlertTriangle;
    return AlertTriangle;
  };

  const getCuadreColor = (estadoCuadre) => {
    if (estadoCuadre === 'correcto') return '#4CAF50';
    if (estadoCuadre === 'pendiente') return '#FFA726';
    return '#f44336';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-[#C0C0C0] font-light">Cargando cajas...</Text>
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
            Cajas
          </Text>
          <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
            {estadisticas?.cajasAbiertas || 0} abierta(s) • {estadisticas?.cajasCerradas || 0} cerrada(s)
          </Text>
        </View>

        {/* Caja Actual */}
        {cajaActual && (
          <View className="px-6 mb-4">
            <View className="bg-[#D4AF37] rounded-2xl p-4 shadow-lg">
              <View className="flex-row items-center mb-3">
                <Unlock size={24} color="#FFFFFF" />
                <Text className="text-xl font-light text-white ml-2">
                  Caja Actual Abierta
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-xs text-white/80 font-light">Responsable</Text>
                  <Text className="text-base font-light text-white">
                    {cajaActual.responsable}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-white/80 font-light">Apertura</Text>
                  <Text className="text-2xl font-light text-white">
                    ${Number(cajaActual.monto_apertura).toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-white/80 font-light">
                Abierta: {formatDate(cajaActual.fecha_apertura)}
              </Text>

              <TouchableOpacity
                onPress={() => setShowCerrarModal(true)}
                className="bg-white rounded-full py-2 mt-3"
              >
                <Text className="text-center text-sm font-light text-[#D4AF37]">
                  Cerrar Caja
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Estadísticas */}
        {estadisticas && (
          <View className="px-6 mb-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-light text-[#2C2C2C] mb-3">
                Resumen General
              </Text>
              
              <View className="flex-row justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#D4AF37]">
                    {estadisticas.totalCajas}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Total Cajas</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#4CAF50]">
                    {estadisticas.cajasAbiertas}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Abiertas</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-light text-[#f44336]">
                    {estadisticas.cajasCerradas}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Cerradas</Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-[#F0F0F0]">
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    ${estadisticas.promedioApertura}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Prom. Apertura</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-light text-[#2C2C2C]">
                    ${estadisticas.promedioCierre}
                  </Text>
                  <Text className="text-xs text-[#C0C0C0] font-light">Prom. Cierre</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Botón Abrir Caja */}
        {!cajaActual && (
          <View className="px-6 mb-4">
            <TouchableOpacity
              onPress={() => setShowAbrirModal(true)}
              className="bg-[#4CAF50] rounded-2xl p-4 flex-row items-center justify-center shadow-sm"
            >
              <Unlock size={20} color="#FFFFFF" />
              <Text className="text-white font-light text-base ml-2">
                Abrir Nueva Caja
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Cajas */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-light text-[#2C2C2C] mb-3">
            Historial de Cajas
          </Text>
          
          {cajas.length === 0 ? (
            <View className="items-center justify-center py-16">
              <DollarSign size={64} color="#C0C0C0" />
              <Text className="text-[#C0C0C0] font-light mt-4">
                No hay cajas registradas
              </Text>
            </View>
          ) : (
            cajas.map(caja => {
              const isAbierta = caja.estado === 'abierta';

              return (
                <View key={caja.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  {/* Header con Estado */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      {isAbierta ? (
                        <Unlock size={16} color="#4CAF50" />
                      ) : (
                        <Lock size={16} color="#C0C0C0" />
                      )}
                      <Text
                        className="ml-2 text-sm font-light"
                        style={{ color: isAbierta ? '#4CAF50' : '#C0C0C0' }}
                      >
                        {isAbierta ? 'Abierta' : 'Cerrada'}
                      </Text>
                    </View>
                    <Text className="text-xs text-[#C0C0C0] font-light">
                      {formatDate(caja.fecha_apertura)}
                    </Text>
                  </View>

                  {/* Responsable */}
                  <View className="flex-row items-center mb-2">
                    <User size={14} color="#C0C0C0" />
                    <Text className="text-sm font-light text-[#2C2C2C] ml-2">
                      {caja.responsable}
                    </Text>
                  </View>

                  {/* Montos */}
                  <View className="flex-row justify-between pt-3 border-t border-[#F0F0F0]">
                    <View>
                      <Text className="text-xs text-[#C0C0C0] font-light">Apertura</Text>
                      <Text className="text-lg font-light text-[#4CAF50]">
                        ${Number(caja.monto_apertura).toFixed(2)}
                      </Text>
                    </View>
                    {!isAbierta && caja.monto_cierre && (
                      <View className="items-end">
                        <Text className="text-xs text-[#C0C0C0] font-light">Cierre</Text>
                        <Text className="text-lg font-light text-[#f44336]">
                          ${Number(caja.monto_cierre).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Botón Ver Cuadre */}
                  {!isAbierta && (
                    <TouchableOpacity
                      onPress={() => handleVerCuadre(caja.id)}
                      className="bg-[#42A5F5] rounded-full py-2 mt-3"
                    >
                      <Text className="text-center text-sm font-light text-white">
                        Ver Cuadre
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal Abrir Caja */}
      <Modal
        visible={showAbrirModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAbrirModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <Text className="text-2xl font-light text-[#2C2C2C] mb-4">
              Abrir Caja
            </Text>

            <Text className="text-sm text-[#C0C0C0] font-light mb-2">
              Monto de Apertura
            </Text>
            <TextInput
              className="bg-[#F8F8F8] rounded-lg px-4 py-3 text-base font-light text-[#2C2C2C] mb-4"
              placeholder="0.00"
              placeholderTextColor="#C0C0C0"
              keyboardType="decimal-pad"
              value={montoApertura}
              onChangeText={setMontoApertura}
            />

            <Text className="text-sm text-[#C0C0C0] font-light mb-2">
              Responsable
            </Text>
            <TextInput
              className="bg-[#F8F8F8] rounded-lg px-4 py-3 text-base font-light text-[#2C2C2C] mb-6"
              placeholder="Nombre del responsable"
              placeholderTextColor="#C0C0C0"
              value={responsableApertura}
              onChangeText={setResponsableApertura}
            />

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => setShowAbrirModal(false)}
                className="flex-1 bg-[#F0F0F0] rounded-lg py-3"
              >
                <Text className="text-center text-sm font-light text-[#2C2C2C]">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAbrirCaja}
                className="flex-1 bg-[#4CAF50] rounded-lg py-3"
              >
                <Text className="text-center text-sm font-light text-white">
                  Abrir Caja
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cerrar Caja */}
      <Modal
        visible={showCerrarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCerrarModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <Text className="text-2xl font-light text-[#2C2C2C] mb-4">
              Cerrar Caja
            </Text>

            <Text className="text-sm text-[#C0C0C0] font-light mb-2">
              Monto de Cierre (Real)
            </Text>
            <TextInput
              className="bg-[#F8F8F8] rounded-lg px-4 py-3 text-base font-light text-[#2C2C2C] mb-4"
              placeholder="0.00"
              placeholderTextColor="#C0C0C0"
              keyboardType="decimal-pad"
              value={montoCierre}
              onChangeText={setMontoCierre}
            />

            <Text className="text-sm text-[#C0C0C0] font-light mb-2">
              Responsable de Cierre
            </Text>
            <TextInput
              className="bg-[#F8F8F8] rounded-lg px-4 py-3 text-base font-light text-[#2C2C2C] mb-6"
              placeholder="Nombre del responsable"
              placeholderTextColor="#C0C0C0"
              value={responsableCierre}
              onChangeText={setResponsableCierre}
            />

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => setShowCerrarModal(false)}
                className="flex-1 bg-[#F0F0F0] rounded-lg py-3"
              >
                <Text className="text-center text-sm font-light text-[#2C2C2C]">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCerrarCaja}
                className="flex-1 bg-[#f44336] rounded-lg py-3"
              >
                <Text className="text-center text-sm font-light text-white">
                  Cerrar Caja
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cuadre */}
      <Modal
        visible={showCuadreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCuadreModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <Text className="text-2xl font-light text-[#2C2C2C] mb-4">
              Cuadre de Caja
            </Text>

            {cuadre && (
              <>
                <View className="mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Apertura</Text>
                    <Text className="text-sm font-light text-[#2C2C2C]">
                      ${cuadre.monto_apertura}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Ventas</Text>
                    <Text className="text-sm font-light text-[#4CAF50]">
                      +${cuadre.total_ventas}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Devoluciones</Text>
                    <Text className="text-sm font-light text-[#f44336]">
                      -${cuadre.total_devoluciones}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Cambios (Dif.)</Text>
                    <Text className="text-sm font-light text-[#42A5F5]">
                      +${cuadre.total_diferencias_cambios}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Entradas</Text>
                    <Text className="text-sm font-light text-[#4CAF50]">
                      +${cuadre.total_entradas}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#C0C0C0] font-light">Salidas</Text>
                    <Text className="text-sm font-light text-[#f44336]">
                      -${cuadre.total_salidas}
                    </Text>
                  </View>
                </View>

                <View className="border-t border-[#F0F0F0] pt-3 mb-3">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-base font-light text-[#2C2C2C]">Esperado</Text>
                    <Text className="text-base font-light text-[#2C2C2C]">
                      ${cuadre.monto_cierre_esperado}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-base font-light text-[#2C2C2C]">Real</Text>
                    <Text className="text-base font-light text-[#2C2C2C]">
                      ${cuadre.monto_cierre_real || 'N/A'}
                    </Text>
                  </View>
                  {cuadre.diferencia !== null && (
                    <View className="flex-row justify-between items-center pt-2 border-t border-[#F0F0F0]">
                      <Text className="text-lg font-light text-[#2C2C2C]">Diferencia</Text>
                      <View className="flex-row items-center">
                        {Number(cuadre.diferencia) > 0 ? (
                          <TrendingUp size={20} color="#4CAF50" />
                        ) : Number(cuadre.diferencia) < 0 ? (
                          <TrendingDown size={20} color="#f44336" />
                        ) : (
                          <CheckCircle2 size={20} color="#4CAF50" />
                        )}
                        <Text
                          className="text-xl font-light ml-2"
                          style={{
                            color: Number(cuadre.diferencia) === 0 ? '#4CAF50' : Number(cuadre.diferencia) > 0 ? '#4CAF50' : '#f44336'
                          }}
                        >
                          ${cuadre.diferencia}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowCuadreModal(false)}
              className="bg-[#D4AF37] rounded-lg py-3"
            >
              <Text className="text-center text-sm font-light text-white">
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
