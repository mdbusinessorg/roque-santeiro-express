import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Peer = { user_id: string; name: string; verified: boolean; muted: boolean; speaking: boolean; connected: boolean; me: boolean };
type Sig = { from: string; to: string; kind: "offer" | "answer" | "ice"; data: RTCSessionDescriptionInit | RTCIceCandidateInit };
type Meta = { user_id: string; muted: boolean };

const ICE: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, { urls: "stun:stun.cloudflare.com:3478" }] };

/**
 * Sala de voz ao vivo (BISNO TALKS). Áudio ponto-a-ponto por WebRTC entre os participantes; a sinalização e a presença
 * passam pelo Supabase Realtime. Nada é gravado e não existe canal de texto.
 */
export class TalkRoom {
  private sb = supabaseBrowser();
  private ch: RealtimeChannel | null = null;
  private pcs = new Map<string, RTCPeerConnection>();
  private audios = new Map<string, HTMLAudioElement>();
  private meters = new Map<string, AnalyserNode>();
  private pending = new Map<string, RTCIceCandidateInit[]>();
  private roster = new Map<string, { name: string; verified: boolean }>();
  private online = new Map<string, Meta>();
  private stream: MediaStream | null = null;
  private actx: AudioContext | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private closed = false;
  roomId = ""; me = ""; muted = false;

  constructor(private onPeers: (p: Peer[]) => void) {}

