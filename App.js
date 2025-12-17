import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Animated, Easing, Image, TurboModuleRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Tree from './screens/tree';
import TreeDecorate from './screens/treeDecorate';
import Snowman from './screens/snowman';
import Snowflake from './screens/snowflake';
import Card from './screens/card';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const { width } = Dimensions.get('window');
  const logoWidth = Math.min(420, width * 0.85);
  const logoHeight = Math.round(logoWidth * 0.36);
  return (
    <View style={styles.sky}>
      <Stars />
      <View style={styles.container}>
        <Image source={require('./assets/logo.png')} style={[styles.logo, { width: logoWidth, height: logoHeight }]} resizeMode="contain" />

        <Pressable style={styles.button} onPress={() => navigation.navigate('Tree')}>
          <Text style={styles.buttonText}>🎄Decorate a Tree</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => navigation.navigate('Snowman')}>
          <Text style={styles.buttonText}>⛄Build a Snowman</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => navigation.navigate('Snowflake')}>
          <Text style={styles.buttonText}>❄️Make a Snowflake</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => navigation.navigate('Card')}>
          <Text style={styles.buttonText}>🖍️Make a Card</Text>
        </Pressable>
        <Text style={{marginTop:40, fontSize:12, color:'#cfcfcf'}}>Created by <Text style={{fontWeight:'bold'}}>katerikoti</Text></Text>
      </View>
      {/* Snow only on Home screen */}
      <Snow />
    </View>
  );
}

function Stars() {
  const { width, height } = Dimensions.get('window');
  const stars = useMemo(() => {
    const out = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      out.push({ id: i, left: Math.random() * width, top: Math.random() * (height - 200), size: Math.random() * 2 + 0.6, opacity: Math.random() * 0.8 + 0.2 });
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(s => (
        <View key={s.id} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}
    </View>
  );
}

function Snow() {
  const { width, height } = Dimensions.get('window');
  const COUNT = 80; // more flakes for denser snowfall
  const flakesRef = useRef(
    Array.from({ length: COUNT }).map(() => ({
      x: Math.random() * (width - 8),
      size: Math.random() * 6 + 2,
      // start at a random vertical offset so flakes appear continuously
      anim: new Animated.Value(Math.random() * (height + 60) - (height + 60)),
      duration: 9000 + Math.random() * 6000, // slow fall
    }))
  ).current;

  useEffect(() => {
    let mounted = true;
    function startFall(f) {
      if (!mounted) return;
      // pick a new random start position above the top so flakes are staggered
      f.anim.setValue(Math.random() * (height + 60) - (height + 60));
      Animated.timing(f.anim, { toValue: height + 60, duration: f.duration, easing: Easing.linear, useNativeDriver: true }).start(() => {
        if (mounted) setTimeout(() => startFall(f), 80 + Math.random() * 400); // tight jitter for continuous flow
      });
    }
    // start all flakes immediately; initial anim values are randomized above
    flakesRef.forEach(f => startFall(f));
    return () => { mounted = false; };
  }, [flakesRef, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakesRef.map((f, i) => (
        <Animated.View
          key={`flake-${i}`}
          style={{
            position: 'absolute',
            left: f.x,
            width: f.size,
            height: f.size,
            borderRadius: f.size / 2,
            backgroundColor: 'rgba(255,255,255,0.7)',
            opacity: 0.8,
            transform: [{ translateY: f.anim }],
            // softer/blurrier appearance
            shadowColor: '#fff',
            shadowRadius: 0.2,
            shadowOpacity: 1,
            elevation: 2,
            borderWidth: 0.3,
            borderColor: 'rgba(255,255,255,0.6)',
          }}
        />
      ))}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#041021' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { color: '#ffffff' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Tree" component={Tree} options={{ title: 'Decorate a Tree' }} />
          <Stack.Screen
            name="TreeDecorate"
            component={TreeDecorate}
            options={{ title: 'Tree Canvas', headerTitleAlign: 'center' }}
          />
          <Stack.Screen name="Snowman" component={Snowman} options={{ title: 'Build a Snowman' }} />
          <Stack.Screen name="Snowflake" component={Snowflake} options={{ title: 'Make a Snowflake' }} />
          <Stack.Screen name="Card" component={Card} options={{ title: 'Make a Card' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  sky: { flex: 1, backgroundColor: '#041021' },
  container: { flex: 1, alignItems:'center', justifyContent:'center', backgroundColor:'transparent', gap:20 },
  title: { fontSize: 25, fontWeight:'bold', marginBottom:20, color:'#ffd9d9' },
  logo: { width: 220, height: 80, marginBottom: 20 },
  button: { backgroundColor:'#e63946', padding:15, borderRadius:10, width:220 },
  buttonText: { color:'white', textAlign:'center', fontSize:18 },
});