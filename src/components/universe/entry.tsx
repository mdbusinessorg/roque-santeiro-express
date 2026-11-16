import type { Universe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UniverseDoor } from "@/components/universe/door";

const COPY: Record<Universe, { name: string; line: string }> = {
  feminino: { name: "Feminino", line: "Para ela" },
  masculino: { name: "Masculino", line: "Para ele" },
};

function DoorCard({ universe }: { universe: Universe }) {
  const dark = universe === "masculino";
  return (
    <UniverseDoor universe={universe} className={cn("group relative flex h-[188px] flex-col overflow-hidden rounded-[1.6rem] p-4 transition active:scale-[0.98] sm:h-[230px] sm:p-6", dark ? "bg-[#111113] text-white" : "bg-[#eff6ff] text-ink")}>
      <p className={cn("text-[9.5px] font-semibold uppercase tracking-[0.42em]", dark ? "text-gold" : "text-gold-700")}>Universo</p>
      <p className="mt-0.5 text-[26px] font-extralight leading-none tracking-[0.02em] sm:text-4xl">{COPY[universe].name}</p>
      <p className={cn("mt-1 text-[11.5px]", dark ? "text-white/55" : "text-ink/60")}>{COPY[universe].line}</p>
      <span className={cn("mt-auto inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11.5px] font-bold", dark ? "bg-neutral-900 text-white" : "bg-neutral-900 text-white")}>Abrir a porta</span>
      <span aria-hidden className="absolute bottom-0 right-3 h-[74%] w-[40%] max-w-[150px] sm:right-6">
        <span className={cn("absolute inset-0 rounded-t-full", dark ? "bg-white/[0.07]" : "bg-slate-900/60")} />
        <span className="absolute inset-x-[16%] bottom-0 top-[22%] overflow-hidden rounded-t-[3px] bg-[#0b0b0c] ring-2 ring-[#0b0b0c]">
          <span className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_55%,#fff,#ffe9ad)]" />
          <span className="absolute inset-y-0 left-0 w-1/2 origin-left bg-gradient-to-b from-[#1c1c1f] to-[#070708] transition-transform duration-700 ease-out group-hover:[transform:perspective(300px)_rotateY(-38deg)]" />
          <span className="absolute inset-y-0 right-0 w-1/2 origin-right bg-gradient-to-b from-[#1c1c1f] to-[#070708] transition-transform duration-700 ease-out group-hover:[transform:perspective(300px)_rotateY(38deg)]" />
          <span className="absolute left-1/2 top-[46%] h-[10%] w-[3px] -translate-x-[5px] rounded-full bg-gold" />
          <span className="absolute left-1/2 top-[46%] h-[10%] w-[3px] translate-x-[2px] rounded-full bg-gold" />
        </span>
      </span>
    </UniverseDoor>
  );
}

/** Entrada dos dois universos. A porta só existe aqui. */
export function UniverseEntry() {
  return (
    <section className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="Universos">
      <DoorCard universe="feminino" />
      <DoorCard universe="masculino" />
    </section>
  );
}
