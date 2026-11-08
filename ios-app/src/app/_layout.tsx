import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { CartProvider } from '../lib/cart';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[slug]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="loja/[slug]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="orders" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="addresses" />
          <Stack.Screen name="notifications" />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
