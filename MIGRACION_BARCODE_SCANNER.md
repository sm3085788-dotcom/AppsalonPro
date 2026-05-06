# Migración de expo-barcode-scanner a expo-camera

## ¿Por qué la migración?

`expo-barcode-scanner` fue **deprecado** y removido en Expo SDK 51+. Causaba errores de compilación de Kotlin en EAS Build.

**Solución oficial:** Usar `expo-camera` que incluye la misma funcionalidad de escaneo de códigos de barras.

## Cambios realizados

### 1. Archivos `app.json`
**Antes:**
```json
"plugins": [
  "expo-barcode-scanner",
  "expo-camera",
  ...
]
```

**Después:**
```json
"plugins": [
  "expo-camera",
  ...
]
```

### 2. Código JavaScript/TypeScript

#### Antes (expo-barcode-scanner)
```javascript
import { BarCodeScanner } from 'expo-barcode-scanner';

const [hasPermission, setHasPermission] = useState(null);

useEffect(() => {
  (async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  })();
}, []);

<BarCodeScanner
  onBarCodeScanned={handleBarCodeScanned}
  style={StyleSheet.absoluteFillObject}
/>
```

#### Después (expo-camera)
```javascript
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();
const [scanned, setScanned] = useState(false);

if (!permission?.granted) {
  return (
    <View>
      <Text>Se necesita permiso para usar la cámara</Text>
      <Button onPress={requestPermission} title="Otorgar permiso" />
    </View>
  );
}

const handleBarCodeScanned = ({ type, data }) => {
  setScanned(true);
  console.log(`Código ${type}: ${data}`);
};

<CameraView
  style={StyleSheet.absoluteFillObject}
  facing="back"
  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
  barcodeScannerSettings={{
    barcodeTypes: [
      "qr",
      "ean13",
      "ean8", 
      "code128",
      "code39",
      "code93",
      "upce",
      "pdf417",
      "aztec",
      "datamatrix"
    ],
  }}
/>
```

## Tipos de códigos soportados

Los mismos que antes:
- `qr` - Códigos QR
- `ean13` - Código de barras EAN-13
- `ean8` - Código de barras EAN-8
- `code128` - Code 128
- `code39` - Code 39
- `code93` - Code 93
- `upce` - UPC-E
- `pdf417` - PDF417
- `aztec` - Aztec
- `datamatrix` - Data Matrix

## Ventajas adicionales

Con `expo-camera` obtienes:
1. **Escaneo de códigos de barras** (reemplazo 1:1)
2. **Tomar fotos**
3. **Grabar video**
4. **Flash control**
5. **Zoom**
6. **Face detection** (opcional)

Todo en una sola librería mantenida y actualizada.

## Componente completo de ejemplo

```javascript
import { useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanData, setScanData] = useState(null);

  if (!permission) {
    return <View style={styles.container}><Text>Cargando...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Necesitamos permiso para usar la cámara
        </Text>
        <Button onPress={requestPermission} title="Otorgar permiso" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScanData({ type, data });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "code128"],
        }}
      />
      
      {scanned && (
        <View style={styles.overlay}>
          <Text style={styles.scanText}>
            Tipo: {scanData?.type}
          </Text>
          <Text style={styles.scanText}>
            Datos: {scanData?.data}
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.buttonText}>Escanear de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
    fontSize: 16,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
  },
  scanText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#9333ea',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
```

## Próximos pasos

1. ✅ Removido `expo-barcode-scanner` de ambas apps
2. ✅ Removido plugin de `app.json`
3. ✅ Documentación actualizada
4. 🔄 **Siguiente:** Ejecutar nuevo build con `eas build --platform android --profile production`

## Referencias

- [Expo Camera Docs](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Barcode Scanning con Camera](https://docs.expo.dev/versions/latest/sdk/camera/#barcode-scanning)
- [PR que removió barcode-scanner](https://github.com/expo/expo/pull/34966)
