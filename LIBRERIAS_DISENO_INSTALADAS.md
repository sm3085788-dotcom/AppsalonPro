# 🎨 Librerías de Diseño Instaladas - AppSalon Pro

## ✅ Todas las librerías de diseño instaladas en ambas apps

### 🎨 **Sistema de Diseño y UI**

| Librería | Descripción | Estado |
|----------|-------------|--------|
| `react-native-paper` | Material Design completo con temas | ✅ |
| `expo-linear-gradient` | Degradados y fondos elegantes | ✅ |
| `expo-blur` | Efectos de blur (glassmorphism) | ✅ |
| `react-native-svg` | Gráficos vectoriales e iconos | ✅ |
| `react-native-reanimated` | Animaciones fluidas 60 FPS | ✅ |
| `lottie-react-native` | Animaciones JSON profesionales | ✅ |
| `react-native-responsive-screen` | Layout responsive | ✅ |

---

## 🎨 **1. React Native Paper (Material Design)**

### Instalación
✅ Ya instalado en ambas apps

### Configuración
```jsx
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D4AF37',      // Oro
    accent: '#C0C0C0',       // Plata
    background: '#FDFBF7',   // Crema
    surface: '#FFFFFF',      // Blanco
    text: '#2C2C2C',         // Charcoal
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <YourApp />
    </PaperProvider>
  );
}
```

### Componentes Disponibles
```jsx
import {
  Button,
  Card,
  TextInput,
  FAB,
  Dialog,
  Portal,
  Snackbar,
  Chip,
  Avatar,
  Badge,
  Divider,
  List,
  Menu,
  ProgressBar,
  RadioButton,
  Switch,
  DataTable,
} from 'react-native-paper';

// Botón con icono
<Button 
  icon="calendar" 
  mode="contained"
  onPress={() => console.log('Presionado')}
>
  Agendar Cita
</Button>

// Card elegante
<Card>
  <Card.Cover source={{ uri: 'https://example.com/image.jpg' }} />
  <Card.Title title="Corte Premium" subtitle="$45.00" />
  <Card.Content>
    <Text>Corte personalizado con estilista experto</Text>
  </Card.Content>
  <Card.Actions>
    <Button>Cancelar</Button>
    <Button mode="contained">Reservar</Button>
  </Card.Actions>
</Card>

// Input con validación
<TextInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  mode="outlined"
  left={<TextInput.Icon icon="email" />}
  error={emailError}
/>

// FAB (Floating Action Button)
<FAB
  icon="plus"
  style={styles.fab}
  onPress={() => console.log('Pressed')}
/>

// Dialog/Modal
<Portal>
  <Dialog visible={visible} onDismiss={hideDialog}>
    <Dialog.Title>Confirmar</Dialog.Title>
    <Dialog.Content>
      <Text>¿Estás seguro de eliminar esta cita?</Text>
    </Dialog.Content>
    <Dialog.Actions>
      <Button onPress={hideDialog}>Cancelar</Button>
      <Button onPress={confirmar}>Eliminar</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

---

## 🌈 **2. Expo Linear Gradient (Degradados)**

### Uso Básico
```jsx
import { LinearGradient } from 'expo-linear-gradient';

// Degradado vertical (oro a plata)
<LinearGradient
  colors={['#D4AF37', '#C0C0C0']}
  style={{ flex: 1, padding: 20 }}
>
  <Text>Contenido sobre degradado</Text>
</LinearGradient>

// Degradado horizontal
<LinearGradient
  colors={['#D4AF37', '#C0C0C0', '#FDFBF7']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.container}
>
  <Text>De izquierda a derecha</Text>
</LinearGradient>

// Degradado diagonal
<LinearGradient
  colors={['#D4AF37', '#C0C0C0']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.container}
/>

// Con múltiples stops
<LinearGradient
  colors={['#D4AF37', '#C0C0C0', '#FDFBF7', '#FFFFFF']}
  locations={[0, 0.3, 0.7, 1]}
  style={styles.container}
/>
```

### Ejemplos para AppSalon
```jsx
// Header con degradado
<LinearGradient
  colors={['#D4AF37', '#C0C0C0']}
  style={styles.header}
>
  <Text style={styles.headerText}>AppSalon Pro</Text>
</LinearGradient>

// Botón con degradado
<TouchableOpacity onPress={onPress}>
  <LinearGradient
    colors={['#D4AF37', '#B8A134']}
    style={styles.button}
  >
    <Text style={styles.buttonText}>Reservar Ahora</Text>
  </LinearGradient>
