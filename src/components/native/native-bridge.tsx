"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { isNative } from "@/lib/native";

const HOST = "roque-santeiro-express.netlify.app";

export function NativeBridge() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    document.documentElement.classList.add("native-app");
    const subs: { remove: () => void }[] = [];
    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }, { Network }] = await Promise.all([
        import("@capacitor/app"), import("@capacitor/status-bar"), import("@capacitor/splash-screen"), import("@capacitor/network"),
      ]);
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#111113" }).catch(() => {});
      SplashScreen.hide().catch(() => {});
      setOffline(!(await Network.getStatus()).connected);
      subs.push(await Network.addListener("networkStatusChange", (s) => setOffline(!s.connected)));
      subs.push(await App.addListener("backButton", ({ canGoBack }) => { if (canGoBack) window.history.back(); else App.minimizeApp(); }));
      subs.push(await App.addListener("appUrlOpen", ({ url }) => {
        try { const u = new URL(url); if (u.host === HOST || u.protocol === "roquesanteiro:") router.push((u.protocol === "roquesanteiro:" ? "/" + u.host + u.pathname : u.pathname) + u.search); } catch {}
      }));
    })();
    return () => subs.forEach((s) => s.remove());
  }, [router]);

  if (!offline) return null;
  return (
    <div role="alert" className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-[100] flex items-center gap-2 rounded-2xl bg-ink/90 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">
      <WifiOff className="h-4 w-4 shrink-0 text-gold" /> Sem ligação. As alterações serão retomadas quando voltar a internet.
    </div>
  );
}
