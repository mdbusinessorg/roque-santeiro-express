import Link from "@/components/ui/native-link";
import type { Store } from "@/lib/types";
import { STORE_STATUS } from "@/lib/utils";

export function StoreGate({ store, children }: { store: Store | null | undefined; children: React.ReactNode }) {
  if (store === undefined) return <div className="skeleton mt-6 h-60" />;
  if (!store) return (
    <div className="card mx-auto mt-8 max-w-md p-8 text-center">
      <p className="text-lg font-bold">Ainda não tem uma loja</p>
      <p className="mt-1 text-sm text-ink/60">Registe a sua loja para começar a vender.</p>
      <Link href="/vender" className="btn-primary mt-4">Tornar-se vendedor</Link>
    </div>
  );
  return (
    <>
      {store.status !== "approved" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>{STORE_STATUS[store.status]}.</b> {store.status === "pending" ? "Pode preparar produtos, mas só ficam visíveis ao público depois da aprovação." : store.admin_note}
        </div>
      )}
      {children}
    </>
  );
}
