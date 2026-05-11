import { useState, useMemo } from 'react';
import { ProfileEditForm } from './ProfileEditForm';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Switch } from 'react-native';
import { SalonButton } from '../components/luxury/SalonButton';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  FEATURED_SERVICE,
  MOCK_HISTORIAL_COMPLETO,
  MOCK_PROXIMA_CITA,
} from '../data/luxuryUiMocks';
import { TiendaFlow } from '../components/tienda/TiendaFlow';
import { TendenciasFeed } from '../components/tendencias/TendenciasFeed';
import { PremiosDashboard } from '../components/premios/PremiosDashboard';
import { MembresiasBody } from '../components/membresias/MembresiasBody';
import { CLIENT_SUB } from '../navigation/clientSubScreens';
import { useTheme } from '../theme/ThemeProvider';

function useAccentChipStyle() {
  const { colors: tc } = useTheme();
  return useMemo(
    () => ({
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      color: tc.primary,
    }),
    [tc],
  );
}

function NotificationsBody() {
  const subStyles = useSubStyles();
  const chipText = useAccentChipStyle();
  const [prefs, setPrefs] = useState({
    recordatorios: true,
    promociones: false,
    cambiosAgenda: true,
    mensajes: true,
  });
  const toggle = (k) =>
    setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const Row = ({ k, label, sub }) => (
    <TouchableOpacity
      style={subStyles.rowTouch}
      onPress={() => toggle(k)}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: prefs[k] }}
    >
      <View style={{ flex: 1 }}>
        <Text style={subStyles.rowLabel}>{label}</Text>
        <Text style={subStyles.rowSub}>{sub}</Text>
      </View>
      <Text style={chipText}>{prefs[k] ? 'Activo' : 'Inactivo'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[subStyles.card, padTop]}>
      <Row k="recordatorios" label="Recordatorios" sub="Tu próxima cita por correo." />
      <View style={subStyles.divider} />
      <Row k="promociones" label="Promociones" sub="Descuentos y novedades del salón." />
      <View style={subStyles.divider} />
      <Row k="cambiosAgenda" label="Cambios en tu agenda" sub="Reposiciones y cancelaciones." />
      <View style={subStyles.divider} />
      <Row k="mensajes" label="Mensajes" sub="Chats del salón y tu estilista (demo)." />
    </View>
  );
}

const WEB_APP_URL = 'https://appsalon-pro-web-catalogo.vercel.app';

function ContactoBody() {
  const subStyles = useSubStyles();
  const chipText = useAccentChipStyle();
  const openUrl = (url) => Linking.openURL(url).catch(() => {});

  return (
    <>
      <View style={[subStyles.card, padTop]}>
        <Text style={subStyles.rowLabel}>Canales disponibles</Text>
        <Text style={subStyles.rowSub}>
          Elige cómo comunicarte con el salón. Acciones directas en tu dispositivo (demo).
        </Text>
        <View style={subStyles.divider} />

        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl('https://wa.me/50257199107')}>
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>WhatsApp</Text>
            <Text style={subStyles.rowSub}>Chat directo con recepción</Text>
          </View>
          <Text style={chipText}>Abrir</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />

        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl('tel:+50257199107')}>
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>Llamada telefónica</Text>
            <Text style={subStyles.rowSub}>+502 5719-9107</Text>
          </View>
          <Text style={chipText}>Llamar</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />

        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() =>
            openUrl('https://www.google.com/maps/search/?api=1&query=Aura+Salon+Guatemala')
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>Ubicación GPS</Text>
            <Text style={subStyles.rowSub}>Abrir en mapas y navegar</Text>
          </View>
          <Text style={chipText}>Ir</Text>
        </TouchableOpacity>
      </View>

      <View style={subStyles.card}>
        <Text style={subStyles.rowLabel}>Redes sociales</Text>
        <View style={subStyles.divider} />
        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() => openUrl('https://instagram.com/appsalonpro')}
        >
          <Text style={subStyles.rowLabel}>Instagram</Text>
          <Text style={chipText}>Abrir</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />
        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() => openUrl('https://facebook.com/appsalonpro')}
        >
          <Text style={subStyles.rowLabel}>Facebook</Text>
          <Text style={chipText}>Abrir</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />
        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl(WEB_APP_URL)}>
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>App web</Text>
            <Text style={subStyles.rowSub}>{WEB_APP_URL.replace(/^https?:\/\//, '')}</Text>
          </View>
          <Text style={chipText}>Abrir</Text>
        </TouchableOpacity>
      </View>

      <SalonButton
        title="Visitar página web"
        variant="heroGold"
        fullWidth
        onPress={() => openUrl(WEB_APP_URL)}
      />
    </>
  );
}

const configStyles = StyleSheet.create({
  splitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
});

const padTop = { paddingTop: 2 };

