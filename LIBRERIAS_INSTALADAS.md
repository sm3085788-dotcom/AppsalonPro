# 📚 Librerías Instaladas - AppSalon Pro

## ✅ Todas las librerías instaladas en ambas apps (Salon y Clientes)

### 📸 **Cámara y Medios**
- ✅ `expo-camera` - Acceso a cámara para fotos, videos y **escaneo de códigos de barras/QR**
- ✅ `expo-image-picker` - Seleccionar fotos/videos de galería
- ✅ `expo-media-library` - Acceso a galería de medios

> **Nota:** `expo-barcode-scanner` fue removido (deprecado en SDK 51+). Ahora se usa `expo-camera` para escaneo.

### 🔔 **Notificaciones**
- ✅ `expo-notifications` - Push notifications locales y remotas

### 📄 **Documentos**
- ✅ `expo-print` - Imprimir documentos y generar PDFs
- ✅ `expo-document-picker` - Seleccionar documentos (PDF, etc.)
- ✅ `expo-file-system` - Gestión de archivos
- ✅ `expo-sharing` - Compartir archivos

### 📅 **Calendario**
- ✅ `expo-calendar` - Acceso al calendario del dispositivo

### 📍 **Ubicación y Mapas**
- ✅ `expo-location` - GPS y geolocalización
- ✅ `react-native-maps` - Mapas interactivos

### 🎤 **Audio**
- ✅ `expo-av` - Audio y video (grabación y reproducción)

---

## 🔧 Configuración de Permisos

### iOS (Info.plist)
```xml
NSCameraUsageDescription
NSMicrophoneUsageDescription
NSPhotoLibraryUsageDescription
NSPhotoLibraryAddUsageDescription
NSLocationWhenInUseUsageDescription
NSLocationAlwaysUsageDescription
NSCalendarsUsageDescription
NSRemindersUsageDescription
NSMotionUsageDescription
```

### Android (Manifest)
```xml
CAMERA
RECORD_AUDIO
READ_EXTERNAL_STORAGE
WRITE_EXTERNAL_STORAGE
ACCESS_FINE_LOCATION
ACCESS_COARSE_LOCATION
READ_CALENDAR
WRITE_CALENDAR
VIBRATE
NOTIFICATIONS
```

---

## 🚀 Comandos para Build

### **App Salon (Interna - APK)**
```bash
cd apps/salon
eas build --platform android --profile preview
```

### **App Clientes (Producción - Google Play)**
```bash
cd apps/clientes
eas build --platform android --profile production
```

### **App Clientes (Producción - App Store)**
```bash
cd apps/clientes
eas build --platform ios --profile production
```

---

## 📝 Configuración Adicional Necesaria

### 1. **Push Notifications (Firebase)**
Para notificaciones push, necesitarás:
- Crear proyecto en Firebase Console
- Descargar `google-services.json` (Android)
- Descargar `GoogleService-Info.plist` (iOS)
- Agregar a las carpetas respectivas

### 2. **Mapas (Google Maps)**
Para usar mapas en Android:
```json
// apps/salon/app.json y apps/clientes/app.json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "TU_API_KEY_AQUI"
    }
  }
}
```

Para iOS:
```json
"ios": {
  "config": {
    "googleMapsApiKey": "TU_API_KEY_AQUI"
  }
}
```

### 3. **EAS Project ID**
Antes del primer build:
```bash
# En la raíz del proyecto
eas init

# Luego actualiza app.json con el projectId generado
```

---

## 🎯 Uso de las Librerías (Ejemplos)

### Scanner de Códigos (con expo-camera)
```javascript
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();
const [scanned, setScanned] = useState(false);

if (!permission?.granted) {
  return <Button title="Permitir Cámara" onPress={requestPermission} />;
}

const handleBarCodeScanned = ({ type, data }) => {
  setScanned(true);
  console.log(`Código ${type} escaneado: ${data}`);
};

<CameraView
  style={{ flex: 1 }}
  facing="back"
  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
  barcodeScannerSettings={{
    barcodeTypes: ["qr", "ean13", "code128"],
  }}
/>
```

### Cámara (Tomar fotos)
```javascript
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();
const cameraRef = useRef(null);

const takePicture = async () => {
  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync();
    console.log('Foto guardada en:', photo.uri);
  }
};

<CameraView ref={cameraRef} style={{ flex: 1 }} />
```

### Imprimir PDF
```javascript
import * as Print from 'expo-print';

const printInvoice = async () => {
  const html = `<h1>Factura #123</h1><p>Total: $100</p>`;
  await Print.printAsync({ html });
};
```

### Notificaciones Push
```javascript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const sendNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Nueva Cita",
      body: 'Tienes una cita en 30 minutos',
    },
    trigger: { seconds: 1800 },
  });
};
```

### Seleccionar Imagen
```javascript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    console.log(result.assets[0].uri);
  }
};
```

### Calendario
```javascript
import * as Calendar from 'expo-calendar';

const createCalendarEvent = async () => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  
  if (status === 'granted') {
    const calendars = await Calendar.getCalendarsAsync();
    await Calendar.createEventAsync(calendars[0].id, {
      title: 'Cita en Salón',
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 60 * 1000),
    });
  }
};
```

### Ubicación GPS
```javascript
import * as Location from 'expo-location';

const getLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
    console.log(location.coords);
  }
};
```

### Mapas
```javascript
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: 19.4326,
    longitude: -99.1332,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }}
>
  <Marker
    coordinate={{ latitude: 19.4326, longitude: -99.1332 }}
    title="AppSalon Pro"
  />
</MapView>
```

### Grabar Audio
```javascript
import { Audio } from 'expo-av';

const [recording, setRecording] = useState();

const startRecording = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  
  if (status === 'granted') {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
  }
};

const stopRecording = async () => {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  console.log('Audio guardado en:', uri);
};
```

---

## ✅ Estado Actual

- ✅ Todas las librerías instaladas en Salon
- ✅ Todas las librerías instaladas en Clientes
- ✅ Permisos configurados en app.json (iOS y Android)
- ✅ Plugins configurados
- ✅ EAS Build configurado
- ⏳ Pendiente: Configurar Firebase (para push notifications)
- ⏳ Pendiente: Configurar Google Maps API Key
- ⏳ Pendiente: Ejecutar `eas init` para generar project IDs

---

## 🎯 Próximos Pasos

1. **Configurar EAS**:
   ```bash
   eas login
   eas init
   ```

2. **Actualizar project IDs** en `app.json` de ambas apps

3. **Primer Build de Prueba**:
   ```bash
   cd apps/salon
   eas build --platform android --profile preview
   ```

4. **Una vez que funcione el build**, solo necesitarás agregar la UI y lógica. Las librerías ya están configuradas.

---

**Todas las librerías están listas. Ahora puedes hacer el build y después solo agregar interfaz y lógica sin volver a configurar.**
