import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Star, User } from 'lucide-react-native';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />
      
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-8 pb-6">
          <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
            AppSalon Pro
          </Text>
          <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
            Tu belleza, tu estilo
          </Text>
        </View>

        {/* Hero Section */}
        <View className="px-6 mb-6">
          <View className="bg-gradient-to-br from-[#D4AF37] to-[#C0C0C0] rounded-3xl p-8 shadow-lg">
            <Text className="text-2xl font-light text-white mb-2">
              Reserva tu Cita
            </Text>
            <Text className="text-sm text-white/90 font-light mb-6 leading-5">
              Experimenta el lujo y la elegancia en cada visita
            </Text>
            <TouchableOpacity className="bg-white rounded-full py-3 px-6 self-start">
              <Text className="text-[#D4AF37] font-light">Agendar Ahora</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Preview */}
        <View className="px-6 mb-6">
          <Text className="text-xs text-[#C0C0C0] uppercase tracking-widest mb-4 font-light">
            Servicios Destacados
          </Text>
          
          <View className="space-y-3">
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Star size={16} color="#D4AF37" fill="#D4AF37" />
                <Text className="text-base font-light text-[#2C2C2C] ml-2">
                  Corte Premium
                </Text>
              </View>
              <Text className="text-xs text-[#C0C0C0] font-light mb-2">
                Corte personalizado con estilista experto
              </Text>
              <Text className="text-lg font-light text-[#D4AF37]">$45.00</Text>
            </View>

            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Star size={16} color="#D4AF37" fill="#D4AF37" />
                <Text className="text-base font-light text-[#2C2C2C] ml-2">
                  Tratamiento Spa
                </Text>
              </View>
              <Text className="text-xs text-[#C0C0C0] font-light mb-2">
                Relajación total y cuidado facial
              </Text>
              <Text className="text-lg font-light text-[#D4AF37]">$85.00</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-xs text-[#C0C0C0] uppercase tracking-widest mb-3 font-light">
            Acceso Rápido
          </Text>
          
          <View className="flex-row space-x-3">
            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm">
              <View className="w-12 h-12 bg-[#FDFBF7] rounded-full items-center justify-center mb-2">
                <Calendar size={24} color="#D4AF37" />
              </View>
              <Text className="text-sm font-light text-[#2C2C2C]">Mis Citas</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm">
              <View className="w-12 h-12 bg-[#FDFBF7] rounded-full items-center justify-center mb-2">
                <Clock size={24} color="#D4AF37" />
              </View>
              <Text className="text-sm font-light text-[#2C2C2C]">Historial</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center shadow-sm">
              <View className="w-12 h-12 bg-[#FDFBF7] rounded-full items-center justify-center mb-2">
                <User size={24} color="#D4AF37" />
              </View>
              <Text className="text-sm font-light text-[#2C2C2C]">Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View className="px-6 mb-6">
          <View className="bg-[#2C2C2C] rounded-2xl p-6">
            <Text className="text-white font-light text-base mb-2">
              ¿Primera visita?
            </Text>
            <Text className="text-white/70 text-xs font-light leading-5 mb-4">
              Obtén un 20% de descuento en tu primer servicio
            </Text>
            <TouchableOpacity className="bg-[#D4AF37] rounded-full py-2 px-4 self-start">
              <Text className="text-white font-light text-sm">Reclamar Oferta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="px-6 py-4 border-t border-[#F0F0F0] bg-white">
        <Text className="text-xs text-center text-[#C0C0C0] font-light">
          Versión 1.0.0 • Tu salón de confianza
        </Text>
      </View>
    </SafeAreaView>
  );
}
