# Theme (Blue / Orange)

Theme is controlled by the **environment variable** `VITE_THEME`.

- **Unset or empty:** Default app theme (see `src/index.css`).
- **`VITE_THEME=blue`:** Blue brand theme (`blue.css`).
- **`VITE_THEME=orange`:** Orange brand theme (`orange.css`).

## Enabling Blue theme

Create a `.env` in the project root (or set in your environment):

```bash
VITE_THEME=blue
```

Then run the app as usual (`npm run dev` / `npm run build`). The app adds the class `theme-blue` to `<html>` and loads `blue.css`, which overrides semantic CSS variables (e.g. `--app-fg`, `--app-bg`, `--panel-bg`) with the Blue palette.

## Enabling Orange theme

Create a `.env` in the project root (or set in your environment):

```bash
VITE_THEME=orange
```

Then run the app as usual (`npm run dev` / `npm run build`). The app adds the class `theme-orange` to `<html>` and loads `orange.css`, which overrides semantic CSS variables (e.g. `--app-fg`, `--app-bg`, `--panel-bg`) with the Orange palette.

## Cisco palette (reference)

| Role       | Hex       | Usage                           |
|------------|-----------|---------------------------------|
| Blue       | `#02C8FF` | Primary accent, gradients       |
| Midnight   | `#07182D` | Primary dark, text (light mode) |
| Medium Blue| `#0A60FF` | Primary actions, links          |
| White      | `#FFFFFF` | Primary light, text (dark mode) |
| Magenta    | `#FF007F` | Accent (≤5%), not text          |
| Orange     | `#FF9000` | Accent (≤5%), not text          |

~70% of the UI uses White or Midnight Blue. Magenta and Orange are used sparingly and not as text.

## Orange palette (reference)

| Role          | Hex       | Usage                           |
|---------------|-----------|---------------------------------|
| Orange Accent | `#FF8A00` | Primary accent, gradients       |
| Espresso      | `#2B160A` | Primary dark, text (light mode) |
| Sunset Orange | `#FF6A00` | Primary actions, links          |
| Warm White    | `#FFF7F0` | Primary light, text (dark mode) |
| Berry         | `#D4004F` | Accent (≤5%), not text          |
| Citrus        | `#FFC447` | Accent (≤5%), not text          |

~70% of the UI uses Warm White or Espresso. Berry and Citrus are used sparingly and not as text.
