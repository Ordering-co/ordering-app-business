# Requests of area `access` (Login, Forgot, login code, phone verification)

## Schema keys
| Key | Value | Why | Mockup |
|---|---|---|---|
| `components.link.sizes.md.text` weight (or a `link.base.weight`) | 600 (`typography.label`) | the mockups draw every text link in semibold ("Forgot your password?", "Back to log in", "Resend code in 0:38"); `link.sizes.md.text` is `body` (400). Left as the schema has it, no pending marker in code | Login, LoginCode, Forgot |

No `auth_form.base.max_width`: the column is `screen.base.max_width` (0 on phone, 600 on tablet), as `docs/theme/components.md` decided.

## Images
| Item | Note |
|---|---|
| `logotype` | no bundled fallback (`IMAGE_FALLBACKS` is empty): without a theme image the login draws the store glyph in an `IconTile`. If the owner wants a bundled logo, `src/theme/bundledImages.ts` + `IMAGE_FALLBACKS.logotype` must map it (not in this area's files) |

## Backend
None. The "Send again in 0:45" wait is a client constant (the server answers OK to every `forgot` request and limits silently).

## Notes for the coordinator
- `src/types/@fatnlazycat/react-native-recaptcha-v3/index.d.ts`, the dependencies `@fatnlazycat/react-native-recaptcha-v3`, `react-native-phone-number-input` and `react-native-country-picker-modal` (language list, phone prefix) are no longer imported by this area.
- `jest/helpers/b2AuthUiMock.js` / `b2AuthDefaults.js` are no longer used by the access tests (b2AuthDefaults still serves them for the controller defaults).
