export function rpcError(e: { message?: string } | null | undefined) {
  if (!e?.message) return "Ocorreu um erro. Tente novamente.";
  return e.message.replace(/^.*?ERROR:\s*/, "");
}
