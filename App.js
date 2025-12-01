import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎄 Christmas Mini Games</Text>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>🎄 Build a Christmas Tree</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>⛄ Build a Snowman</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>❄️ Cut a Paper Snowflake</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>🖍️ Draw a Holiday Card</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems:'center', justifyContent:'center', backgroundColor:'#fff', gap:20 },
  title: { fontSize: 30, marginBottom:40 },
  button: { backgroundColor:'#e63946', padding:15, borderRadius:10, width:260 },
  buttonText: { color:'white', textAlign:'center', fontSize:18 },
});