"use client";

import { track } from "@/lib/tracking";

import { useState } from "react";
import { Mail } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "err" | "busy">("idle");
  return (
    <section className="brand-gradient relative mt-8 overflow-hidden rounded-[2rem] p-6 text-white sm:p-10">
      <h2 className="text-xl font-bold sm:text-2xl">Receba as melhores ofertas primeiro</h2>
      <p className="mt-1 text-sm text-white/80">Novidades e descontos exclusivos no seu email.</p>
      {state === "ok" ? (
        <p className="glass-dark mt-4 rounded-2xl p-4 text-sm font-semibold">Subscrição feita. Obrigado!</p>
      ) : (
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("busy");
            const { error } = await supabaseBrowser().from("newsletter").insert({ email: email.trim().toLowerCase() });
            if (!error) track("Lead", { content_name: "newsletter" });
            setState(error && !error.message.includes("duplicate") ? "err" : "ok");
          }}
        >
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="O seu email" className="h-12 w-full rounded-full bg-white pl-10 pr-4 text-[15px] text-ink outline-none" />
          </div>
          <button disabled={state === "busy"} className="h-12 rounded-full bg-white px-5 text-sm font-bold text-brand-700">Subscrever</button>
        </form>
      )}
      {state === "err" && <p className="mt-2 text-sm text-white/85">Não foi possível subscrever. Tente novamente.</p>}
    </section>
  );
}