</TouchableOpacity>

// Card con fondo degradado sutil
<LinearGradient
  colors={['#FFFFFF', '#FDFBF7']}
  style={styles.card}
>
  <Text>Contenido del card</Text>
</LinearGradient>
```

---

## 🌫️ **3. Expo Blur (Efectos Glassmorphism)**

### Uso Básico
```jsx
import { BlurView } from 'expo-blur';

// Blur simple
<BlurView intensity={80} style={styles.blurContainer}>
  <Text>Contenido con blur</Text>
</BlurView>

// Blur con tint
<BlurView 
  intensity={100} 
  tint="light"  // light, dark, default
  style={styles.blurContainer}
>
  <Text>Blur claro</Text>
</BlurView>
```

### Efectos Glassmorphism
```jsx
// Overlay con glassmorphism
<ImageBackground source={backgroundImage} style={styles.background}>
  <BlurView intensity={90} tint="light" style={styles.glassCard}>
    <Text style={styles.title}>AppSalon Pro</Text>
    <Text style={styles.subtitle}>Reserva tu cita</Text>
    <Button mode="contained">Agendar</Button>
  </BlurView>
</ImageBackground>

const styles = StyleSheet.create({
  glassCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

// Modal con blur de fondo
<Modal transparent visible={visible}>
  <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text>Contenido del modal</Text>
    </View>
  </BlurView>
</Modal>
```

---

## 🎭 **4. React Native SVG (Vectores e Iconos)**

### Uso Básico
```jsx
import Svg, { Circle, Rect, Path, Text as SvgText, G } from 'react-native-svg';

// Círculo simple
<Svg height="100" width="100">
  <Circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="2" fill="#FDFBF7" />
</Svg>

// Logo personalizado
<Svg height="50" width="200" viewBox="0 0 200 50">
  <Path
    d="M10,25 Q25,10 40,25 T70,25"
    stroke="#D4AF37"
    strokeWidth="3"
    fill="none"
  />
  <SvgText
    x="80"
    y="30"
    fontSize="20"
    fontWeight="300"
    fill="#2C2C2C"
  >
    AppSalon Pro
  </SvgText>
</Svg>

// Ícono personalizado
<Svg height="24" width="24" viewBox="0 0 24 24">
  <Path
    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
    fill="#D4AF37"
  />
</Svg>
```

---

## ✨ **5. React Native Reanimated (Animaciones)**

### Configuración
✅ Ya configurado en `babel.config.js`

### Animaciones Básicas
```jsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';

// Fade In simple
<Animated.View entering={FadeIn}>
  <Text>Aparece con fade</Text>
</Animated.View>

// Slide In desde la derecha
<Animated.View entering={SlideInRight.duration(300)}>
  <Card>Contenido</Card>
</Animated.View>

// Zoom In
<Animated.View entering={ZoomIn.delay(200)}>
  <Image source={logo} />
</Animated.View>

// Animación controlada
function AnimatedButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.2, {}, () => {
      scale.value = withSpring(1);
    });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress}>
        <Text>Presióname</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
```

### Animaciones Complejas
```jsx
import { useAnimatedScrollHandler } from 'react-native-reanimated';

// Parallax scroll
function ParallaxHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - scrollY.value / 200,
    transform: [{ translateY: -scrollY.value * 0.5 }],
  }));

  return (
    <>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text>Header con parallax</Text>
      </Animated.View>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* Contenido */}
      </Animated.ScrollView>
    </>
  );
}

// Lista con animación stagger
<FlatList
  data={items}
  renderItem={({ item, index }) => (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
    >
      <Card>{item.title}</Card>
    </Animated.View>
  )}
/>
```

---

## 🎬 **6. Lottie React Native (Animaciones JSON)**

### Uso Básico
```jsx
import LottieView from 'lottie-react-native';

// Loading animation
<LottieView
  source={require('./animations/loading.json')}
  autoPlay
  loop
  style={{ width: 200, height: 200 }}
/>

// Con control manual
function ControlledAnimation() {
  const animation = useRef(null);

  return (
    <>
      <LottieView
        ref={animation}
        source={require('./animations/success.json')}
        loop={false}
        style={{ width: 150, height: 150 }}
      />
      <Button onPress={() => animation.current?.play()}>
        Reproducir
      </Button>
    </>
  );
}

// Animación de éxito
<LottieView
  source={require('./animations/checkmark-success.json')}
  autoPlay
  loop={false}
  speed={1.5}
  style={{ width: 100, height: 100 }}
  onAnimationFinish={() => console.log('Terminó')}
