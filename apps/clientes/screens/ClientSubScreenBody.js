import { useState, useMemo, useEffect } from 'react';
import { ProfileEditForm } from './ProfileEditForm';
import { AgendarCitaForm } from './AgendarCitaForm';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SalonButton } from '../components/luxury/SalonButton';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { FEATURED_SERVICE } from '../data/luxuryUiMocks';
import { db } from '@appsalon/shared-config';
import { TiendaFlow } from '../components/tienda/TiendaFlow';
import { TendenciasFeed } from '../components/tendencias/TendenciasFeed';
import { PremiosDashboard } from '../components/premios/PremiosDashboard';
import { MembresiasBody } from '../components/membresias/MembresiasBody';
import { MisFacturasBody } from './MisFacturasBody';
import { AuraLineInbox } from '../components/mensajes/AuraLineInbox';
import { CLIENT_SUB } from '../navigation/clientSubScreens';
import { useTheme } from '../theme/ThemeProvider';

function formatGtq(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Textos neutros para subpantallas de flujo que aún no leen la cita real. */
const FLUJO_CITA_PLACEHOLDER = {
  servicio: 'Tu próxima cita',
  fechaLabel: 'Fecha por confirmar',
  horaLabel: 'Hora por confirmar',
};

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

function NotificationsBody({ prefs, onPrefChange }) {
  const subStyles = useSubStyles();
  const chipText = useAccentChipStyle();
  const p = prefs || {
    recordatorios: true,
    promociones: false,
    cambiosAgenda: true,
    mensajes: true,
  };

  const Row = ({ k, label, sub }) => (
    <View style={subStyles.rowTouch}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={subStyles.rowLabel}>{label}</Text>
        <Text style={subStyles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={Boolean(p[k])}
        onValueChange={(v) => onPrefChange?.(k, v)}
        trackColor={{ false: '#888', true: undefined }}
      />
    </View>
  );

  return (
    <View style={[subStyles.card, padTop]}>
      <Row k="recordatorios" label="Recordatorios" sub="Tu próxima cita por correo." />
      <View style={subStyles.divider} />
      <Row k="promociones" label="Promociones" sub="Descuentos y novedades del salón." />
      <View style={subStyles.divider} />
      <Row k="cambiosAgenda" label="Cambios en tu agenda" sub="Reposiciones y cancelaciones." />
      <View style={subStyles.divider} />
      <Row
        k="mensajes"
        label="Mensajes"
        sub="Muestra el ícono Aura Line en Inicio y avisos del salón."
      />
      <Text style={[subStyles.muted, { marginTop: spacing.sm, fontSize: 12 }]}>
        Estado mensajes:{' '}
        <Text style={chipText}>{p.mensajes ? 'Activo' : 'Inactivo'}</Text>
      </Text>
      {p.mensajes ? (
        <Text style={[subStyles.muted, { marginTop: spacing.xs, fontSize: 12 }]}>
          En Inicio verás el ícono de mensajes junto a Acceso rápido.
        </Text>
      ) : null}
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
          Elige cómo comunicarte con el salón. Acciones directas en tu dispositivo.
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
        <RowStatic label="Versión cliente" value="Aura Clientes" />
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
  onLogout,
  clienteRow,
  onCitasChanged,
  sessionUser,
  onClienteUpdated,
  notifPrefs,
  onNotifPrefChange,
  onAuraUnreadChange,
}) {
  const subStyles = useSubStyles();
  const { colors: tc } = useTheme();

  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (screenId !== CLIENT_SUB.HISTORIAL_COMPLETO) return;
    if (!clienteRow?.id) {
      setHistRows([]);
      setHistLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setHistLoading(true);
      const { data, error } = await db.citas.getByCliente(clienteRow.id);
      if (!alive) return;
      setHistLoading(false);
      if (error || !Array.isArray(data)) {
        setHistRows([]);
        return;
      }
      const now = Date.now();
      const past = data
        .filter((c) => new Date(c.fecha_hora).getTime() < now)
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
      setHistRows(past);
    })();
    return () => {
      alive = false;
    };
  }, [screenId, clienteRow?.id]);

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
            Los precios y disponibilidad salen del catálogo del salón cuando esté enlazado.
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
          <AgendarCitaForm
            clienteRow={clienteRow}
            onClose={onClose}
            onGoTab={onGoTab}
            onCitasChanged={onCitasChanged}
          />
        </>
      );

    case CLIENT_SUB.HISTORIAL_COMPLETO:
      return (
        <>
          {histLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={tc.primary} />
          ) : histRows.length > 0 ? (
            histRows.map((h) => (
              <View key={h.id} style={hist.card}>
                <View style={hist.top}>
                  <Text style={hist.name}>{h.servicio}</Text>
                  <Text style={hist.price}>{formatGtq(h.precio)}</Text>
                </View>
                <Text style={hist.meta}>
                  {new Date(h.fecha_hora).toLocaleDateString('es-GT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {h.empleado?.nombre ? ` · ${h.empleado.nombre}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
              {!clienteRow?.id
                ? 'Necesitamos tu ficha de cliente enlazada al salón para listar visitas.'
                : 'No hay visitas anteriores registradas.'}
            </Text>
          )}
          <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.REPROGRAMAR_CITA:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>{FLUJO_CITA_PLACEHOLDER.servicio}</Text>
            <Text style={subStyles.rowSub}>
              {FLUJO_CITA_PLACEHOLDER.fechaLabel} · {FLUJO_CITA_PLACEHOLDER.horaLabel}
            </Text>
            <View style={{ height: spacing.md }} />
            <Text style={subStyles.bullets}>
              Aquí aparecerán los huecos disponibles del salón. Por ahora toca cualquier opción para
              simular el flujo.
            </Text>
          </View>
          <SalonButton
            variant="outlineGray"
            title="Ver calendario"
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
            <Text style={checkLine}>Tu cita {FLUJO_CITA_PLACEHOLDER.servicio} quedará confirmada.</Text>
            <Text style={checkLine}>
              ✓ Recordatorio 24 h antes{'\n'}✓ Puedes cambiar fecha desde Mis citas
            </Text>
          </View>
          <SalonButton variant="outlineGray" title="Volver" fullWidth onPress={onClose} />
          <SalonButton
            variant="solidGold"
            title="Confirmar"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </>
      );

    case CLIENT_SUB.EDITAR_PERFIL:
      return (
        <ProfileEditForm
          clienteRow={clienteRow}
          sessionUser={sessionUser}
          onClose={onClose}
          onSaved={onClienteUpdated}
        />
      );
    case CLIENT_SUB.CONTACTO:
      return <ContactoBody />;
    case CLIENT_SUB.NOTIFICACIONES:
      return <NotificationsBody prefs={notifPrefs} onPrefChange={onNotifPrefChange} />;

    case CLIENT_SUB.MENSAJES:
      return (
        <AuraLineInbox
          clienteRow={clienteRow}
          sessionUser={sessionUser}
          onUnreadChange={onAuraUnreadChange}
        />
      );

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
          <SalonButton variant="outlineGold" title="Agregar método" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.TIENDA:
      return (
        <TiendaFlow
          onClose={onClose}
          clienteId={clienteRow?.id}
          clienteNombre={clienteRow?.nombre}
          clienteTelefono={clienteRow?.telefono}
          clientUserId={sessionUser?.id}
        />
      );

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

    case CLIENT_SUB.MIS_FACTURAS:
      return <MisFacturasBody clienteId={clienteRow?.id} onClose={onClose} />;

    case CLIENT_SUB.CARRITO:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>Tu carrito está vacío</Text>
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
            Cerrarás la sesión en este dispositivo. Podés volver a entrar cuando quieras.
          </Text>
          <SalonButton variant="outlineGray" title="Cancelar" fullWidth onPress={onClose} />
          <SalonButton
            variant="solidGold"
            title="Salir"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={async () => {
              await onLogout?.();
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
        <Text style={subStyles.muted}>Pantalla en preparación ({String(screenId)}).</Text>
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
  const bullets = [
    'Elige categoría del servicio',
    'Selecciona bloque disponible',
    'Confirma y recibe la confirmación por correo',
  ];
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
