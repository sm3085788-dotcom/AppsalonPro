# Componentes - App Salón

Esta carpeta contiene componentes reutilizables de la UI.

## Estructura Sugerida

```
components/
├── common/          # Componentes compartidos (Button, Card, Input, etc.)
├── appointments/    # Componentes específicos de citas
├── clients/         # Componentes específicos de clientes
├── inventory/       # Componentes específicos de inventario
└── settings/        # Componentes de configuración
```

## Estilo de Código

- Usar componentes funcionales con hooks
- Aplicar NativeWind para estilos (className)
- Mantener componentes pequeños y enfocados
- Documentar props con comentarios

## Ejemplo

```jsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';

export const AppointmentCard = ({ appointment, onPress }) => {
  return (
    <TouchableOpacity 
      className="bg-white rounded-xl p-4 shadow-sm"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <Calendar size={20} color="#D4AF37" />
        <Text className="ml-2 text-base font-light text-[#2C2C2C]">
          {appointment.client_name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
```
