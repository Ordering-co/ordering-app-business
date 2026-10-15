# Ordering Business App

## Start with an agent

1. Paste this prompt into your coding agent:

> Reuse my existing checkout of Business App, checking its remote and preserving all work. If none exists, run `git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-business.git` into a new folder. Follow README and docs/onboarding.md to launch my Ordering project in a local iOS simulator without Firebase. Reuse my Ordering connection or accept my project slug. Verify the selected project and one visible edit.

2. Confirm the Ordering project. Reuse an existing connection; sign in only if account access is needed. A known project slug can be validated publicly without developer authentication.
3. Open the preview, check its project label and make one visible edit with Fast Refresh. No account credentials or operational backend write are needed for this interface check.

### Manual local preview

Use Node >=20.19.4 (Node 22 recommended), Yarn 1 and the pinned Ruby/Bundler/CocoaPods versions. Install dependencies with `yarn install --frozen-lockfile`, run `bundle _2.7.1_ install`, then `bundle _2.7.1_ exec pod install --deployment` from `ios/`. Launch with:

```sh
yarn ordering:ios-local --without-firebase --project YOUR_PROJECT_SLUG
```

The adapter selects the newest available compatible iOS runtime from the selected Xcode before considering any saved simulator. To choose an installed older runtime explicitly, add `--runtime 26.0` or its full `com.apple.CoreSimulator.SimRuntime.iOS-26-0` identifier. Invalid or incompatible selections fail without fallback. Existing simulators are preserved; see the runbook for ownership history.

Success means the actual native screen shows `Local preview · project: YOUR_PROJECT_SLUG`, Home and Login, and a visible edit appears through Fast Refresh. See the [onboarding runbook](docs/onboarding.md) for configuration, normal native setup, switching, recovery, diagnosis and updates. Normal/Release startup retains its existing service registrations and behavior.

Mobile app for business operators: orders, stores, messages, printing and offline actions.

A bare React Native project for Android and iOS. React Native 0.81.1, React 19.1.0 and TypeScript.

## Requirements

- Node.js 22 LTS (React Native requires Node >=20.19.4) and Yarn Classic 1.22.
- Android: JDK 17, Android Studio, and the SDK and NDK versions specified in `android/build.gradle`.
- iOS: macOS, Xcode compatible with React Native 0.81, Ruby as specified in `.ruby-version`, Bundler and CocoaPods as specified in `Gemfile.lock`. [React Native 0.81 requires Xcode 16.1 or later](https://reactnative.dev/blog/2025/08/12/react-native-0.81).
- An Ordering project with API and sockets enabled to test real workflows.

## Get the source

Reuse an existing checkout after inspecting its remote and preserving all changes. Clone into a new folder only when needed:

```sh
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-business.git
cd ordering-app-business
yarn install --frozen-lockfile
```

The SDK is a submodule from `https://github.com/Finitless-com/ordering-components.git`. If you cloned without submodules, run `git submodule update --init --recursive`. Keep the revision pinned by the repository's gitlink.

## Configure your application

Edit `src/config.json` and replace `YOUR_PROJECT` with your project. Review `api`, `socket`, language, app name and product settings. Public identifiers and product options are defined in the source. `src/theme.json` contains the theme and visual assets.

`builder.json`, `app.json`, Android/iOS projects and schemes must match your application identifiers. Set up your own bundle identifier, Apple team, provisioning profiles and signing in Xcode. Configure your own Android release signing; `android/app/debug.keystore` is the public debug template and must not be used to publish a production application.

Add your own Firebase registrations at `android/app/google-services.json` and `ios/GoogleService-Info.plist`, and ensure the plist belongs to the `businessApp` target. These service files are required for native builds using Firebase. Replace native Maps placeholders and configure the integrations you enable with your own service settings. Keep private credentials, provisioning profiles and production keystores out of the repository.

Operators need an account with administrator or business owner permissions. Printing requires a compatible printer and your own configuration.

## Run

```sh
yarn start
# In another terminal:
yarn android
```

For iOS, install Ruby dependencies and pods first:

```sh
bundle install
cd ios
bundle exec pod install
cd ..
yarn ios
```

Running on a device requires your own permissions and services. Metro serves JavaScript; it does not by itself produce APK/IPA files or verify login, orders, payments, location or notifications.

## Validate

```sh
yarn lint:check
yarn exec tsc --noEmit
yarn test --runInBand
yarn test:coverage --runInBand
yarn test:coverage:summary --no-run
yarn i18n:verify
yarn i18n:check-generated
```

`yarn lint` applies changes; use `lint:check` for review. Coverage measures the paths listed in `jest/coverage-include.js`; CI requires a 70% average across statements, branches, functions and its line-count fallback. Mocks do not replace device testing against your backend.

## Translations

`i18n/translations.json` is the locale catalog. Run `yarn i18n:generate` to regenerate derived files and see `i18n/README.md`. English fallback values provide visible text where a translation is still missing; review translations before distributing your app in those languages.

## License

This code is distributed under the terms in [license-ordering.txt](license-ordering.txt). Dependencies, the SDK and third-party assets retain their own licenses and notices.
