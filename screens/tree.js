import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Tree() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎄 Decorate a Tree</Text>
      <Text style={styles.subtitle}>Mini-game placeholder — implement your game here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#2a9d8f', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#264653' },
});
