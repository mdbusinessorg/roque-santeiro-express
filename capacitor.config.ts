import type { CapacitorConfig } from "@capacitor/cli";

const SITE = "https://roque-santeiro-express.netlify.app";

const config: CapacitorConfig = {
  appId: "com.roquesanteiro.app",
  appName: "ROQUE SANTEIRO",
  webDir: "mobile/www",
  backgroundColor: "#ffffff",
  server: {
    url: SITE,
    errorPath: "offline.html",
    androidScheme: "https",
    allowNavigation: ["roque-santeiro-express.netlify.app", "*.supabase.co"],
  },
  android: { allowMixedContent: false },
  ios: { contentInset: "never", scrollEnabled: true },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: true, backgroundColor: "#0b0b0d", showSpinner: false, androidScaleType: "CENTER_CROP", splashFullScreen: false, splashImmersive: false },
    StatusBar: { style: "DARK", backgroundColor: "#111113", overlaysWebView: false },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
