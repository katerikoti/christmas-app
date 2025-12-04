import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Snowman() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⛄ Build a Snowman</Text>
      <Text style={styles.subtitle}>Mini-game placeholder — implement your game here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#041021' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#d0d6df' },
});
