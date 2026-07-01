import { useState, useMemo, useEffect } from 'react';
import Constants from 'expo-constants';
import { ProfileEditForm } from './ProfileEditForm';
import { AgendarCitaForm } from './AgendarCitaForm';
import { ServiciosCarritoBody } from '../components/citas/ServiciosCarritoBody';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Switch, ActivityIndicator, Alert } from 'react-native';
import { SalonButton } from '../components/luxury/SalonButton';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { FEATURED_SERVICE } from '../data/luxuryUiMocks';
import { db, getSalonGoogleMapsUrl, getWebCatalogUrl } from '@appsalon/shared-config';
import { TiendaFlow } from '../components/tienda/TiendaFlow';
import { TendenciasFeed } from '../components/tendencias/TendenciasFeed';
import { PremiosDashboard } from '../components/premios/PremiosDashboard';
import { MembresiasBody } from '../components/membresias/MembresiasBody';
import { MisFacturasBody } from './MisFacturasBody';
import { MisPedidosBody } from '../components/pedidos/MisPedidosBody';
import { AuraLineInbox } from '../components/mensajes/AuraLineInbox';
import { EventosProfesionalesBody } from '../components/eventos/EventosProfesionalesBody';
import { MetodosPagoBody } from '../components/pagos/MetodosPagoBody';
import { BROADCAST_PROMO_ACTIONS } from '@appsalon/shared-config';
import { labelEstadoCita, estadoCitaTone } from '../utils/citasLabels';
import { CLIENT_SUB } from '../navigation/clientSubScreens';
import { CLIENT_ALERT_BELL_RED } from '../constants/clientAlertColors';
import { useTheme } from '../theme/ThemeProvider';
import { useClientLocale } from '../hooks/useClientLocale';
import { InstagramLogo, FacebookLogo, WhatsAppLogo } from '../components/social/SocialLogoImage';
import { LocationOnIcon } from '../components/social/LocationOnIcon';

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

const WEB_APP_URL = getWebCatalogUrl();

function ContactoBody() {
  const subStyles = useSubStyles();
  const { colors: tc } = useTheme();
  const { t } = useClientLocale();
  const chipText = useAccentChipStyle();
  const openUrl = (url) => Linking.openURL(url).catch(() => {});

  return (
    <>
      <View style={[subStyles.card, padTop]}>
        <Text style={subStyles.rowLabel}>{t('contacto.cardTitle')}</Text>
        <Text style={subStyles.rowSub}>{t('contacto.cardSub')}</Text>
        <View style={subStyles.divider} />

        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl('https://wa.me/50247132123')}>
          <WhatsAppLogo size={28} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={subStyles.rowLabel}>{t('contacto.whatsapp')}</Text>
            <Text style={subStyles.rowSub}>{t('contacto.whatsappSub')}</Text>
          </View>
          <Text style={chipText}>{t('contacto.open')}</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />

        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl('tel:+50247132123')}>
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>{t('contacto.phone')}</Text>
            <Text style={subStyles.rowSub}>{t('contacto.phoneSub')}</Text>
          </View>
          <Text style={chipText}>{t('contacto.call')}</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />

        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() => openUrl(getSalonGoogleMapsUrl())}
        >
          <LocationOnIcon size={28} color={tc.primary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={subStyles.rowLabel}>{t('contacto.gps')}</Text>
            <Text style={subStyles.rowSub}>{t('contacto.gpsSub')}</Text>
          </View>
          <Text style={chipText}>{t('contacto.go')}</Text>
        </TouchableOpacity>
      </View>

      <View style={subStyles.card}>
        <Text style={subStyles.rowLabel}>{t('contacto.social')}</Text>
        <View style={subStyles.divider} />
        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() => openUrl('https://instagram.com/appsalonpro')}
        >
          <InstagramLogo size={28} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={subStyles.rowLabel}>{t('contacto.instagram')}</Text>
            <Text style={subStyles.rowSub}>@appsalonpro</Text>
          </View>
          <Text style={chipText}>{t('contacto.open')}</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />
        <TouchableOpacity
          style={subStyles.rowTouch}
          onPress={() => openUrl('https://facebook.com/appsalonpro')}
        >
          <FacebookLogo size={28} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={subStyles.rowLabel}>{t('contacto.facebook')}</Text>
            <Text style={subStyles.rowSub}>AppSalon Pro</Text>
          </View>
          <Text style={chipText}>{t('contacto.open')}</Text>
        </TouchableOpacity>
        <View style={subStyles.divider} />
        <TouchableOpacity style={subStyles.rowTouch} onPress={() => openUrl(WEB_APP_URL)}>
          <View style={{ flex: 1 }}>
            <Text style={subStyles.rowLabel}>App web</Text>
            <Text style={subStyles.rowSub}>Catálogo en línea · reservas y productos</Text>
          </View>
          <Text style={chipText}>Abrir</Text>
        </TouchableOpacity>
      </View>
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
  deleteBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: CLIENT_ALERT_BELL_RED,
  },
  deleteBtnText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: CLIENT_ALERT_BELL_RED,
  },
});

