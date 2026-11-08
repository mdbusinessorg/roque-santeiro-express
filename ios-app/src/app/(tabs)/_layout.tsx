import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../components/ui';

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.ink : 'transparent' }}>
      <Ionicons name={name} size={21} color={focused ? '#fff' : C.ink} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          position: 'absolute', left: 16, right: 16, bottom: 12, height: 64, borderRadius: 28,
          backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
          paddingTop: 8, paddingBottom: 8,
        },
        tabBarItemStyle: { height: 48 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="categories" options={{ title: 'Categorias', tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} /> }} />
      <Tabs.Screen name="stores" options={{ title: 'Lojas', tabBarIcon: ({ focused }) => <TabIcon name="storefront" focused={focused} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Carrinho', tabBarIcon: ({ focused }) => <TabIcon name="cart" focused={focused} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Conta', tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }} />
      <Tabs.Screen name="catalog" options={{ href: null, tabBarIcon: () => null }} />
    </Tabs>
  );
}
