# App Clientes — confirmación de correo (para el lanzamiento)

**Estado actual:** la app **no exige** confirmación de correo. Podés crear cuenta e iniciar sesión con Supabase Auth (correo + contraseña) y usar la tienda en Expo Go.

Cuando publiques la app y contrates un proveedor de correo (Resend, SendGrid, SMTP del dominio, etc.):

1. Configurar SMTP en Supabase (o plantillas del proveedor).
2. Activar **Confirm email** en Authentication → Providers → Email.
3. Volver a enlazar `emailRedirectTo` y Redirect URLs (`appsalonclientes://auth/confirm` en APK).
4. Reutilizar `apps/clientes/utils/clientAuthEmail.js` (deep links y reenvío).

Mientras desarrollás en Expo Go, en Supabase conviene tener **Confirm email = OFF** para no bloquear el login.

Scripts SQL del proyecto (sin cambios): `supabase-auth-signup-app-clientes.sql`, `supabase-clientes-auth-insert.sql`, `supabase-ecommerce-orders-clientes.sql`.
