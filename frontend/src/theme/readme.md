# Theme (Blue)

Theme is controlled by the **environment variable** `VITE_THEME`.

- **Unset or empty:** Default app theme (see `src/index.css`).
- **`VITE_THEME=blue`:** Blue brand theme (`blue.css`).

## Enabling Blue theme

Create a `.env` in the project root (or set in your environment):

```bash
VITE_THEME=blue
```

Then run the app as usual (`npm run dev` / `npm run build`). The app adds the class `theme-blue` to `<html>` and loads `blue.css`, which overrides semantic CSS variables (e.g. `--app-fg`, `--app-bg`, `--panel-bg`) with the Blue palette.

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