const padTop = { paddingTop: 2 };

function ConfiguracionBody({ onClose, onLogout, sessionUser }) {
  const subStyles = useSubStyles();
  const { isDark, setScheme, colors: tc } = useTheme();
  const { locale, toggleLocale, configStrings, localeMeta } = useClientLocale();
  const [deleting, setDeleting] = useState(false);
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '—';

  const confirmDeleteAccount = () => {
    if (!sessionUser?.id || deleting) return;
    Alert.alert(
      'Eliminar cuenta',
      'Se borrará tu acceso a la app (correo y contraseña) y se desvinculará tu perfil del salón. ' +
        'Tus compras y citas anteriores pueden conservarse en el salón sin datos de contacto. ' +
        'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '¿Confirmás la eliminación?',
              'Vas a salir de la app y no podrás ingresar con esta cuenta.',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, eliminar',
                  style: 'destructive',
                  onPress: () => void runDeleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const runDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await db.clientes.deleteOwnAccount();
      if (error) {
        Alert.alert('Eliminar cuenta', error.message || 'No se pudo eliminar la cuenta.');
        return;
      }
      onClose?.();
      await onLogout?.();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <View style={[subStyles.card, padTop]}>
        <View style={configStyles.splitRow}>
          <View style={configStyles.col}>
            <Text style={subStyles.rowLabel}>{configStrings.language}</Text>
            <TouchableOpacity
              onPress={() => void toggleLocale()}
              accessibilityRole="button"
              accessibilityLabel={`${configStrings.language}: ${localeMeta.regionLabel}`}
            >
              <Text style={[subStyles.rowSub, { color: tc.primary }]}>
                {localeMeta.regionLabel} · {locale === 'es' ? 'EN' : 'ES'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[configStyles.vDivider, { backgroundColor: tc.cardBorder }]} />
          <View style={configStyles.col}>
            <Text style={subStyles.rowLabel}>{configStrings.darkMode}</Text>
            <View style={configStyles.switchRow}>
              <Text style={subStyles.rowSub}>{isDark ? configStrings.on : configStrings.off}</Text>
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
        <RowStatic label={configStrings.timezone} value={configStrings.timezoneValue} />
        <View style={subStyles.divider} />
        <RowStatic label={configStrings.clientVersion} value={`Aura Clientes ${appVersion}`} />
      </View>

      <View style={[subStyles.card, { marginTop: spacing.md }]}>
        <Text style={subStyles.rowLabel}>Cuenta</Text>
        <Text style={[subStyles.rowSub, { marginBottom: spacing.sm }]}>
          Podés eliminar tu acceso a la app. Si volvés a registrarte con el mismo correo, será una cuenta nueva.
        </Text>
        {deleting ? (
          <ActivityIndicator color={CLIENT_ALERT_BELL_RED} style={{ marginVertical: spacing.sm }} />
        ) : (
          <TouchableOpacity
            onPress={confirmDeleteAccount}
            disabled={!sessionUser?.id}
            accessibilityRole="button"
            accessibilityLabel="Eliminar cuenta"
            style={configStyles.deleteBtn}
          >
            <Text style={configStyles.deleteBtnText}>Eliminar cuenta</Text>
          </TouchableOpacity>
        )}
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
  onPromoAction,
  subPayload,
  onPromoFollowUp,
  onOpenTienda,
  onPedidosChanged,
  onAgendarServicio,
  onContinuarAgendarDesdeCarrito,
  onPrizeReady,
  onPremiosCanjeNavigate,
  onPremiosResumenLoaded,
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
      const { data, error } = await db.citas.getByCliente(clienteRow.id, { forClientApp: true });
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
        meta: {
          marginTop: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: tc.foregroundMuted,
          lineHeight: 18,
        },
        estadoPill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radii.pill,
        },
        estadoPillTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
        },
        price: {
          marginTop: spacing.xs,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: tc.foregroundSubtle,
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
          <AgendarCitaForm
            clienteRow={clienteRow}
            onClose={onClose}
            onGoTab={onGoTab}
            onCitasChanged={onCitasChanged}
            initialServicioNombre={subPayload?.agendarServicioNombre || null}
            initialServicioId={subPayload?.agendarServicioId || null}
            soloServicioVinculado={Boolean(subPayload?.soloServicioVinculado)}
            modoCarrito={Boolean(subPayload?.agendarDesdeCarrito)}
            onCitaBooked={() => {
              if (subPayload?.promoItem) {
                onPromoFollowUp?.(BROADCAST_PROMO_ACTIONS.BOOK, subPayload.promoItem);
              }
            }}
          />
        </>
      );

    case CLIENT_SUB.HISTORIAL_COMPLETO:
      return (
        <>
          {histLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={tc.primary} />
          ) : histRows.length > 0 ? (
            histRows.map((h) => {
              const tone = estadoCitaTone(h.estado);
              return (
              <View key={h.id} style={hist.card}>
                <View style={hist.top}>
                  <Text style={hist.name}>{h.servicio}</Text>
                  <View style={[hist.estadoPill, { backgroundColor: tone.bg }]}>
                    <Text style={[hist.estadoPillTxt, { color: tone.fg }]}>
                      {labelEstadoCita(h.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={hist.meta}>
                  {new Date(h.fecha_hora).toLocaleDateString('es-GT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {h.empleado?.nombre ? ` · ${h.empleado.nombre}` : ''}
                </Text>
                <Text style={hist.price}>{formatGtq(h.precio)}</Text>
              </View>
            );
            })
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

    case CLIENT_SUB.SERVICIOS_CARRITO:
      return (
        <ServiciosCarritoBody
          clienteRow={clienteRow}
          onClose={onClose}
          onCitasChanged={onCitasChanged}
          onGoTab={onGoTab}
        />
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
      return <EventosProfesionalesBody clienteRow={clienteRow} sessionUser={sessionUser} />;

    case CLIENT_SUB.MENSAJES:
      return (
        <AuraLineInbox
          clienteRow={clienteRow}
          sessionUser={sessionUser}
          onUnreadChange={onAuraUnreadChange}
          onPromoAction={onPromoAction}
        />
      );

    case CLIENT_SUB.METODOS_PAGO:
      return <MetodosPagoBody onClose={onClose} />;

    case CLIENT_SUB.TIENDA:
      return (
        <TiendaFlow
          onClose={onClose}
          clienteId={clienteRow?.id}
          clienteNombre={clienteRow?.nombre}
          clienteTelefono={clienteRow?.telefono}
          clienteDireccion={clienteRow?.direccion}
          clientUserId={sessionUser?.id}
          initialProductId={subPayload?.tiendaProductId || null}
          initialPhase={subPayload?.tiendaPhase || null}
          tiendaAddToCart={!!subPayload?.tiendaAddToCart}
          tiendaOpenKey={subPayload?.tiendaOpenKey ?? 0}
          onPedidosChanged={onPedidosChanged}
          onPurchaseComplete={() => {
            if (subPayload?.promoItem) {
              onPromoFollowUp?.(BROADCAST_PROMO_ACTIONS.BUY, subPayload.promoItem);
            }
          }}
        />
      );

    case CLIENT_SUB.TENDENCIAS:
      return <TendenciasFeed onBack={onClose} />;

    case CLIENT_SUB.PREMIOS:
      return (
        <PremiosDashboard
          onClose={onClose}
          clientUserId={sessionUser?.id}
          clienteRow={clienteRow}
          onPrizeReady={onPrizeReady}
          onCanjeNavigate={onPremiosCanjeNavigate}
          onResumenLoaded={onPremiosResumenLoaded}
        />
      );

    case CLIENT_SUB.MEMBRESIAS:
      return (
        <>
          <MembresiasBody
            clienteRow={clienteRow}
            onMembershipChanged={onClienteUpdated}
            onClose={onClose}
          />
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
      return (
        <MisFacturasBody
          clienteId={clienteRow?.id}
          clienteNombre={clienteRow?.nombre}
          onClose={onClose}
          initialVentaId={subPayload?.ventaId ?? null}
        />
      );

    case CLIENT_SUB.MIS_PEDIDOS:
      return (
        <MisPedidosBody
          sessionUser={sessionUser}
          onOpenTienda={onOpenTienda}
          onPedidosChanged={onPedidosChanged}
        />
      );

    case CLIENT_SUB.CARRITO:
      return (
        <>
          <View style={subStyles.card}>
            <Text style={subStyles.rowLabel}>Tu carrito está vacío</Text>
            <Text style={subStyles.bullets}>
              El carrito de compra está en la tienda. Para ver pedidos ya enviados al salón, usá Acceso rápido →
              Pedidos.
            </Text>
          </View>
          <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
        </>
      );

    case CLIENT_SUB.CONFIGURACION:
      return (
        <ConfiguracionBody
          onClose={onClose}
          onLogout={onLogout}
          sessionUser={sessionUser}
        />
      );

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
