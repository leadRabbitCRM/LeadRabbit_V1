import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.app",
  appName: "app",
  webDir: "public",
  server: {
    url: "http://192.168.29.100:4000",
    cleartext: true,
  },
};

export default config;
