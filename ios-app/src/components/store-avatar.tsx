import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';

export function StoreAvatar({ store, size = 56 }: { store: any; size?: number }) {
  const radius = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
      {store?.logo_url ? <Image source={{ uri: store.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <Ionicons name="storefront" size={size * 0.45} color={C.gold} />}
    </View>
  );
}
