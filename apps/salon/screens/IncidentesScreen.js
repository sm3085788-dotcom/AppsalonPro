import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, FileText, X, Search, User, Send } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase, uploadIncidenteMediaFromUri, sendIncidentReportToClient } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const MAX_FOTOS = 3;
const META_MARK = '__INC_META_V1__';

const CLASIFICACION_OPTS = [
  { id: 'accidente_fisico', label: 'Físico', sub: 'Personas' },
  { id: 'accidente_material', label: 'Material', sub: 'Bienes / equipo' },
  { id: 'accidente_mixto', label: 'Mixto', sub: 'Ambos' },
];

/** Siete interruptores de protocolo (reembolso y compensación enlazan columnas existentes). */
const INTERRUPTOR_SPECS = [
  { key: 'lesionPersonas', label: 'Lesión o dolor físico en personas' },
  { key: 'danoMaterial', label: 'Daño a equipos, mobiliario o inventario' },
  { key: 'quimicoBiologico', label: 'Exposición a químico, tintura o biológico' },
  { key: 'fuegoElectrico', label: 'Fuego, humo, calor o electricidad' },
  { key: 'clientePresente', label: 'Cliente o visitante presente / afectado' },
  { key: 'reembolso', label: 'Procede reembolso o devolución económica' },
  { key: 'compensacion', label: 'Compensación en servicio, cortesía o retrabajo' },
];