function ConfiguracionBody({ onClose }) {
  const subStyles = useSubStyles();
  const { isDark, setScheme, colors: tc } = useTheme();

  return (
    <>
      <View style={[subStyles.card, padTop]}>
        <View style={configStyles.splitRow}>
          <View style={configStyles.col}>
            <Text style={subStyles.rowLabel}>Idioma</Text>
            <Text style={subStyles.rowSub}>Español (Latinoamérica)</Text>
          </View>
          <View style={[configStyles.vDivider, { backgroundColor: tc.cardBorder }]} />
          <View style={configStyles.col}>
            <Text style={subStyles.rowLabel}>Modo oscuro</Text>
            <View style={configStyles.switchRow}>
              <Text style={subStyles.rowSub}>{isDark ? 'Activado' : 'Desactivado'}</Text>
              <Switch
                value={isDark}
                onValueChange={(on) => setScheme(on ? 'dark' : 'light')}
                trackColor={{ false: tc.cardBorder, true: tc.primary }}
                thumbColor={tc.card}
                ios_backgroundColor={tc.cardBorder}
                accessibilityRole="switch"
                accessibilityLabel="Modo oscuro"
                accessibilityState={{ checked: isDark }}
              />
            </View>
          </View>
        </View>
        <View style={subStyles.divider} />
        <RowStatic label="Zona horaria" value="Ciudad de México (GMT−6)" />
        <View style={subStyles.divider} />
        <RowStatic label="Versión cliente" value="Sin lógica aún · UI" />
      </View>
      <SalonButton variant="outlineGray" title="Listo" fullWidth onPress={onClose} />
    </>
  );
}

