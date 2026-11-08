import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { sb } from './supabase';
import { useAuth } from './auth';

export const isStaff = (role?: string | null) => role === 'admin' || role === 'super_admin' || role === 'ops';

export function useMyStore(next = '/seller') {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<any>(undefined);
  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await sb.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
    setStore(data);
  }, [user]);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(`/auth?next=${encodeURIComponent(next)}`); return; }
    reload();
  }, [loading, user, router, next, reload]);
  return { store, reload, user };
}

function b64ToBytes(b64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]), b = chars.indexOf(clean[i + 1]), c = clean[i + 2] ? chars.indexOf(clean[i + 2]) : -1, d = clean[i + 3] ? chars.indexOf(clean[i + 3]) : -1;
    out.push((a << 2) | (b >> 4));
    if (c >= 0) out.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) out.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(out);
}

async function pickImage(source: 'library' | 'camera', userId: string, folder: string) {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permissão de fotos negada.');
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.82, allowsEditing: false })
    : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.82, allowsMultipleSelection: false });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (!asset.base64) throw new Error('Não foi possível ler a imagem.');
  const ext = (asset.fileName?.split('.').pop() || (asset.mimeType?.includes('png') ? 'png' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const bytes = b64ToBytes(asset.base64);
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, bytes.buffer as ArrayBuffer, { contentType: asset.mimeType || 'image/jpeg', upsert: false });
  if (error) throw error;
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl as string;
}

export async function pickAndUploadImage(source: 'library' | 'camera', folder: string, userId: string) {
  return pickImage(source, userId, folder);
}

export function slugify(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'produto';
}
