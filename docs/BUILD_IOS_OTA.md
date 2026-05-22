# Build iOS + OTA (App Salón y Clientes)

## Importante

| Plataforma | Archivo instalable | Build remoto |
|------------|-------------------|--------------|
| **Android** | APK | `eas build --platform android` |
| **iPhone** | IPA (no APK) | `eas build --platform ios` |

**OTA** (`eas update`) solo actualiza JavaScript/assets. El iPhone debe tener **ya instalado** un build nativo del **mismo canal** (`preview` o `production`).

---

## Requisitos (una vez)

1. Cuenta Expo: `eas login` (ya: **franciscomj98**)
2. **Apple Developer** ($99/año) para instalar en iPhone físico
3. En la primera build **iOS**, correr en terminal **sin** `--non-interactive` para configurar certificados:

```bash
cd apps/salon
eas build --platform ios --profile production
```

EAS creará/guardará certificados en la nube.

---

## App Salón — build remoto

```bash
cd apps/salon

# iPhone (instalación interna / enlace EAS)
npm run build:ios:production
# o prueba: npm run build:ios:preview

# Android APK
npm run build:android:production
```

Al terminar, abrí el enlace que muestra EAS o entrá a [expo.dev](https://expo.dev) → proyecto **salon-andreas-salon** → Builds.

### Instalar en iPhone

- **Internal distribution**: escaneá el QR o abrí el enlace en Safari; puede pedir registrar el UDID del dispositivo en Apple Developer.
- Alternativa: subir a **TestFlight** con `eas submit --platform ios`.

---

## OTA (después del build)

Mismo canal que el perfil del build:

```bash
cd apps/salon

# Cambios JS sin nueva IPA (misma versión nativa)
npm run update:production
# o canal preview si instalaste build preview:
npm run update:preview
```

La app ya tiene `expo-updates` y URL: `https://u.expo.dev/e9ee6409-4ce6-4c64-ac76-032d9f3acd67`

---

## App Clientes

Mismos comandos desde `apps/clientes` (projectId distinto).

---

## Perfiles EAS (`eas.json`)

| Perfil | Uso | Canal OTA |
|--------|-----|-----------|
| `development` | Dev client | `development` |
| `preview` | Prueba interna | `preview` |
| `production` | Uso real + OTA estable | `production` |

---

## Si falla el build iOS

1. Quitá `--non-interactive` y volvé a correr `eas build --platform ios --profile production`
2. Verificá billing en Expo (mensaje de créditos del mes)
3. Confirmá Apple Team ID en [expo.dev](https://expo.dev) → Credentials
