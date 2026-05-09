# Plan de paridad visual: Clientes → Salón

Objetivo: misma línea luxury en **Salón** que en Clientes, sin divergencia de paleta ni tipografía.

## Fase 0 — Inventario (una vez)

- Depender del paquete **`@appsalon/design-tokens`** (`shared/design-tokens`): `npm install @appsalon/design-tokens` en workspace o agregar `"@appsalon/design-tokens": "*"` si la app está en el monorepo.
- Importar desde la app Salón igual que Clientes:

  ```javascript
  import { colors, spacing, typography, radii, tabBarLayout } from '@appsalon/design-tokens';
  ```

- Mantener fuentes coherentes donde haya UI nueva: `@expo-google-fonts/inter`, `@expo-google-fonts/playfair-display`, `expo-font`.

## Fase 1 — Shell + navegación

- Bottom tabs con **altura** compatible (`tabBarLayout`), **border** `tabBarBorder`, tab activo **`primary`** si se replica Clientes.

## Fase 2 — Componentes

- Preferir mover componentes repetidos (`SalonButton`, listas, etc.) a un paquete compartido después; mientras tanto, copiar con los **mismos tokens** desde `@appsalon/design-tokens`.

## Fase 3 — Lógica (después de UI)

- Conectar datos sin tocar valores de marca en `design-tokens` salvo necesidad de accesibilidad documentada.

## Checklist rápido ant release visual Salón

- [ ] Import `@appsalon/design-tokens`; sin HEX duplicados en la app
- [ ] Inter + Playfair según uso en Clientes
- [ ] Tab bar coherentes si hay navegación inferior
