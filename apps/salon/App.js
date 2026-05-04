import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Package, Users, Settings } from 'lucide-react-native';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-6 pt-8 pb-6">
        <Text className="text-3xl font-light text-[#2C2C2C] tracking-wider">
          AppSalon Pro
        </Text>
        <Text className="text-sm text-[#C0C0C0] mt-1 font-light">
          Gestión Profesional
        </Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6">
        <View className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <Text className="text-lg font-light text-[#2C2C2C] mb-4">
            Bienvenido
          </Text>
          <Text className="text-sm text-[#C0C0C0] font-light leading-5">
            Gestiona tu salón de forma elegante y eficiente. Conecta con Supabase para comenzar.
          </Text>
        </View>

        {/* Quick Actions */}
        <Text className="text-xs text-[#C0C0C0] uppercase tracking-widest mb-3 font-light">
          Acciones Rápidas
        </Text>
        
        <View className="space-y-3">
          <TouchableOpacity className="bg-white rounded-xl p-4 flex-row items-center shadow-sm">
            <View className="w-10 h-10 bg-[#FDFBF7] rounded-full items-center justify-center mr-4">
              <Calendar size={20} color="#D4AF37" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-light text-[#2C2C2C]">Citas</Text>
              <Text className="text-xs text-[#C0C0C0] font-light">Gestionar agenda</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-xl p-4 flex-row items-center shadow-sm">
            <View className="w-10 h-10 bg-[#FDFBF7] rounded-full items-center justify-center mr-4">
              <Users size={20} color="#D4AF37" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-light text-[#2C2C2C]">Clientes</Text>
              <Text className="text-xs text-[#C0C0C0] font-light">Base de datos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-xl p-4 flex-row items-center shadow-sm">
            <View className="w-10 h-10 bg-[#FDFBF7] rounded-full items-center justify-center mr-4">
              <Package size={20} color="#D4AF37" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-light text-[#2C2C2C]">Inventario</Text>
              <Text className="text-xs text-[#C0C0C0] font-light">Productos y servicios</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-xl p-4 flex-row items-center shadow-sm">
            <View className="w-10 h-10 bg-[#FDFBF7] rounded-full items-center justify-center mr-4">
              <Settings size={20} color="#D4AF37" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-light text-[#2C2C2C]">Configuración</Text>
              <Text className="text-xs text-[#C0C0C0] font-light">Ajustes del sistema</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-[#F0F0F0]">
        <Text className="text-xs text-center text-[#C0C0C0] font-light">
          Versión 1.0.0 • Powered by Supabase
        </Text>
      </View>
    </SafeAreaView>
  );
}
