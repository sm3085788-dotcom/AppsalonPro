import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase } from '@appsalon/shared-config';

const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ??
  'https://appsalon-pro-web-catalogo.vercel.app/privacidad';

const hasSupabaseEnv =
  Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );

const SCREENS = {
  HOME: 'home',
  AGENDAR: 'agendar',
  CITAS: 'citas',
  HISTORIAL: 'historial',
  PERFIL: 'perfil',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [session, setSession] = useState(null);
  const [clienteRow, setClienteRow] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilMeta, setPerfilMeta] = useState({ error: null });

  useEffect(() => {
    if (!hasSupabaseEnv) return undefined;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshClienteFicha = useCallback(async (userId) => {
    if (!hasSupabaseEnv || !userId) {
      setClienteRow(null);
      return;
    }
    setPerfilLoading(true);
    setPerfilMeta({ error: null });
    const { data, error } = await supabase
      .from('clientes')
      .select('nombre,email')
      .eq('user_id', userId)
      .maybeSingle();
    setPerfilLoading(false);
    if (error) {
      setClienteRow(null);
      setPerfilMeta({ error: error.message });
      return;
    }
    setClienteRow(data ?? null);
    setPerfilMeta({ error: null });
  }, []);

  useEffect(() => {
    if (screen !== SCREENS.PERFIL || !session?.user?.id) {
      setClienteRow(null);
      setPerfilMeta({ error: null });
      setPerfilLoading(false);
      return;
    }
    refreshClienteFicha(session.user.id);
  }, [screen, session?.user?.id, refreshClienteFicha]);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '—';

  const Header = ({ showBack }) => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => setScreen(SCREENS.HOME)}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>{'\u2190'} Volver</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>
      <Text style={styles.title}>AppSalon Pro</Text>
      <Text style={styles.subtitle}>App Clientes</Text>
    </View>
  );

  const renderHome = () => (
    <>
      <Header />
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Reserva tu Cita</Text>
          <Text style={styles.heroText}>
            Experimenta el lujo y la elegancia en cada visita
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => setScreen(SCREENS.AGENDAR)}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Agendar Ahora</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setScreen(SCREENS.CITAS)}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>📅 Mis Citas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setScreen(SCREENS.HISTORIAL)}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>🕒 Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setScreen(SCREENS.PERFIL)}
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>👤 Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderPlaceholder = (
    heading,
    body,
    { extra } = {},
  ) => (
    <>
      <Header showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
      >
        <Text style={styles.pageTitle}>{heading}</Text>
        <Text style={styles.pageBody}>{body}</Text>
        {extra}
      </ScrollView>
    </>
  );

  let main;
  switch (screen) {
    case SCREENS.AGENDAR:
      main = renderPlaceholder(
        'Agendar',
        'Elige día y hora para tu próxima visita. Pronto podrás completar tu reserva aquí mismo.',
      );
      break;
    case SCREENS.CITAS:
      main = renderPlaceholder(
        'Mis citas',
        'Aquí aparecerán tus próximas citas confirmadas cuando conectemos la cuenta con tu salón.',
      );
      break;
    case SCREENS.HISTORIAL:
      main = renderPlaceholder(
        'Historial',
        'Aquí podrás ver servicios pasados y detalles de tus visitas.',
      );
      break;
    case SCREENS.PERFIL:
      main = (
        <>
          <Header showBack />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
          >
            <Text style={styles.pageTitle}>Perfil</Text>
            <Text style={styles.pageBody}>
              Gestiona tus datos de contacto y preferencias cuando la app esté
              vinculada a tu cuenta.
            </Text>

            <View style={styles.connCard}>
              <Text style={styles.connCardTitle}>Conexión</Text>
              {!hasSupabaseEnv ? (
                <Text style={styles.connCardBody}>
                  Falta configurar EXPO_PUBLIC_SUPABASE_URL y
                  EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env de esta app.
                </Text>
              ) : (
                <>
                  <Text style={styles.connCardOk}>
                    Variables de Supabase cargadas.
                  </Text>
                  {!session?.user ? (
                    <Text style={styles.connCardBody}>
                      Sesión: no has iniciado sesión todavía (flujo de login se
                      puede añadir después). La base responde cuando haya
                      sesión y RLS lo permita.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.connCardBody}>
                        Sesión activa:{' '}
                        <Text style={styles.connStrong}>
                          {session.user.email ?? session.user.id.slice(0, 8) + '…'}
                        </Text>
                      </Text>
                      {perfilLoading ? (
                        <ActivityIndicator
                          style={styles.connSpinner}
                          color="#D4AF37"
                        />
                      ) : perfilMeta.error ? (
                        <Text style={styles.connError}>
                          Tabla clientes: {perfilMeta.error}
                        </Text>
                      ) : clienteRow ? (
                        <View style={styles.clienteBox}>
                          <Text style={styles.connCardBody}>
                            Ficha en tabla clientes:{' '}
                            <Text style={styles.connStrong}>
                              {clienteRow.nombre}
                            </Text>
                            {clienteRow.email ? (
                              <Text style={styles.connCardMuted}>
                                {' \n'}
                                {clienteRow.email}
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.connCardBody}>
                          No hay fila en la tabla clientes con tu user_id, o RLS
                          permite leerla (revisa en Supabase y el mapeo Auth →
                          cliente).
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            >
              <Text style={styles.linkBtnText}>Política de privacidad</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      );
      break;
    default:
      main = renderHome();
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        {main}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versión {appVersion} • Tu salón de confianza
          </Text>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerRow: {
    minHeight: 28,
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 15,
    color: '#D4AF37',
    fontWeight: '400',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2C2C2C',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#C0C0C0',
    marginTop: 4,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroCard: {
    backgroundColor: '#D4AF37',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '300',
    marginBottom: 24,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#D4AF37',
    fontWeight: '300',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#2C2C2C',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#C0C0C0',
    fontWeight: '300',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollInner: {
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: '#2C2C2C',
    marginBottom: 16,
  },
  pageBody: {
    fontSize: 16,
    fontWeight: '300',
    color: '#505050',
    lineHeight: 24,
    marginBottom: 24,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  linkBtnText: {
    fontSize: 15,
    color: '#D4AF37',
    textDecorationLine: 'underline',
  },
  connCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E4DC',
  },
  connCardTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  connCardBody: {
    fontSize: 14,
    fontWeight: '300',
    color: '#505050',
    lineHeight: 20,
  },
  connCardOk: {
    fontSize: 14,
    fontWeight: '300',
    color: '#2E7D32',
    marginBottom: 8,
  },
  connCardMuted: {
    fontSize: 13,
    fontWeight: '300',
    color: '#888888',
  },
  connStrong: {
    fontWeight: '500',
    color: '#2C2C2C',
  },
  connSpinner: {
    marginTop: 12,
  },
  connError: {
    marginTop: 8,
    fontSize: 13,
    color: '#B00020',
    fontWeight: '300',
  },
  clienteBox: {
    marginTop: 4,
  },
});