/>
```

### Dónde conseguir animaciones
- 🌐 **LottieFiles** - https://lottiefiles.com (miles gratis)
- 📦 Descarga JSON y agrega a `/assets/animations/`

---

## 📐 **7. React Native Responsive Screen**

### Uso Básico
```jsx
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

// Tamaños responsivos
const styles = StyleSheet.create({
  container: {
    width: wp('90%'),        // 90% del ancho de pantalla
    height: hp('50%'),       // 50% del alto de pantalla
    padding: wp('5%'),       // 5% del ancho
    marginTop: hp('3%'),     // 3% del alto
  },
  title: {
    fontSize: wp('6%'),      // 6% del ancho como tamaño de fuente
  },
  image: {
    width: wp('40%'),
    height: wp('40%'),       // Mantiene proporción cuadrada
  },
});

// Componente responsive
function ResponsiveCard() {
  return (
    <View style={{
      width: wp('85%'),
      padding: wp('4%'),
      marginVertical: hp('2%'),
      borderRadius: wp('4%'),
    }}>
      <Text style={{ fontSize: wp('5%') }}>
        Título Responsive
      </Text>
    </View>
  );
}
```

---

## 🎨 **Ejemplo Completo: Card de Servicio con Todas las Librerías**

```jsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Button, Text as PaperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import LottieView from 'lottie-react-native';

function ServiceCard({ service }) {
  const [loading, setLoading] = useState(false);

  const handleReserve = () => {
    setLoading(true);
    // Lógica de reserva
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.container}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FDFBF7']}
        style={styles.gradient}
      >
        <Card style={styles.card}>
          <Card.Cover source={{ uri: service.image }} />
          
          {service.featured && (
            <BlurView intensity={80} tint="light" style={styles.badge}>
              <PaperText style={styles.badgeText}>Destacado</PaperText>
            </BlurView>
          )}

          <Card.Title
            title={service.name}
            subtitle={`$${service.price}`}
            titleStyle={styles.title}
            subtitleStyle={styles.price}
          />

          <Card.Content>
            <PaperText style={styles.description}>
              {service.description}
            </PaperText>
          </Card.Content>

          <Card.Actions>
            <Button
              mode="contained"
              onPress={handleReserve}
              disabled={loading}
              style={styles.button}
            >
              {loading ? (
                <LottieView
                  source={require('./animations/loading.json')}
                  autoPlay
                  loop
                  style={{ width: 30, height: 30 }}
                />
              ) : (
                'Reservar'
              )}
            </Button>
          </Card.Actions>
        </Card>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: wp('90%'),
    marginVertical: hp('1.5%'),
    borderRadius: wp('4%'),
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: wp('4%'),
  },
  card: {
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#D4AF37',
    fontSize: wp('3%'),
    fontWeight: '600',
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '300',
    color: '#2C2C2C',
  },
  price: {
    fontSize: wp('4%'),
    color: '#D4AF37',
    fontWeight: '500',
  },
  description: {
    fontSize: wp('3.5%'),
    color: '#6C6C6C',
    lineHeight: wp('5%'),
  },
  button: {
    backgroundColor: '#D4AF37',
  },
});

export default ServiceCard;
```

---

## ✅ **Checklist de Configuración**

### Apps
- ✅ Salon - Todas las librerías instaladas
- ✅ Clientes - Todas las librerías instaladas

### Configuración
- ✅ `babel.config.js` actualizado con Reanimated plugin
- ✅ `app.json` actualizado con plugins necesarios
- ✅ Todas las dependencias instaladas

### Próximos Pasos
1. Crear carpeta `/assets/animations/` y descargar animaciones Lottie
2. Crear temas personalizados para Paper
3. Crear componentes reutilizables con estas librerías

---

## 🎯 **Paleta de Colores AppSalon Pro**

```javascript
export const Colors = {
  // Primarios
  gold: '#D4AF37',        // Oro
  silver: '#C0C0C0',      // Plata
  cream: '#FDFBF7',       // Crema
  
  // Neutros
  white: '#FFFFFF',
  charcoal: '#2C2C2C',
  gray: '#6C6C6C',
  lightGray: '#E0E0E0',
  
  // Estados
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Gradientes
  goldGradient: ['#D4AF37', '#B8A134'],
  silverGradient: ['#C0C0C0', '#A8A8A8'],
  creamGradient: ['#FFFFFF', '#FDFBF7'],
};
```

---

**🎉 Todas las librerías de diseño están instaladas y listas para usar. El build incluirá todo esto automáticamente.**