  async join(productId: string, topic: string) {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new Error("Este dispositivo não suporta conversas de voz ao vivo.");
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch { throw new Error("Precisamos do microfone para entrar. Autorize o microfone e tente de novo."); }
    const { data, error } = await this.sb.rpc("talk_join", { p_product: productId, p_topic: topic });
    if (error) { this.stopStream(); throw new Error(error.message); }
    this.roomId = data.room_id; this.me = data.user_id;
    this.roster.set(this.me, { name: data.name, verified: false });
    try { this.actx = new AudioContext(); this.meter(this.me, this.stream); } catch {}

    const ch = this.sb.channel(`talk:${this.roomId}`, { config: { broadcast: { self: false }, presence: { key: this.me } } });
    this.ch = ch;
    ch.on("broadcast", { event: "sig" }, ({ payload }) => void this.onSig(payload as Sig));
    ch.on("presence", { event: "sync" }, () => void this.sync());
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("Sem ligação ao servidor ao vivo. Verifique a internet.")), 12_000);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") { clearTimeout(t); void ch.track({ user_id: this.me, muted: this.muted }).then(() => res()); }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(t); rej(new Error("Sem ligação ao servidor ao vivo. Verifique a internet.")); }
      });
    }).catch(async (e) => { await this.leave(); throw e; });

    this.timers.push(setInterval(() => void this.sb.rpc("talk_ping", { p_room: this.roomId }), 25_000));
    this.timers.push(setInterval(() => this.emit(), 220));
    window.addEventListener("pagehide", this.bye);
  }

  private bye = () => { void this.leave(); };

  private async sync() {
    if (!this.ch || this.closed) return;
    const state = this.ch.presenceState<Meta>();
    this.online.clear();
    for (const list of Object.values(state)) for (const m of list) if (m.user_id) this.online.set(m.user_id, { user_id: m.user_id, muted: !!m.muted });
    if ([...this.online.keys()].some((id) => !this.roster.has(id)) || !this.roster.get(this.me)?.verified) {
      const { data } = await this.sb.rpc("talk_roster", { p_room: this.roomId });
      for (const r of (data ?? []) as { user_id: string; name: string; verified: boolean }[]) this.roster.set(r.user_id, { name: r.name, verified: r.verified });
    }
    for (const id of this.online.keys()) if (id !== this.me && !this.pcs.has(id) && this.roster.has(id) && this.me < id) void this.call(id);
    for (const id of [...this.pcs.keys()]) if (!this.online.has(id)) this.drop(id);
    this.emit();
  }

  private pc(id: string) {
    const old = this.pcs.get(id);
    if (old) return old;
    const pc = new RTCPeerConnection(ICE);
    this.pcs.set(id, pc);
    this.stream?.getAudioTracks().forEach((t) => pc.addTrack(t, this.stream!));
    pc.onicecandidate = (e) => { if (e.candidate) this.send({ from: this.me, to: id, kind: "ice", data: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      const s = e.streams[0] ?? new MediaStream([e.track]);
      let a = this.audios.get(id);
      if (!a) { a = new Audio(); a.autoplay = true; this.audios.set(id, a); }
      a.srcObject = s; void a.play().catch(() => {});
      this.meter(id, s);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" && this.me < id && this.online.has(id)) { this.drop(id); void this.call(id); }
      this.emit();
    };
    return pc;
  }

  private send(payload: Sig) { void this.ch?.send({ type: "broadcast", event: "sig", payload }); }

  private async call(id: string) {
    try {
      const pc = this.pc(id);
      await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
      this.send({ from: this.me, to: id, kind: "offer", data: pc.localDescription!.toJSON() });
    } catch { this.drop(id); }
  }

  private async onSig(s: Sig) {
    if (this.closed || s.to !== this.me || !s.from || s.from === this.me) return;
    try {
      if (s.kind === "offer") {
        if (this.pcs.get(s.from)?.signalingState === "stable" && this.pcs.get(s.from)?.remoteDescription) this.drop(s.from);
        const pc = this.pc(s.from);
        await pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
        await this.flush(s.from, pc);
        await pc.setLocalDescription(await pc.createAnswer());
        this.send({ from: this.me, to: s.from, kind: "answer", data: pc.localDescription!.toJSON() });
      } else if (s.kind === "answer") {
        const pc = this.pcs.get(s.from);
        if (pc && pc.signalingState === "have-local-offer") { await pc.setRemoteDescription(s.data as RTCSessionDescriptionInit); await this.flush(s.from, pc); }
      } else {
        const pc = this.pcs.get(s.from);
        if (pc?.remoteDescription) await pc.addIceCandidate(s.data as RTCIceCandidateInit);
        else this.pending.set(s.from, [...(this.pending.get(s.from) ?? []), s.data as RTCIceCandidateInit]);
      }
    } catch { /* um candidato ou oferta inválida não deve derrubar a sala */ }
  }

  private async flush(id: string, pc: RTCPeerConnection) {
    for (const c of this.pending.get(id) ?? []) await pc.addIceCandidate(c).catch(() => {});
    this.pending.delete(id);
  }

  private drop(id: string) {
    this.pcs.get(id)?.close(); this.pcs.delete(id);
    const a = this.audios.get(id); if (a) { a.pause(); a.srcObject = null; this.audios.delete(id); }
    this.meters.delete(id); this.pending.delete(id);
  }

  private meter(id: string, s: MediaStream) {
    if (!this.actx) return;
    try { const an = this.actx.createAnalyser(); an.fftSize = 256; this.actx.createMediaStreamSource(s).connect(an); this.meters.set(id, an); } catch {}
  }

  private level(id: string) {
    const an = this.meters.get(id);
    if (!an) return 0;
    const buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += (v - 128) * (v - 128);
    return Math.sqrt(sum / buf.length);
  }

  private emit() {
    if (this.closed) return;
    const peers: Peer[] = [...this.online.values()].filter((m) => this.roster.has(m.user_id)).map((m) => {
      const me = m.user_id === this.me, r = this.roster.get(m.user_id)!;
      const muted = me ? this.muted : m.muted;
      return { user_id: m.user_id, name: r.name, verified: r.verified, muted, me, speaking: !muted && this.level(m.user_id) > 6, connected: me || this.pcs.get(m.user_id)?.connectionState === "connected" };
    });
    peers.sort((a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name));
    this.onPeers(peers);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.stream?.getAudioTracks().forEach((t) => { t.enabled = !m; });
    void this.ch?.track({ user_id: this.me, muted: m });
    void this.actx?.resume();
    this.emit();
  }

  private stopStream() { this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null; }

  async leave() {
    if (this.closed) return;
    this.closed = true;
    window.removeEventListener("pagehide", this.bye);
    this.timers.forEach(clearInterval);
    for (const id of [...this.pcs.keys()]) this.drop(id);
    this.stopStream();
    void this.actx?.close().catch(() => {});
    const ch = this.ch; this.ch = null;
    if (ch) { await ch.untrack().catch(() => {}); await this.sb.removeChannel(ch).catch(() => {}); }
    if (this.roomId) await this.sb.rpc("talk_leave", { p_room: this.roomId });
  }
}
