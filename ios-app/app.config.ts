const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export default {
  expo: {
    name: "Roque Santeiro Express",
    slug: "roque-santeiro-express",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "roquesanteiro",
    userInterfaceStyle: "light",
    backgroundColor: "#ffffff",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.roquesanteiro.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "Usamos a câmara para fotografar comprovativos de pagamento e produtos.",
        NSPhotoLibraryUsageDescription: "Usamos a galeria para fotografar comprovativos de pagamento e produtos.",
      },
    },
    android: {
      package: "com.roquesanteiro.app",
      adaptiveIcon: {
        backgroundColor: "#111111",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-image",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#f2b21b",
        },
      ],
      "expo-image-picker",
    ],
    extra: {
      supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: env.EXPO_PUBLIC_SITE_URL,
    },
  },
};
