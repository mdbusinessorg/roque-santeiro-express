import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODELS = [
  process.env.GROQ_VISION_MODEL,
  "qwen/qwen3.8-27b",
].filter(Boolean) as string[];

const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 8;
}

const SYSTEM = `És o assistente de compras do Roque Santeiro Express, um marketplace de Angola.
O cliente enviou uma foto de um produto que quer comprar. A tua tarefa é identificar o produto na imagem e gerar uma pesquisa para encontrar o MESMO produto ou equivalentes no catálogo.
Responde SEMPRE só com JSON válido: {"q": "termos de pesquisa em português", "desc": "descrição curta do produto"}
Regras:
- "q" deve ter no máximo 8 palavras, com os termos mais úteis para pesquisa: tipo de produto, marca se visível, modelo, cor, características principais.
- Se não conseguires identificar o produto, usa termos genéricos do que é visível (ex.: "camisola vermelha homem").
- Não inventes marcas ou modelos que não sejam visíveis na imagem.
- "desc" descreve o produto visível em 1 frase, sem elogios.`;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "A busca por foto não está configurada." }, { status: 503 });
  const ip = req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Demasiadas pesquisas. Tenta daqui a pouco." }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Envie uma foto." }, { status: 400 });
  if (file.size > 6 * 1024 * 1024) return NextResponse.json({ error: "Foto demasiado grande." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  let last = "";
  for (const model of MODELS) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25_000);
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", signal: ctl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model, temperature: 0.2, max_completion_tokens: 300,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: [
              { type: "text", text: "Identifica o produto nesta foto e gera os termos de pesquisa." },
              { type: "image_url", image_url: { url: dataUrl } },
            ] },
          ],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const content = String(j.choices?.[0]?.message?.content ?? "");
        try {
          const parsed = JSON.parse(content) as { q?: string };
          const q = String(parsed.q ?? "").trim().slice(0, 120);
          if (q) return NextResponse.json({ q });
        } catch { /* tenta o próximo modelo */ }
        last = "resposta inválida";
      } else {
        last = `${r.status}`;
      }
    } catch (e) { last = e instanceof Error ? e.name : "erro"; } finally { clearTimeout(t); }
  }
  return NextResponse.json({ error: `Não consegui analisar a foto (${last}). Tenta outra imagem.` }, { status: 502 });
}
