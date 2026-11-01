import { BadgeCheck } from "lucide-react";
import type { Store } from "@/lib/types";

export function StoreAvatar({ store, size = 48 }: { store: Pick<Store, "name" | "logo_url" | "is_official">; size?: number }) {
  const initials = store.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {store.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.logo_url} alt={store.name} className="h-full w-full rounded-[30%] bg-white object-cover shadow" />
      ) : (
        <span className="brand-gradient grid h-full w-full place-items-center rounded-[30%] font-extrabold text-white shadow-lg shadow-brand-600/25" style={{ fontSize: size * 0.36 }}>{initials}</span>
      )}
      {store.is_official && <BadgeCheck className="absolute -bottom-1 -right-1 rounded-full bg-white text-brand-600" style={{ width: size * 0.38, height: size * 0.38 }} />}
    </span>
  );
}
