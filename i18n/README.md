# i18n — Business App (implementation notes  / implementation notes )

Source of truth for UI translation keys (`useLanguage` / `t('KEY', 'fallback')`).

## Config (locales SSoT)

[`config.json`](./config.json):

```json
{
  "product": "business_app",
  "prefix": "BUSINESS_APP_",
  "sourceLanguage": "en",
  "supportedLocales": ["es", "fr", "it", "de", "pt", "da", "nl", "ar", "el", "bg", "tr"],
  "catalogPath": "i18n/translations.json",
  "legacyCatalogPath": "app-business-translations.json"
}
```

- Catalog keys are **unprefixed**. Sync applies `BUSINESS_APP_` at POST time.
- Runtime already prefixes via `app_internal_name: business_app`.

## Commands

```bash
pnpm i18n:generate                         # scan src/ → translations.json + legacy JSON/CSV
pnpm i18n:verify                           # code, catalog completeness and glossary
node --test i18n/verify.test.cjs             # verify rejects a reverted glossary value
pnpm i18n:missing --summary
pnpm i18n:missing --limit 40 --write i18n/batch-missing.json
pnpm i18n:apply-batch i18n/batch-filled.json --strict
pnpm i18n:sync                             # dry-run (default)
```

Fill locales with project skill [`.cursor/skills/translate-keys/SKILL.md`](../.cursor/skills/translate-keys/SKILL.md) (`/translate-keys`).

## Legacy files

`generate` still updates root:

- `app-business-translations.json` — `{ translation: { KEY: en } }`
- `app-business-translations.csv` — `Key,Value`

Prefer `i18n/translations.json` for multi-locale work going forward.

## Glossary

[`glossary.json`](./glossary.json) protects reviewed order terms. If a product
decision changes one of those terms, update the catalog and glossary together.

## CI and sync

The [i18n Sync workflow](../.github/workflows/i18n-sync.yml) checks the
catalog and glossary and dry-runs the corrections on pull requests. On pushes
to this repository's `main` that change `i18n/translations.json`, it uses the
previous main commit as the baseline. The payload contains changed values for
keys and locales present in both commits, with the same English source and
with the previous locale value included for comparison.

API Core's `PATCH /{version}/system/bulks/translations` checks the key, locale
and previous value in the global database. It updates existing rows, skips
protected rows and recognizes values already applied on a retry. If a row is
missing or its previous value differs, the request fails and rolls back that
batch. Deploy this API and its main database migration before merging the
restoration that enables the workflow.

Live runs use the repository's `ORDERING_API_BASE_URL` and
`ORDERING_TRANSLATION_SYNC_KEY` GitHub secrets. `ORDERING_API_VERSION` defaults
to `v400`. For an offline preview against an ancestor of the current commit,
run `node i18n/sync-corrections.cjs --base <full-sha>`.

## Scope

Scans `src/` including `src/@/components` submodule. Do not edit the submodule from this repo for string fixes.

For an approved local live run, [`i18n/.env.example`](./.env.example) lists the
options loaded from the gitignored `i18n/.env` file.
