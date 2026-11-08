import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../components/ui';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.ink,
      tabBarInactiveTintColor: '#8a8f98',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.line, height: 64, paddingBottom: 8, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={(color ?? C.ink) as string} size={size} /> }} />
      <Tabs.Screen name="catalog" options={{ title: 'Explorar', tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={(color ?? C.ink) as string} size={size} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Carrinho', tabBarIcon: ({ color, size }) => <Ionicons name="cart" color={(color ?? C.ink) as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Conta', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={(color ?? C.ink) as string} size={size} /> }} />
    </Tabs>
  );
}
