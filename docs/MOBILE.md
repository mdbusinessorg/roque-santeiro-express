# App Android — Roque Santeiro Express

A app (Capacitor 7, `com.roquesanteiro.app`) abre o site de produção (`server.url` em `capacitor.config.ts`) e acrescenta funções nativas. Website e app usam o mesmo backend (Next.js na Netlify + Supabase), por isso qualquer deploy do site actualiza a app sem nova versão na Play Store.

## Funções nativas
- Splash, ícones e barra de estado com a identidade (gerados com `npx capacitor-assets generate --android` a partir de `assets/`).
- Ecrã offline incluído (`mobile/www/offline.html`) e aviso "Sem ligação" (`@capacitor/network`).
- Botão "voltar" do Android (`@capacitor/app`).
- Deep links: `https://roque-santeiro-express.netlify.app/...` (App Links verificados por `public/.well-known/assetlinks.json`) e `roquesanteiro://produto/<slug>`.
- Partilha nativa (`@capacitor/share`), câmara/galeria nas fotos de produto do vendedor (`@capacitor/camera`), vibração ligeira ao adicionar ao carrinho (`@capacitor/haptics`).
- Código partilhado em `src/lib/native.ts` e `src/components/native/native-bridge.tsx` (no browser não faz nada).

## Build (Windows)
```bash
npx cap sync android
cd android
# keystore.properties (não versionado) aponta para a keystore de release
JAVA_HOME=<jdk21> ANDROID_HOME=C:\Android\Sdk gradlew.bat assembleRelease bundleRelease
```
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB (Play Store): `android/app/build/outputs/bundle/release/app-release.aab`
- Se o Maven Central responder 429, usar `-I mirror.gradle` com o mirror `https://maven-central.storage-download.googleapis.com/maven2/`.
- Antes de cada nova versão subir `versionCode`/`versionName` em `android/app/build.gradle`.

## Keystore
`roque-release.jks` (alias `roque`) **não está no repositório** (repo público). Guardar a keystore e a palavra-passe em local seguro: sem elas não é possível publicar actualizações com a mesma assinatura. Se mudar de keystore, actualizar a impressão SHA-256 em `public/.well-known/assetlinks.json`.

## Ainda necessário
- Conta Google Play Console (25 USD, pagamento único) para publicar o AAB.
- Notificações push: criar projecto Firebase, adicionar a app Android `com.roquesanteiro.app` e colocar `google-services.json` em `android/app/`. Depois ligar o envio no backend (FCM HTTP v1 com conta de serviço).
