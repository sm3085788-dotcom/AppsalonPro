# Tema Luxury Salón (Aura)



Referencia visual para **apps/clientes** y **apps/salon**. Los valores concretos (HEX, radios, spacing) están en código en **`@appsalon/design-tokens`** (`shared/design-tokens/index.js`); este documento sirve como guía y para no repetir valores a mano en otros sitios.



## Fuente de verdad en código



```text

npm workspace: @appsalon/design-tokens

Ruta física:   shared/design-tokens/index.js

```



Import típico en React Native:



```javascript

import { colors, spacing, typography, radii, tabBarLayout } from '@appsalon/design-tokens';

```



## Paleta (resumen; detalle en el paquete)



| Área           | HEX aproximado | Nota                          |

|----------------|----------------|-------------------------------|

| Fondo          | `#F9F9F9`       | Opción cremosa `#FDFCFB`: `colors.backgroundAlt` |

| Oro / acento   | `#C5A368`       | Tabs activos, CTAs destacados |

| Hero oscuro    | `#2D2926`       | Bloque principal home         |

| Texto fuerte   | `#1A1A1A`       | Titulares sans                |

| Bordes         | `#E5E5E5`       | Tarjetas y divisores           |



## Tipografía



- **Cuerpo / UI:** Inter (400, 500) vía `@expo-google-fonts/inter`.

- **Títulos:** Playfair Display (400, 600) vía `@expo-google-fonts/playfair-display`.



Las claves (`typography.fontSans`, etc.) coinciden con los nombres registrados por `useFonts` en cada app.



## Ritmo UI



- **Radios:** `radii.sm`–`radii.xl` y `pill` para barras tipo píldora.

- **Espaciado:** `spacing.xs` … `spacing.xl` (`6 … 32`).

- **Tab inferior:** alto base en `tabBarLayout.height` + safe area.



## Otros enlaces



| Documento | Uso |

|-----------|-----|

| `docs/design/SALON_APP_PARITY_PLAN.md` | Paridad con app Salón |



## Frecuencia de construcción (UI)



1. Nuevas pantallas: `colors.background`, `ScrollView` con `spacing.lg` horizontal y hueco inferior ≥ tab bar + safe area.

2. Jerarquía: serif display para títulos de pantalla, Inter para párrafos.

3. Acentos: `colors.primary`; no añadir terceros acentes sin actualizar tokens.

4. Mocks solo en cada app (`apps/clientes/data/…`); tokens compartidos en `@appsalon/design-tokens`.

