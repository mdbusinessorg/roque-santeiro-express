type Cap = { isNativePlatform?: () => boolean };

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const c = (window as unknown as { Capacitor?: Cap }).Capacitor;
  return !!c?.isNativePlatform?.();
}

export async function tapFeedback() {
  if (!isNative()) return;
  try { const { Haptics, ImpactStyle } = await import("@capacitor/haptics"); await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

export async function shareLink(title: string, url: string, text?: string): Promise<"shared" | "copied" | "none"> {
  try {
    if (isNative()) { const { Share } = await import("@capacitor/share"); await Share.share({ title, text, url, dialogTitle: "Partilhar" }); return "shared"; }
    if (navigator.share) { await navigator.share({ title, text, url }); return "shared"; }
    await navigator.clipboard.writeText(url); return "copied";
  } catch { return "none"; }
}

export async function takePhoto(): Promise<File | null> {
  if (!isNative()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const p = await Camera.getPhoto({ quality: 82, width: 1600, resultType: CameraResultType.Uri, source: CameraSource.Prompt, promptLabelHeader: "Foto do produto", promptLabelPhoto: "Galeria", promptLabelPicture: "Câmara", promptLabelCancel: "Cancelar" });
  if (!p.webPath) return null;
  const blob = await (await fetch(p.webPath)).blob();
  return new File([blob], `foto-${Date.now()}.${p.format || "jpg"}`, { type: blob.type || "image/jpeg" });
}
