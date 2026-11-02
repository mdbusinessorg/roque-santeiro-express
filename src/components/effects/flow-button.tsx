import Link from "@/components/ui/native-link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlowButton({ children, href, className, light }: { children: React.ReactNode; href: string; className?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold transition active:scale-[0.97]",
        light ? "bg-white text-brand-800" : "brand-gradient text-white shadow-lg shadow-brand-600/30",
        className,
      )}
    >
      <span className={cn("absolute inset-0 -translate-x-full transition-transform duration-500 group-hover:translate-x-0", light ? "bg-brand-50" : "bg-white/15")} />
      <span className="relative">{children}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
