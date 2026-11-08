import AsyncStorage from '@react-native-async-storage/async-storage';
import { interact } from './api';

let anon: string | null = null;
export async function anonId() {
  if (anon) return anon;
  anon = await AsyncStorage.getItem('rse_anon');
  if (!anon) {
    anon = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem('rse_anon', anon);
  }
  return anon;
}
export async function track(events: { kind: string; product_id?: string; query?: string; context?: string }[]) {
  try { await interact(events, await anonId()); } catch {}
}
