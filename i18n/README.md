# Translations

`i18n/translations.json` stores translations by key. `i18n/config.json` defines the source language and supported locales. The scanner includes the app and the SDK pinned by the submodule; initialize the submodule before generating.

```sh
yarn i18n:generate
yarn i18n:missing --summary
yarn i18n:verify
yarn i18n:check-generated
```

Add keys with `t('KEY', 'Fallback text')`. Preserve existing translations and their placeholders. If a locale does not yet have a translation, the source text provides a visible fallback. Values supplied dynamically by the backend have no static literal translation.

The generator updates the catalog, the product compatibility JSON/CSV, and the key and conflict CSV files. Review the output before integrating it. `i18n:check-generated` checks that regenerating does not change the artifacts.

`i18n:sync` shows a dry-run. Synchronizing with your backend requires your own configuration from `i18n/.env.example` and an explicit `i18n:sync:live` invocation. Never publish the synchronization key.
