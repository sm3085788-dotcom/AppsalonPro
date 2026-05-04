import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
          <Text style={styles.title}>AppSalon Pro</Text>
          <Text style={styles.subtitle}>App Clientes</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Reserva tu Cita</Text>
            <Text style={styles.heroText}>
              Experimenta el lujo y la elegancia en cada visita
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaText}>Agendar Ahora</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionText}>📅 Mis Citas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionText}>🕒 Historial</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionText}>👤 Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Versión 1.0.0 • Tu salón de confianza</Text>
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
});
