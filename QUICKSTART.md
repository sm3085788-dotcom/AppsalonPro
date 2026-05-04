# 🚀 Inicio Rápido - AppSalon Pro

Guía de 5 minutos para poner en marcha el ecosistema completo.

## ✅ Verificar Requisitos

```bash
# Node.js (v18+)
node --version

# npm (v9+)
npm --version

# Git
git --version
```

## 📦 Instalación

### Opción 1: Instalar Todo (Recomendado)
```bash
npm run install:all
```

### Opción 2: Instalar Por Separado
```bash
# App Salón
npm run install:salon

# App Clientes  
npm run install:clientes

# Web Catálogo
npm run install:web
```

## 🔑 Configurar Supabase

1. **Obtén tus credenciales** desde [app.supabase.com](https://app.supabase.com)
   - Settings → API
   - Copia: `Project URL` y `anon public key`

2. **Configura las apps móviles:**

Crea `apps/salon/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Crea `apps/clientes/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Configura la web:**

Crea `apps/web-catalogo/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎯 Ejecutar las Apps

### App Salón (Gestión)
```bash
npm run salon:start
```
Escanea el QR con la app Expo Go en tu teléfono.

### App Clientes
```bash
npm run clientes:start
```
Escanea el QR con la app Expo Go en tu teléfono.

### Web Catálogo
```bash
npm run web:dev
```
Abre [http://localhost:3000](http://localhost:3000)

## 📱 Para Desarrollo Nativo

### Android
```bash
# App Salón
npm run salon:android

# App Clientes
npm run clientes:android
```

### iOS (solo en macOS)
```bash
# App Salón
npm run salon:ios

# App Clientes
npm run clientes:ios
```

## 🏗️ Generar APKs (Para Producción)

1. **Instalar EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login en Expo:**
```bash
eas login
```

3. **Configurar proyectos:**
```bash
cd apps/salon
eas build:configure

cd ../clientes
eas build:configure
```

4. **Generar APK:**
```bash
# Desde apps/salon o apps/clientes
eas build --platform android --profile preview
```

## 🧪 Verificar Conexión

Para probar que todo está conectado:

1. Abre cualquier app
2. Deberías ver la UI con los colores de lujo (crema/dorado)
3. Verifica en la consola que no haya errores de Supabase

## 🆘 Problemas Comunes

### Error: "SUPABASE_URL is not defined"
- Verifica que creaste los archivos `.env` correctamente
- Reinicia el servidor después de crear los `.env`

### Error: "Module not found"
- Ejecuta `npm install` en la app específica
- Limpia la caché: `npx expo start -c`

### La app no carga en el teléfono
- Asegúrate que el teléfono y la computadora estén en la misma red WiFi
- Verifica que no haya firewall bloqueando el puerto

### Build de Android falla
- Verifica que tengas cuenta en Expo
- Asegúrate que `eas.json` existe en cada app
- Revisa que `app.json` tenga `package` definido para Android

## 📚 Siguientes Pasos

1. ✅ Apps funcionando localmente
2. 📊 Revisar `SUPABASE_INTEGRATION.md` para mapear tu base de datos
3. 🎨 Personalizar colores/logos según tu marca
4. 🚀 Generar builds de producción con EAS

## 💡 Tips

- Usa `npm run salon:start` y abre en Expo Go para desarrollo rápido
- Usa `npm run salon:android` solo cuando necesites probar funcionalidad nativa
- La web se recarga automáticamente con cambios (hot reload)
- Las apps móviles también tienen hot reload activado

## 🔗 Enlaces Útiles

- [Documentación Completa](./README.md)
- [Guía de Integración Supabase](./SUPABASE_INTEGRATION.md)
- [Expo Docs](https://docs.expo.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

---

**¿Listo?** Ejecuta `npm run install:all` y luego proporciona tus credenciales de Supabase. 🎉
