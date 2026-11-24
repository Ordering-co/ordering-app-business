# Ordering App Business (themed)

[Ordering Quickstart and local onboarding](docs/onboarding.md) covers project configuration, the simulator and the first visible edit.

Bare **React Native** app for restaurant and store operators on Ordering.co / OrderingPlus: follow and accept orders, a kitchen
board on tablets, messages with customers, stores and menus, ticket printing, push notifications. Redesigned to the approved
mockups and editable through the Ordering theme engine (product type `store_app`).

This project uses a git submodule for shared headless logic: [Finitless-com/ordering-components](https://github.com/Finitless-com/ordering-components)
at `src/@/components`.

AI assistants: see [`CLAUDE.md`](./CLAUDE.md) for architecture, commands, and edit boundaries. Styling anything: read
[`docs/THEMING.md`](./docs/THEMING.md) first.

## Stack

- React Native **0.88.1** (new architecture, Hermes; not Expo), React **19.3.0**, TypeScript
- styled-components/native, themed with `@orderingco/ordering-theme-engine` 0.14.0
- pnpm (pinned in `package.json` `packageManager`, through `corepack enable`), Node **>= 22.13**
- Android package and iOS bundle `co.ordering.business`; iOS project `OBusiness`
- Phones (portrait) and tablets (free rotation; a side rail, a kitchen board and two panes in landscape)

## Getting started

> Complete the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) first. Android builds need
> JDK 17 or newer; iOS builds need Xcode 26 or later.

### Clone with the submodule

```sh
git clone --recursive https://github.com/Ordering-co/ordering-app-business.git
cd ordering-app-business
corepack enable
pnpm install
```

If you already cloned without `--recursive`:

```sh
git submodule update --init --recursive
pnpm install
```

### Point the app at an API

`src/config.json` holds the runtime configuration (project, API and socket URLs, `app_id`). **Edit it locally and never commit
that change**: the Builder writes each brand's values.

### Run

```sh
pnpm start           # Metro (pnpm start:reset clears its cache)
pnpm android         # emulator or device
pnpm ios             # simulator or device
```

First clone, or after a native dependency changes, install the iOS pods (Homebrew's `pod`):

```sh
bundle install
cd ios && pod install && cd ..
```

Printers, push notifications and the new-order alarm cannot be tried on a simulator.

### Verify changes

```sh
npx tsc --noEmit
pnpm lint:check
pnpm test                 # pnpm test:coverage is what CI gates (average coverage >= 70 %)
pnpm theme:validate && pnpm theme:verify && pnpm theme:guard && pnpm theme:keys && pnpm theme:reads && pnpm theme:extremes
pnpm i18n:verify && pnpm i18n:check-generated
```

Run these checks locally before opening a pull request. For native changes, also verify both platform builds.

## Project layout (short)

| Path | Role |
|------|------|
| `src/@/components` | Git submodule: headless controllers and hooks (`@components`) |
| `src/ui` | Presentational components (`@ui`); the primitives are in `src/ui/src/components/shared` |
| `src/theme` | The theme runtime: engine, provider, the served-theme request and cache, helpers, platform and layout |
| `src/pages` | Thin screen wrappers |
| `src/navigators` | React Navigation (root, home, tabs), push and launch plans; `routes/` holds each area's stack screens |
| `src/printing` | Printing without UI: Star, Epson and generic Bluetooth adapters, ticket text |
| `src/context` | App-only contexts (permissions, shell, bottom bar, reconnect, unread messages, new orders) |
| `product.schema.json` | The theme schema (compiles to `src/theme.compiled.json`) |
| `docs/` | Theming rules and decisions, the upgrade's notes, [backend requests](./docs/BACKEND_REQUESTS.md), [performance review](./docs/PERFORMANCE.md), [verification](./docs/theme/verification.md) |
| `i18n/` | The translation catalog and its scripts |

## Related apps

| Repo | Role |
|------|------|
| [ordering-components](https://github.com/Finitless-com/ordering-components) | Shared submodule |
| [Customer App](https://github.com/Ordering-co/ordering-app-customer) | Customer mobile app, themed |
| [Driver App](https://github.com/Ordering-co/ordering-app-driver) | Driver mobile app, themed |
| [Ordering Website](https://github.com/Ordering-co/ordering-website-customer) | Customer web |

## Troubleshooting

If Metro or the native builds fail, see the [React Native troubleshooting guide](https://reactnative.dev/docs/troubleshooting).
`pnpm install` fails if a patch in `patches/` no longer applies; read `pnpm-workspace.yaml` before dropping one.
