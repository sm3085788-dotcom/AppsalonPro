# Componentes - App Clientes

Esta carpeta contiene componentes reutilizables de la UI.

## Estructura Sugerida

```
components/
├── common/          # Componentes compartidos (Button, Card, Input, etc.)
├── booking/         # Componentes de reserva
├── services/        # Componentes de servicios
├── profile/         # Componentes de perfil
└── history/         # Componentes de historial
```

## Estilo de Código

- Usar componentes funcionales con hooks
- Aplicar NativeWind para estilos (className)
- Mantener componentes pequeños y enfocados
- Diseño enfocado en experiencia del cliente

## Ejemplo

```jsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';

export const ServiceCard = ({ service, onBook }) => {
  return (
    <View className="bg-white rounded-2xl p-5 shadow-sm">
      <View className="flex-row items-center mb-2">
        <Star size={16} color="#D4AF37" fill="#D4AF37" />
        <Text className="text-base font-light text-[#2C2C2C] ml-2">
          {service.name}
        </Text>
      </View>
      <Text className="text-xs text-[#C0C0C0] font-light mb-2">
        {service.description}
      </Text>
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-light text-[#D4AF37]">
          ${service.price}
        </Text>
        <TouchableOpacity 
          className="bg-[#D4AF37] rounded-full px-4 py-2"
          onPress={() => onBook(service)}
        >
          <Text className="text-white font-light text-sm">Reservar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```