function initialInterruptores() {
  return Object.fromEntries(INTERRUPTOR_SPECS.map((s) => [s.key, false]));
}

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mimeForImage(uri, mimeHint) {
  if (mimeHint?.includes('png')) return 'image/png';
  if (mimeHint?.includes('jpeg') || mimeHint?.includes('jpg')) return 'image/jpeg';
  const ext = guessExt(uri, mimeHint);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/** Convierte file://, content:// o https a data URL para que el motor PDF muestre la foto. */
async function imageUriToDataUrl(uri, mimeHint) {
  if (!uri) return null;
  if (String(uri).startsWith('data:')) return uri;

  const mime = mimeForImage(uri, mimeHint);
  let readUri = uri;

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const ext = guessExt(uri, mimeHint) || 'jpg';
    const dest = `${FileSystem.cacheDirectory || ''}inc_pdf_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const dl = await FileSystem.downloadAsync(uri, dest);
    readUri = dl.uri;
  } else if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(readUri, {
    encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
  });
  return `data:${mime};base64,${base64}`;
}

async function resolvePdfImageSources(dto, localFotos = []) {
  const uris = [dto.imagen_url, dto.foto_2, dto.foto_3];
  const hints = localFotos.map((f) => f?.mimeType);
  const out = [];
  for (let i = 0; i < uris.length; i += 1) {
    const u = uris[i];
    if (!u) continue;
    try {
      const dataUrl = await imageUriToDataUrl(u, hints[i]);
      if (dataUrl) out.push(dataUrl);
    } catch {
      /* omitir foto que no se pudo leer */
    }
  }
  return out;
}

function buildDescripcionParaDb(payload) {
  const swLines = INTERRUPTOR_SPECS.map(
    (s) => `${s.label}: ${payload.interruptores[s.key] ? 'Sí' : 'No'}`,
  );
  const body = [
    `DECLARANTE: ${payload.nombreDeclarante}`,
    `TELÉFONO DE CONTACTO: ${payload.telefono || '—'}`,
    `PERSONA O CLIENTE AFECTADO: ${payload.personaAfectada || '—'}`,
    `ÁREA O LUGAR DEL SALÓN: ${payload.lugar || '—'}`,
    '',
    '--- RELATO DEL HECHO ---',
    payload.relato,
    '',
    '--- NOTAS ADICIONALES ---',
    payload.notas || '—',
    '',
    '--- INTERRUPTORES DE PROTOCOLO ---',
    ...swLines,
    '',
    '--- FIRMAS (constancia escrita) ---',
    `Responsable que declara: ${payload.firmaResponsable}`,
    `Gerente o supervisión: ${payload.firmaGerente}`,
  ].join('\n');

  const meta = {
    v: 1,
    interruptores: payload.interruptores,
    telefono: payload.telefono,
    lugar: payload.lugar,
    clasificacion: payload.clasificacion,
  };
  return `${body}\n\n${META_MARK}\n${JSON.stringify(meta)}`;
}

function buildPdfHtml(d, imageDataUrls = []) {
  const swRows = INTERRUPTOR_SPECS.map(
    (s) =>
      `<tr><td>${escHtml(s.label)}</td><td style="text-align:center;font-weight:600">${
        d.interruptores[s.key] ? 'Sí' : 'No'
      }</td></tr>`,
  ).join('');
  const imgsHtml = imageDataUrls
    .map(
      (src, i) =>
        `<div class="evidencia-item"><div class="evidencia-cap">Evidencia ${i + 1}</div><img class="evidencia-img" src="${src}" alt="Evidencia ${i + 1}"/></div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    @page{margin:14mm;size:auto}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;height:auto;min-height:auto}
    body{font-family:Georgia,serif;padding:18px 20px 28px;color:#1a1a1a;line-height:1.45;font-size:14px}
    h1{font-size:20px;margin:0 0 4px;color:#5c1f33}
    .sub{font-size:12px;color:#555;margin-bottom:18px}
    .box{border:1px solid #d4c4c8;border-radius:10px;padding:14px;margin-bottom:14px;background:#faf7f8}
    .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7a5a60;margin-bottom:4px}
    .val{font-size:14px;margin-bottom:12px;word-wrap:break-word;overflow-wrap:anywhere}
    .val-relato{white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th,td{border:1px solid #e0d0d4;padding:8px;vertical-align:top}
    th{text-align:left;background:#f3e8ea}
    .evidencia-box{page-break-inside:avoid;break-inside:avoid-page}
    .evidencia-grid{display:flex;flex-direction:row;flex-wrap:nowrap;gap:10px;align-items:flex-start;width:100%;margin-top:6px}
    .evidencia-item{flex:1 1 0;min-width:0;margin:0;text-align:center}
    .evidencia-cap{font-size:10px;color:#666;margin-bottom:4px}
    .evidencia-img{display:block;width:100%;height:140px;max-height:140px;min-height:140px;object-fit:cover;object-position:center;border:1px solid #ddd;border-radius:8px}
    .sign{display:flex;flex-wrap:wrap;gap:24px;margin-top:28px}
    .signCol{flex:1;min-width:200px;min-height:72px;display:flex;flex-direction:column}
    .signLbl{font-size:11px;color:#666;margin-bottom:10px}
    .signName{font-size:13px;font-weight:600;margin:0 0 4px 0}
    .signLine{border:none;border-bottom:1px solid #333;margin:0;padding:0;height:0}
    .folio{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#333}
  </style></head><body>
    <h1>Reporte de accidente — salón</h1>
    <div class="sub">Documento generado en Andreas Pro · ${escHtml(d.fechaLegible)}</div>
    <div class="box">
      <div class="label">Folio</div>
      <div class="val folio">${escHtml(d.folio)}</div>
      <div class="label">Clasificación</div>
      <div class="val">${escHtml(d.clasificacionLabel)}</div>
    </div>
    <div class="box">
      <div class="label">Nombre completo (quien declara)</div>
      <div class="val">${escHtml(d.nombreDeclarante)}</div>
      <div class="label">Teléfono</div>
      <div class="val">${escHtml(d.telefono || '—')}</div>
      <div class="label">Persona o cliente afectado</div>
      <div class="val">${escHtml(d.personaAfectada || '—')}</div>
      <div class="label">Área / lugar</div>
      <div class="val">${escHtml(d.lugar || '—')}</div>
    </div>
    <div class="box">
      <div class="label">Relato completo del hecho</div>
      <div class="val val-relato">${escHtml(d.relato)}</div>
      <div class="label">Notas adicionales</div>
      <div class="val val-relato">${escHtml(d.notas || '—')}</div>
    </div>
    <div class="box">
      <div class="label">Montos estimados (GTQ)</div>
      <div class="val">Pérdida directa: ${escHtml(d.montoPerdida)} · Costo estimado total: ${escHtml(d.costoEstimado)}</div>
    </div>
    <div class="box">
      <div class="label">Interruptores de protocolo</div>
      <table><thead><tr><th>Ítem</th><th style="width:72px">Aplica</th></tr></thead><tbody>${swRows}</tbody></table>
    </div>
    ${imageDataUrls.length ? `<div class="box evidencia-box"><div class="label">Evidencia fotográfica (máx. 3)</div><div class="evidencia-grid">${imgsHtml}</div></div>` : ''}
    <div class="sign">
      <div class="signCol">
        <div class="signLbl">Firma responsable (constancia escrita)</div>
        <div class="signName">${escHtml(d.firmaResponsable)}</div>
        <div class="signLine"></div>
      </div>
      <div class="signCol">
        <div class="signLbl">Firma gerente / supervisión</div>
        <div class="signName">${escHtml(d.firmaGerente)}</div>
        <div class="signLine"></div>
      </div>
    </div>
  </body></html>`;
}

async function shareIncidentPdf(dto, localFotos = []) {
  const imageDataUrls = await resolvePdfImageSources(dto, localFotos);
  const expectedPhotos = [dto.imagen_url, dto.foto_2, dto.foto_3].filter(Boolean).length;
  if (expectedPhotos > 0 && imageDataUrls.length === 0) {
    throw new Error('No se pudieron leer las fotos para el PDF. Volvé a adjuntarlas e intentá otra vez.');
  }
  if (expectedPhotos > imageDataUrls.length) {
    Alert.alert(
      'Fotos',
      `Solo se incluyeron ${imageDataUrls.length} de ${expectedPhotos} imágenes en el PDF.`,
    );
  }
  const html = buildPdfHtml(dto, imageDataUrls);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: '.pdf',
      dialogTitle: 'Guardar o compartir PDF del incidente',
    });
  } else {
    Alert.alert('PDF listo', uri);
  }
}

export function IncidentesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [clasificacion, setClasificacion] = useState('accidente_mixto');
  const [nombreDeclarante, setNombreDeclarante] = useState('');
  const [telefono, setTelefono] = useState('');
  const [personaAfectada, setPersonaAfectada] = useState('');
  const [lugar, setLugar] = useState('');
  const [relato, setRelato] = useState('');
  const [notas, setNotas] = useState('');
  const [montoPerdida, setMontoPerdida] = useState('');
  const [costoEstimado, setCostoEstimado] = useState('');
  const [interruptores, setInterruptores] = useState(() => initialInterruptores());
  const [firmaResponsable, setFirmaResponsable] = useState('');
  const [firmaGerente, setFirmaGerente] = useState('');
  const [fotos, setFotos] = useState([]);

  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [enviarAuraLine, setEnviarAuraLine] = useState(false);

  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await db.incidentes.getRecent(8);
      if (error) throw error;
      setRecent(data || []);
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    void (async () => {
      const { data } = await db.clientes.getAll();
      setClientes(Array.isArray(data) ? data : []);
    })();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return (clientes || [])
      .filter((cl) => {
        const blob = [cl.nombre, cl.telefono, cl.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 8);
  }, [clientes, clienteSearch]);

  const selectCliente = (cl) => {
    setClienteSel(cl);
    setClienteSearch('');
    if (cl?.nombre) setPersonaAfectada(cl.nombre);
    setEnviarAuraLine(true);
    if (!interruptores.clientePresente) {
      setInterruptores((prev) => ({ ...prev, clientePresente: true }));
    }
  };

  const toggleInterruptor = (key) => {
    setInterruptores((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'clientePresente' && next.clientePresente && clienteSel) {
        setEnviarAuraLine(true);
      }
      return next;
    });
  };

  const pickFotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a la galería para adjuntar fotos.');
      return;
    }
    const remaining = MAX_FOTOS - fotos.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    const next = [...fotos];
    for (const a of res.assets) {
      if (next.length >= MAX_FOTOS) break;
      next.push({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg' });
    }
    setFotos(next);
  };

  const removeFoto = (idx) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!nombreDeclarante.trim()) return 'Indicá el nombre completo de quien declara.';
    if (!lugar.trim()) return 'Indicá el área o lugar del salón donde ocurrió el hecho.';
    if (!relato.trim() || relato.trim().length < 20) return 'Completá el relato del hecho (al menos unas líneas).';
    if (!firmaResponsable.trim()) return 'Indicá nombre completo del responsable (firma escrita).';
    if (!firmaGerente.trim()) return 'Indicá nombre completo de gerente o supervisión (firma escrita).';
    if (enviarAuraLine && !clienteSel?.id) {
      return 'Para enviar por Andreas Pro, buscá y elegí al cliente afectado en la lista.';
    }
    return null;
  };

  const parseAmount = (s) => {
    const n = Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const clasificacionLabel = useMemo(() => {
    const o = CLASIFICACION_OPTS.find((x) => x.id === clasificacion);
    return o ? `${o.label} (${o.sub})` : clasificacion;
  }, [clasificacion]);

  const guardarYpdf = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Formulario incompleto', err);
      return;
    }
    setSaving(true);
    try {
      const urls = [null, null, null];
      for (let i = 0; i < fotos.length; i += 1) {
        const f = fotos[i];
        const ext = guessExt(f.uri, f.mimeType);
        const { publicUrl, error: upErr } = await uploadIncidenteMediaFromUri(f.uri, {
          extension: ext,
          contentType: f.mimeType || 'image/jpeg',
        });
        if (upErr) {
          Alert.alert(
            'Fotos',
            `${upErr.message || 'Error al subir'}\n\nCreá el bucket Storage "incidentes" con políticas para staff (similar a "mensajes").`,
          );
          setSaving(false);
          return;
        }
        urls[i] = publicUrl;
      }

      const payload = {
        nombreDeclarante: nombreDeclarante.trim(),
        telefono: telefono.trim(),
        personaAfectada: personaAfectada.trim(),
        lugar: lugar.trim(),
        relato: relato.trim(),
        notas: notas.trim(),
        interruptores,
        clasificacion,
        firmaResponsable: firmaResponsable.trim(),
        firmaGerente: firmaGerente.trim(),
      };
      const descripcion = buildDescripcionParaDb(payload);
      const { data: userData } = await supabase.auth.getUser();
      const creado_por = userData?.user?.id || null;

      const { data: row, error } = await db.incidentes.create({
        tipo_incidente: clasificacion,
        empleado_nombre: payload.nombreDeclarante,
        cliente_nombre: payload.personaAfectada || null,
        descripcion,
        monto_perdida: parseAmount(montoPerdida),
        costo_estimado: parseAmount(costoEstimado),
        aplica_reembolso: !!interruptores.reembolso,
        aplica_compensacion: !!interruptores.compensacion,
        estado: 'registrado',
        imagen_url: urls[0],
        foto_2: urls[1],
        foto_3: urls[2],
        creado_por,
      });

      if (error) throw error;

      const pdfRow = {
        ...row,
        descripcion,
      };
      const dto = {
        folio: pdfRow.folio,
        fechaLegible: new Date(pdfRow.fecha || Date.now()).toLocaleString('es-GT'),
        clasificacionLabel,
        nombreDeclarante: payload.nombreDeclarante,
        telefono: payload.telefono,
        personaAfectada: payload.personaAfectada,
        lugar: payload.lugar,
        relato: payload.relato,
        notas: payload.notas,
        interruptores,
        montoPerdida: String(parseAmount(montoPerdida)),
        costoEstimado: String(parseAmount(costoEstimado)),
        imagen_url: urls[0],
        foto_2: urls[1],
        foto_3: urls[2],
        firmaResponsable: payload.firmaResponsable,
        firmaGerente: payload.firmaGerente,
        aplicaReembolso: !!interruptores.reembolso,
        aplicaCompensacion: !!interruptores.compensacion,
      };

      let auraNote = '';
      if (enviarAuraLine && clienteSel) {
        const { data: { user } } = await supabase.auth.getUser();
        const sender = {
          id: user?.id || null,
          name:
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email?.split('@')[0] ||
            'Equipo salón',
        };
        const { error: sendErr } = await sendIncidentReportToClient(clienteSel, dto, sender);
        if (sendErr) {
          auraNote = `\n\nAndreas Pro: no se pudo enviar (${sendErr.message || 'error'}).`;
        } else if (!clienteSel.user_id) {
          auraNote =
            '\n\nAndreas Pro: mensaje registrado. El cliente verá el reporte cuando inicie sesión en App Clientes con la misma ficha.';
        } else {
          auraNote = '\n\nAndreas Pro: reporte enviado al cliente en App Clientes.';
        }
      }

      await shareIncidentPdf(dto, fotos);
      Alert.alert('Registrado', `Incidente guardado. Folio: ${row.folio || row.id}${auraNote}`);

      setNombreDeclarante('');
      setTelefono('');
      setPersonaAfectada('');
      setLugar('');
      setRelato('');
      setNotas('');
      setMontoPerdida('');
      setCostoEstimado('');
      setInterruptores(initialInterruptores());
      setFirmaResponsable('');
      setFirmaGerente('');
      setFotos([]);
      setClienteSel(null);
      setClienteSearch('');
      setEnviarAuraLine(false);
      loadRecent();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el incidente.');
    } finally {
      setSaving(false);
    }
  };

  const soloPdfPreview = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Formulario incompleto', err);
      return;
    }
    const dto = {
      folio: 'VISTA-PREVIA (no guardado)',
      fechaLegible: new Date().toLocaleString('es-GT'),
      clasificacionLabel,
      nombreDeclarante: nombreDeclarante.trim(),
      telefono: telefono.trim(),
      personaAfectada: personaAfectada.trim(),
      lugar: lugar.trim(),
      relato: relato.trim(),
      notas: notas.trim(),
      interruptores,
      montoPerdida: String(parseAmount(montoPerdida)),
      costoEstimado: String(parseAmount(costoEstimado)),
      imagen_url: fotos[0]?.uri || null,
      foto_2: fotos[1]?.uri || null,
      foto_3: fotos[2]?.uri || null,
      firmaResponsable: firmaResponsable.trim(),
      firmaGerente: firmaGerente.trim(),
    };
    try {
      await shareIncidentPdf(dto, fotos);
    } catch (e) {
      Alert.alert('PDF', e?.message || 'No se pudo generar el PDF.');
    }
  };

  const field = (label, child) => (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLbl, { color: c.foreground }]}>{label}</Text>
      {child}
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Incidentes"
        subtitle="Reporte formal de accidentes físicos o materiales en el salón. Hasta 3 fotos, PDF y firmas."
        onBack={onBack}
        bottomPadding={padBottom}
        edgeToEdge
      >
        <LinearGradient colors={['#5c1f33', '#7a2d45', '#9a3d58']} style={styles.hero}>
          <FileText size={26} color="#fff" strokeWidth={2} />
          <Text style={styles.heroTitle}>Protocolo de accidente</Text>
          <Text style={styles.heroSub}>
            Completá el relato, activá los interruptores que correspondan y firmá con nombre completo. El PDF queda listo para archivo o seguro.
          </Text>
        </LinearGradient>

        <View style={[styles.section, { borderBottomColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Clasificación del evento</Text>
          <View style={styles.chipRow}>
            {CLASIFICACION_OPTS.map((o) => {
              const on = clasificacion === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[
                    styles.chip,
                    { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.background },
                  ]}
                  onPress={() => setClasificacion(o.id)}
                >
                  <Text style={[styles.chipTitle, { color: c.foreground }]}>{o.label}</Text>
                  <Text style={[styles.chipSub, { color: c.foregroundMuted }]}>{o.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: c.cardBorder }]}>
          {field(
            'Nombre completo (quien declara) *',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={nombreDeclarante}
              onChangeText={setNombreDeclarante}
              placeholder="Apellidos y nombres"
              placeholderTextColor={c.foregroundSubtle}
            />,
          )}
          {field(
            'Teléfono de contacto',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="WhatsApp o fijo"
              placeholderTextColor={c.foregroundSubtle}
              keyboardType="phone-pad"
            />,
          )}
          {field(
            'Persona o cliente afectado (si aplica)',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={personaAfectada}
              onChangeText={setPersonaAfectada}
              placeholder="Nombre libre o se completa al elegir cliente"
              placeholderTextColor={c.foregroundSubtle}
            />,
          )}

          <View style={styles.auraBlock}>
            <View style={styles.auraHead}>
              <Send size={18} color={c.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1, color: c.foreground }]}>
                Enviar reporte al cliente (Andreas Pro)
              </Text>
            </View>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm }]}>
              Buscá al cliente en la base del salón. El reporte llega a Mensajes en App Clientes (requiere toggle Mensajes activo).
            </Text>
            <View style={[styles.searchWrap, { borderColor: c.cardBorder, backgroundColor: c.background }]}>
              <Search size={18} color={c.foregroundMuted} />
              <TextInput
                style={[styles.searchIn, { color: c.foreground }]}
                placeholder="Buscar nombre, teléfono o correo…"
                placeholderTextColor={c.foregroundSubtle}
                value={clienteSearch}
                onChangeText={setClienteSearch}
              />
            </View>
            {clienteSel ? (
              <View style={[styles.clienteChip, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}>
                <User size={16} color={c.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.clienteChipName, { color: c.foreground }]} numberOfLines={1}>
                    {clienteSel.nombre}
                  </Text>
                  <Text style={[subStyles.muted, { fontSize: 11 }]} numberOfLines={1}>
                    {clienteSel.telefono || clienteSel.email || 'Sin contacto'}
                    {clienteSel.user_id ? ' · App Clientes vinculada' : ' · Sin cuenta app aún'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setClienteSel(null)} hitSlop={10}>
                  <Text style={{ color: c.primary, fontFamily: typography.fontSansMedium, fontSize: 13 }}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {!clienteSel && clienteSearch.trim().length >= 2 && clientesFiltrados.length === 0 ? (
              <Text style={[subStyles.muted, { marginTop: spacing.sm, fontSize: 12 }]}>
                Sin coincidencias. Creá la ficha en Clientes o revisá el nombre.
              </Text>
            ) : null}
            {!clienteSel && clientesFiltrados.length > 0 ? (
              <View style={[styles.pickList, { borderColor: c.cardBorder }]}>
                {clientesFiltrados.map((cl) => (
                  <TouchableOpacity
                    key={String(cl.id)}
                    style={[styles.pickRow, { borderBottomColor: c.cardBorder }]}
                    onPress={() => selectCliente(cl)}
                  >
                    <Text style={[styles.pickName, { color: c.foreground }]} numberOfLines={1}>
                      {cl.nombre}
                    </Text>
                    <Text style={[subStyles.muted, { fontSize: 12 }]} numberOfLines={1}>
                      {cl.telefono || cl.email || '—'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: spacing.sm }]}>
              <Text style={[styles.switchLabel, { color: c.foreground, flex: 1 }]}>
                Enviar al guardar y generar PDF
              </Text>
              <Switch
                value={enviarAuraLine}
                onValueChange={setEnviarAuraLine}
                trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
                thumbColor={enviarAuraLine ? c.primary : c.foregroundSubtle}
              />
            </View>
          </View>

          {field(
            'Área o lugar dentro del salón *',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={lugar}
              onChangeText={setLugar}
              placeholder="Ej. Lavacabezas 2, coloración, recepción"
              placeholderTextColor={c.foregroundSubtle}
            />,
          )}
          {field(
            'Relato completo del hecho *',
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background },
              ]}
              value={relato}
              onChangeText={setRelato}
              placeholder="Qué pasó, cuándo, quién estaba presente, acciones inmediatas…"
              placeholderTextColor={c.foregroundSubtle}
              multiline
              textAlignVertical="top"
            />,
          )}
          {field(
            'Notas adicionales',
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background },
              ]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Seguimiento, testigos, número de cita…"
              placeholderTextColor={c.foregroundSubtle}
              multiline
              textAlignVertical="top"
            />,
          )}
          <View style={styles.row2}>
            <View style={styles.row2Col}>
              {field(
                'Pérdida estimada (GTQ)',
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
                  value={montoPerdida}
                  onChangeText={setMontoPerdida}
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                />,
              )}
            </View>
            <View style={styles.row2Col}>
              {field(
                'Costo total estimado (GTQ)',
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
                  value={costoEstimado}
                  onChangeText={setCostoEstimado}
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                />,
              )}
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Interruptores de protocolo</Text>
          <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
            Marcá todo lo que aplique. Reembolso y compensación se registran también en el expediente del sistema.
          </Text>
          {INTERRUPTOR_SPECS.map((s) => (
            <View key={s.key} style={[styles.switchRow, { borderBottomColor: c.cardBorder }]}>
              <Text style={[styles.switchLabel, { color: c.foreground }]}>{s.label}</Text>
              <Switch
                value={!!interruptores[s.key]}
                onValueChange={() => toggleInterruptor(s.key)}
                trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
                thumbColor={interruptores[s.key] ? c.primary : c.foregroundSubtle}
              />
            </View>
          ))}
        </View>

        <View style={[styles.section, { borderBottomColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Evidencia (máx. {MAX_FOTOS} fotos)</Text>
          <TouchableOpacity style={[styles.pickBtn, { borderColor: c.primary }]} onPress={pickFotos}>
            <Camera size={20} color={c.primary} />
            <Text style={[styles.pickTxt, { color: c.primary }]}>Agregar desde galería</Text>
          </TouchableOpacity>
          <View style={styles.fotoRow}>
            {fotos.map((f, idx) => (
              <View key={`${f.uri}-${idx}`} style={styles.fotoWrap}>
                <Image source={{ uri: f.uri }} style={styles.foto} />
                <TouchableOpacity style={[styles.fotoX, { backgroundColor: c.card }]} onPress={() => removeFoto(idx)}>
                  <X size={16} color={c.foreground} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Firmas (nombre completo como constancia)</Text>
          {field(
            'Responsable que declara *',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={firmaResponsable}
              onChangeText={setFirmaResponsable}
              placeholder="Igual que arriba o quien firma el acta"
              placeholderTextColor={c.foregroundSubtle}
            />,
          )}
          {field(
            'Gerente o supervisión *',
            <TextInput
              style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
              value={firmaGerente}
              onChangeText={setFirmaGerente}
              placeholder="Nombre completo"
              placeholderTextColor={c.foregroundSubtle}
            />,
          )}
        </View>

        <View style={[styles.actions, { paddingHorizontal: spacing.lg }]}>
        <SalonButton
          title={saving ? 'Guardando…' : 'Guardar en sistema y generar PDF'}
          variant="heroGold"
          fullWidth
          loading={saving}
          disabled={saving}
          onPress={guardarYpdf}
        />
        <SalonButton
          title="Vista previa PDF (sin guardar)"
          variant="outlineGray"
          fullWidth
          style={{ marginTop: spacing.sm }}
          disabled={saving}
          onPress={soloPdfPreview}
        />
        </View>

        <View style={[styles.section, styles.sectionLast, { borderBottomColor: c.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Últimos folios</Text>
          {loadingRecent ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={recent}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={[styles.recentRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.recentFolio, { color: c.foreground }]}>{item.folio || item.id}</Text>
                  <Text style={[subStyles.muted, { fontSize: 12 }]}>
                    {item.tipo_incidente || '—'} · {item.estado || '—'}
                  </Text>
                  <Text style={[subStyles.muted, { fontSize: 11, marginTop: 4 }]}>
                    {item.fecha ? new Date(item.fecha).toLocaleString('es-GT') : ''}
                  </Text>
                </View>
              )}
              ListEmptyComponent={<Text style={subStyles.muted}>Sin incidentes recientes.</Text>}
            />
          )}
        </View>
      </SubScreenChrome>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    hero: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      marginBottom: 0,
    },
    section: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionLast: {
      paddingBottom: spacing.xl,
    },
    sectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginBottom: spacing.sm,
    },
    actions: {
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    heroTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      color: '#fff',
      marginTop: spacing.sm,
    },
    heroSub: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      marginTop: spacing.xs,
      lineHeight: 20,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexGrow: 1,
      minWidth: '28%',
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    chipTitle: { fontFamily: typography.fontSansMedium, fontSize: 15 },
    chipSub: { fontFamily: typography.fontSans, fontSize: 11, marginTop: 2 },
    fieldBlock: { marginBottom: spacing.md },
    fieldLbl: { fontFamily: typography.fontSansMedium, fontSize: 13, marginBottom: spacing.xs },
    input: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    row2Col: { flex: 1, minWidth: 0 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.md,
    },
    switchLabel: { flex: 1, fontFamily: typography.fontSans, fontSize: 14, lineHeight: 20 },
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    pickTxt: { fontFamily: typography.fontSansMedium, fontSize: 15 },
    fotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    fotoWrap: { position: 'relative' },
    foto: { width: 96, height: 96, borderRadius: radii.sm },
    fotoX: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    recentRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    recentFolio: { fontFamily: typography.fontSansMedium, fontSize: 15 },
    auraBlock: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    auraHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
    },
    searchIn: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    clienteChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    clienteChipName: { fontFamily: typography.fontSansMedium, fontSize: 14 },
    pickList: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    pickRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickName: { fontFamily: typography.fontSansMedium, fontSize: 14 },
  });
}
