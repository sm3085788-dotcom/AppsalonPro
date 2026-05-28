## Dark Mode QA Checklist

Use this checklist before each APK/AAB candidate.

### Core Visual Continuity
- Launch app in dark mode and confirm no white flashes between splash -> boot -> home.
- Open/close sub-screens and modals; verify background stays theme-colored.
- Confirm status bar and Android navigation bar icons have correct contrast.

### Clientes
- Inicio: header, quick access rows, message icon badge and section cards.
- Mensajes: list background, bubbles, composer, preview bar, image actions.
- Notificaciones: switches, cards, dividers, secondary labels.
- Citas/Tienda/Profile: scroll roots, cards, empty states, sheet backdrops.

### Salon
- Home module grid: tile surfaces, badges, alert bell contrast.
- Agenda/Mensajes/Pedidos/Marketing: root background continuity and modal sheets.
- Auth and missing-config states: text readability in both light/dark.

### Interaction States
- Disabled buttons remain legible in dark mode.
- Active/selected chips do not use fixed light colors.
- Error/success badges preserve contrast on dark cards.

### Regression Guard
- Run lints on touched files after each dark mode batch.
- Re-check with Android and iOS system dark mode toggles.
