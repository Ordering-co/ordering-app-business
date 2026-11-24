# Fix round 6, iPhone (IOS3-B1, IOS3-C2, IOS-C8)

Device: iPhone 17 Pro simulator, Debug build on Metro (8097). Screenshots stay in the scratchpad (`pass8/ios/`): one shows the profile's e-mail, none is committed.

## IOS3-B1: "View" on the unavailable notice opened the keyboard

- **Cause.** The search field of the menu always mounted with `autoFocus`, so any way into search (the search button and "View") put the keyboard up, and the keyboard covered the pinned "Make all available" bar.
- **Fix.** `openSearch(unavailable)` sets `focusSearch = !unavailable`; the field has `autoFocus={focusSearch}`. The search button still focuses (the user asks to type); "View" asks to see a list and does not. The field stays tappable.
- **Files.** `src/ui/src/components/BusinessProductList/index.tsx`, test in `BusinessProductList/__tests__/BusinessProductList.test.tsx` (fails on the old code: `autoFocus` was `true` after "View").
- **Seen on the iPhone.** Yes. Product "Blouse" of the first store switched off: notice "1 product is unavailable"; "View": filtered list, no keyboard, "Make all available" visible at the bottom; tapping the field brings the keyboard up (the bar is then under it, as always while typing); the search button focuses the field. Product switched on again afterwards.

## IOS3-C2: Sessions row 56 pt high

- **Cause.** The rows were `OListRow`, whose vertical room is `list_row.base.padding_y` (5) and `min_height` (56), made for rows that end with a glyph. The mockup's rows end with a 44 pt button and use `padding: 10px 0`, `min-height: 64px`.
- **Fix.** A Sessions-only row, `SessionRow`: the list row's texts, gap, divider and colors (`list_row.base`), and the vertical room of a row with a button: `button.sizes.md.height` + 2 x `space.sm` (44 + 10 + 10 = 64), padding `space.sm`. No schema change; the virtualized `FlatList` and its test (150 sessions mount at most 15 rows) are untouched and pass.
- **Files.** `src/ui/src/components/Sessions/SessionRow.tsx` (new), `Sessions/index.tsx`, test in `Sessions/__tests__/Sessions.test.tsx` (min height 64, padding 10, gap 15, divider).
- **Seen on the iPhone.** Yes: the rows are 65 pt apart (64 + the 1 pt line) in the accessibility tree; the button is 44 high.
- **Not changed (for the schema owner, if wanted).** `list_row.base.padding_y` stays 5 for the other list rows.

## IOS-C8: the language sheet in English names

- **Decision check.** `docs/theme/decisions.md` has no decision that the names stay as the server gives them (its only language entry is about which language the button shows).
- **Cause.** The API's language object is `id, name (English), code, default, enabled, rtl`: no native name. Neither the driver nor the marketplace app solves it (both use `name` too).
- **Fix.** `LanguageSelector/nativeNames.ts`: a table of native names by code (about 55 languages, `zh-CN` etc. whole), a regional or variant code ("es-419-1") is the base native name plus the server's parenthetical ("Español (Mexico)"), an unknown code keeps the server's name. The list is still the server's (25 rows, its order). Used for the sheet rows, the profile row's subtitle and the login link's text; the login link's accessibility label is "Language: Español, Spanish" (native, then English).
- **Files.** `src/ui/src/components/LanguageSelector/index.tsx`, `nativeNames.ts`, `__tests__/LanguageSelector.test.tsx`, `__tests__/nativeNames.test.ts`; two expectations of `LoginForm/__tests__/LoginForm.test.tsx` changed from "Spanish" to "Español" (outside my folders, same behavior).
- **Seen on the iPhone.** Yes: Profile, Language: Deutsch, Español, Español (Mexico), Español (La - Guatemala), Dansk, Nederlands, Português, Català, Français, Türkçe, ខ្មែរ, the rest below; English stayed selected and nothing was picked.
- **Not done.** The sheet's rows (`OSelect`, a shared primitive) have no accessibility label of their own, so a screen reader says the native name only; the English second part would need an `accessibilityLabel` on `SelectOption` in `OSelect`. Variants keep the server's English qualifier ("Mexico", "La - Guatemala").

## Not mine

IOS3-C3 (the clock) is a logged decision: unchanged.
