# Requests of area `profile` (profile, account, language, alerts and sound, sessions, log out)

## Schema keys
| Key | Value | Why | Mockup |
|---|---|---|---|
| `profile_photo.sizes.card` (a component `profile_photo` with the user card's and the edit screen's photo) | card 64, edit 88 | the user card draws a 64 disc; `avatar.sizes` has `lg` 56 and `xl` 88, so the card uses `lg` (marked `THEME-KEY-PENDING` in `UserProfileForm/index.tsx`) and the edit screen `xl` | Profile, ProfileEdit |
| `list_row.base.min_height` for a two-line row with a trailing button | 64 | the Sessions rows (title, dates, "Sign out" 44) are drawn 64 high; `list_row.min_height` is 56 and the content (a 44 button + padding) makes the row about 64 anyway | Sessions |
| `components.badge` variant for "Always on" | the success badge as is | the new-order alert row has no switch (OQ-15 a); it shows `OBadge success` "Always on". No key needed, listed so the editor team knows the badge is read here | Notifications |

## Backend
| Request | Why |
|---|---|
| Fill `UserSession.device` at login (user agent or a header the app sends) and return it in `GET /users/:id/sessions` | the Sessions screen shows only the dates for the other devices; the mockup draws "iPad · Kitchen tablet". The current device's label is built on the phone (`Android · this phone`) |
| The store name on the user (or `GET /users/:id` with the business) | the user card draws "Business owner · Luna Pizza"; the session user has no store name, so the card shows the role only |
| Per-user push preferences (new messages, order updates) | the Alerts and sound mockup draws two switches the server cannot honor yet: not drawn |
| `POST /users/check_password` already exists; no change | used by the Password screen's "Current password" |

## Submodule (ordering-components, additive)
| Request | Why |
|---|---|
| `handleRemovePhoto` in `UserFormDetails` (the driver app's `ede30be`, `#426`) | the photo sheet's "Remove photo" row (with its confirmation) shows only when the controller gives `handleRemovePhoto`; the installed submodule does not have it yet, so the row is absent until the submodule is bumped |

## Notes for the coordinator
- Libraries no longer imported by this area: `react-native-country-picker-modal` (language list; also used by `LanguageSelector/lang_country.json`, deleted), `toggle-switch-react-native`, `rn-placeholder`, `react-native-select-dropdown` was never here. `react-native-image-picker` stays (photo), `react-native-permissions` stays, `react-hook-form` stays (information form).
- `jest/helpers/mockUi.js` still has the old `UserProfileForm` and `Sessions` stand-ins (no test of this area uses them any more): remove them with the last other user.
- `jest/helpers/b7LegacyDefaults.js` lost `sampleScheduleDay` and `driverScheduleDefaults`; `jest/helpers/b2AuthUiMock.js` lost its `DriverSchedule` stub; `jest/coverage-include.js` lost the `DriverSchedule` line.
