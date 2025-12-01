import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Tree from './screens/tree';
import Snowman from './screens/snowman';
import Snowflake from './screens/snowflake';
import Card from './screens/card';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎅The Christmas App🎅</Text>

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
      <Text style={{marginTop:40, fontSize:12, color:'#555'}}>Created by <Text style={{fontWeight:'bold'}}>katerikoti</Text></Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tree" component={Tree} options={{ title: 'Decorate a Tree' }} />
        <Stack.Screen name="Snowman" component={Snowman} options={{ title: 'Build a Snowman' }} />
        <Stack.Screen name="Snowflake" component={Snowflake} options={{ title: 'Make a Snowflake' }} />
        <Stack.Screen name="Card" component={Card} options={{ title: 'Make a Card' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems:'center', justifyContent:'center', backgroundColor:'#fff', gap:20 },
  title: { fontSize: 25, fontWeight:'bold', marginBottom:20, color:'#e63946' },
  button: { backgroundColor:'#e63946', padding:15, borderRadius:10, width:220 },
  buttonText: { color:'white', textAlign:'center', fontSize:18 },
});