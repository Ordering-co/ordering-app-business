'use strict'

/**
 * Shared developer-facing hint when locales are incomplete.
 * Printed by verification tools to describe the catalog and validation commands.
 */

function printTranslateKeysHint (stream = console.error) {
  stream('')
  stream('────────────────────────────────────────────────────────────')
  stream('INFO: Translation locales are incomplete.')
  stream('')
  stream('  Next step:')
  stream('    Fill the missing supported locales in i18n/translations.json.')
  stream('')
  stream('  Preserve source text and placeholders:')
  stream('    Use literal source text as fallback where a translation is unavailable.')
  stream('')
  stream('  Translation documentation:')
  stream('    i18n/README.md')
  stream('    i18n/config.json')
  stream('')
  stream('  Check progress:')
  stream('    yarn i18n:missing --summary')
  stream('    yarn i18n:verify')
  stream('────────────────────────────────────────────────────────────')
  stream('')
}

module.exports = { printTranslateKeysHint }