export function ClientSubScreenBody({
  screenId,
  onClose,
  onGoTab,
  privacyUrl,
  onLogoutDemo,
}) {
  const subStyles = useSubStyles();
  const { colors: tc } = useTheme();

  const priceAccent = useMemo(
    () => ({
      fontFamily: typography.fontDisplay,
      fontSize: 28,
      color: tc.foreground,
      marginBottom: spacing.sm,
    }),
    [tc],
  );

  const checkLine = useMemo(
    () => ({
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: tc.foregroundMuted,
      lineHeight: 22,
    }),
    [tc],
  );

  const hist = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tc.card,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
        },
        top: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.md,
        },
        name: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: tc.foreground,
          flex: 1,
        },
        price: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: tc.foreground,
        },
        meta: {
          marginTop: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: tc.foregroundMuted,
          lineHeight: 18,
        },
      }),
    [tc],
  );

  switch (screenId) {
    case CLIENT_SUB.DETALLE_SERVICIO:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={priceAccent}>{FEATURED_SERVICE.precio}</Text>
            <Text style={subStyles.bullets}>{FEATURED_SERVICE.descripcion}</Text>
            <Text style={subStyles.muted}>{FEATURED_SERVICE.duracion}</Text>
            <View style={{ height: spacing.md }} />
            <Text style={subStyles.rowLabel}>Incluye</Text>
            <Text style={subStyles.bullets}>{FEATURED_SERVICE.incluye}</Text>
          </View>
          <Text style={subStyles.muted}>
            Esta pantalla muestra contenido ficticio hasta conectar catálogo y precios del salón.
          </Text>
          <SalonButton
            title="Ir a Mis citas"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => onGoTab('citas')}
          />
          <SalonButton
            title="Seguir explorando servicios"
            variant="outlineGray"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.AGENDAR_FLUJO:
      return (
        <>
          <Steps />
          <View style={[subStyles.card, padTop]}>
            <Text style={subStyles.rowLabel}>1. Servicio</Text>
            <Text style={subStyles.rowSub}>Corte, coloración, tratamiento…</Text>
            <FieldStub />
            <Text style={[subStyles.rowLabel, { marginTop: spacing.sm }]}>2. Fecha y hora</Text>
            <Text style={subStyles.rowSub}>Disponibilidad del salón (demo).</Text>
            <FieldStub />
            <Text style={[subStyles.rowLabel, { marginTop: spacing.sm }]}>3. Estilista preferido</Text>
            <Text style={subStyles.rowSub}>Opcional en una versión final.</Text>
            <FieldStub />
          </View>
          <SalonButton
            title="Ir a Mis citas (demo)"
            variant="solidGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => onGoTab('citas')}
          />
          <SalonButton
            title="Guardar borrador · demo"
            variant="outlineGray"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.HISTORIAL_COMPLETO:
      return (
        <>
          {MOCK_HISTORIAL_COMPLETO.map((h) => (
            <View key={h.id} style={hist.card}>
              <View style={hist.top}>
                <Text style={hist.name}>{h.servicio}</Text>
                <Text style={hist.price}>{h.precio}</Text>
              </View>
              <Text style={hist.meta}>{h.detalle}</Text>
            </View>
          ))}
          <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.REPROGRAMAR_CITA:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>{MOCK_PROXIMA_CITA.servicio}</Text>
            <Text style={subStyles.rowSub}>
              {MOCK_PROXIMA_CITA.fechaLabel} · {MOCK_PROXIMA_CITA.horaLabel}
            </Text>
            <View style={{ height: spacing.md }} />
            <Text style={subStyles.bullets}>
              Aquí aparecerán los huecos disponibles del salón. Por ahora toca cualquier opción para
              simular el flujo.
            </Text>
          </View>
          <SalonButton
            variant="outlineGray"
            title="Ver calendario (demo)"
            fullWidth
            onPress={() => {}}
          />
          <SalonButton
            variant="mutedFill"
            title="Sugerencia: mismo día 16:00"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
          <SalonButton
            variant="solidGold"
            title="Mantener hora actual"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.CONFIRMAR_CITA:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={checkLine}>Tu cita {MOCK_PROXIMA_CITA.servicio} quedará confirmada.</Text>
            <Text style={checkLine}>
              ✓ Recordatorio 24 h antes{'\n'}✓ Puedes cambiar fecha desde Mis citas
            </Text>
          </View>
          <SalonButton variant="outlineGray" title="Volver" fullWidth onPress={onClose} />
          <SalonButton
            variant="solidGold"
            title="Confirmar · demo"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.EDITAR_PERFIL:
      return <ProfileEditForm onClose={onClose} />;
    case CLIENT_SUB.CONTACTO:
      return <ContactoBody />;
    case CLIENT_SUB.NOTIFICACIONES:
      return <NotificationsBody />;

    case CLIENT_SUB.METODOS_PAGO:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>Visa ··· 4242</Text>
            <Text style={subStyles.rowSub}>Predeterminada · expira 08/29</Text>
            <View style={subStyles.divider} />
            <Text style={subStyles.rowLabel}>Efectivo en salón</Text>
            <Text style={subStyles.rowSub}>Sin cargos guardados.</Text>
          </View>
          <SalonButton variant="outlineGold" title="Agregar método · demo" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.TIENDA:
      return <TiendaFlow onClose={onClose} />;

    case CLIENT_SUB.TENDENCIAS:
      return <TendenciasFeed onBack={onClose} />;

    case CLIENT_SUB.PREMIOS:
      return <PremiosDashboard onClose={onClose} />;

    case CLIENT_SUB.MEMBRESIAS:
      return (
        <>
          <MembresiasBody />
          <SalonButton
            variant="outlineGray"
            title="Cerrar"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.CARRITO:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>Tu carrito está vacío (demo)</Text>
            <Text style={subStyles.bullets}>
              Aquí listaremos shampoo, tratamientos y complementos antes de pasar por caja. Por ahora
              es solo navegación.
            </Text>
          </View>
          <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.CONFIGURACION:
      return <ConfiguracionBody onClose={onClose} />;

    case CLIENT_SUB.CERRAR_SESION:
      return (
        <>
          <Text style={[subStyles.bullets, { marginBottom: spacing.md }]}>
            En modo demo esto borra tu sesión local en el dispositivo y te devuelve al inicio de sesión.
            El cierre real con servidor llegará después.
          </Text>
          <SalonButton variant="outlineGray" title="Cancelar" fullWidth onPress={onClose} />
          <SalonButton
            variant="solidGold"
            title="Salir · demo"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={async () => {
              await onLogoutDemo?.();
              onClose();
            }}
          />
        </>
      );

    case CLIENT_SUB.PRIVACIDAD:
      return (
        <>
          <Text style={subStyles.bullets}>
            Abrirás la política de privacidad en el navegador del dispositivo. No estamos cargando HTML
            embebido aún en esta vista.
          </Text>
          <SalonButton
            variant="heroGold"
            title="Abrir en el navegador"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() =>
              privacyUrl
                ? Linking.openURL(privacyUrl).catch(() => {})
                : undefined
            }
          />
          <SalonButton
            variant="outlineGray"
            title="Volver"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    default:
      return (
        <Text style={subStyles.muted}>Pantalla sin maqueta definida ({String(screenId)}).</Text>
      );
  }
}

function RowStatic({ label, value }) {
  const subStyles = useSubStyles();
  return (
    <TouchableOpacity activeOpacity={0.9} accessibilityRole="text">
      <Text style={subStyles.rowLabel}>{label}</Text>
      <Text style={subStyles.rowSub}>{value}</Text>
    </TouchableOpacity>
  );
}

function FieldStub() {
  const subStyles = useSubStyles();
  return (
    <TouchableOpacity activeOpacity={0.85}>
      <View style={[subStyles.fauxInput, { marginBottom: spacing.xs }]} />
    </TouchableOpacity>
  );
}

function Steps() {
  const subStyles = useSubStyles();
  const bullets = ['Elige categoría del servicio', 'Selecciona bloque disponible', 'Confirma y recibe correo demo'];
  return (
    <View style={[subStyles.card, padTop]}>
      {bullets.map((b, i) => (
        <Text key={b} style={[subStyles.bullets, i > 0 && { marginTop: spacing.sm }]}>
          {i + 1}. {b}
        </Text>
      ))}
    </View>
  );
}
