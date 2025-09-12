export default {
  expo: {
    name: "lomu",
    slug: "lomu",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/splash_lomu.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash_icon.png",
      resizeMode: "cover",
      backgroundColor: "#000000",
    },
    ios: {
      splash: {
        image: "./assets/splash_lomu.png",
        resizeMode: "cover",
        backgroundColor: "#000000",
      },
      supportsTablet: true,
      bundleIdentifier: "com.lomu.lomu",
      buildNumber: "1.0.0",
    },
    android: {
      splash: {
        image: "./assets/splash_icon.png",
        resizeMode: "cover",
        backgroundColor: "#000000",
      },
      adaptiveIcon: {
        foregroundImage: "./assets/splash_lomu.png",
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
      package: "com.lomu.lomu",
      versionCode: 1,
      permissions: [],
    },
    web: {
      favicon: "./assets/splash_lomu.png",
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    extra: {
      eas: {
        projectId: "bfbc21bf-0cad-49c8-97b4-0673b34a4f23",
      },
    },
  },
};
