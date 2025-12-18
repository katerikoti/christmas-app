import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

const ROOM_OPTIONS = [
  { key: 'livingroom1', source: require('../assets/livingroom1.png') },
  { key: 'livingroom2', source: require('../assets/livingroom2.png') },
  { key: 'livingroom3', source: require('../assets/livingroom3.png') },
];

const TREE_OPTIONS = [
  { key: 'tree1', source: require('../assets/tree1.png') },
  { key: 'tree2', source: require('../assets/tree2.png') },
  { key: 'tree3', source: require('../assets/tree3.png') },
];

const SET_OPTIONS = [
  { key: 'set1', source: require('../assets/set1.png') },
  { key: 'set2', source: require('../assets/set2.png') },
  { key: 'set3', source: require('../assets/set3.png') },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(150, SCREEN_WIDTH * 0.28);

function OptionColumn({ options, selectedKey, onSelect }) {
  const optionThumbSize = COLUMN_WIDTH - 26;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.optionStrip}
      style={[styles.optionColumn, { width: COLUMN_WIDTH }]}
    >
      {options.map((option, index) => (
        <TouchableOpacity
          key={option.key}
          activeOpacity={0.85}
          onPress={() => onSelect(option.key)}
          style={[
            styles.optionThumb,
            {
              width: optionThumbSize,
              height: optionThumbSize,
            },
            selectedKey === option.key && styles.optionThumbSelected,
            index < options.length - 1 && styles.optionThumbSpacingVertical,
          ]}
        >
          <Image source={option.source} style={styles.optionImage} resizeMode="cover" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function Tree({ navigation }) {
  const [selectedRoom, setSelectedRoom] = useState(ROOM_OPTIONS[0].key);
  const [selectedTree, setSelectedTree] = useState(TREE_OPTIONS[0].key);
  const [selectedSet, setSelectedSet] = useState(SET_OPTIONS[0].key);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.instructions}>
          Pick a room, the perfect tree, and your favorite decorations.
        </Text>

        <View style={styles.optionRow}>
          <OptionColumn
            options={ROOM_OPTIONS}
            selectedKey={selectedRoom}
            onSelect={setSelectedRoom}
          />
          <View style={styles.separator} />
          <OptionColumn
            options={TREE_OPTIONS}
            selectedKey={selectedTree}
            onSelect={setSelectedTree}
          />
          <View style={styles.separator} />
          <OptionColumn
            options={SET_OPTIONS}
            selectedKey={selectedSet}
            onSelect={setSelectedSet}
          />
        </View>

        <TouchableOpacity
          style={styles.decorateButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation?.navigate('TreeDecorate', {
              room: selectedRoom,
              tree: selectedTree,
              set: selectedSet,
            })
          }
        >
          <Text style={styles.decorateLabel}>Ready</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041021' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  instructions: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 22,
  },
  optionRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 18,
  },
  optionColumn: {
    maxHeight: 360,
    flexGrow: 0,
  },
  separator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 14,
    borderRadius: 1,
  },
  optionStrip: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  optionThumb: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 18,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionThumbSelected: {
    borderColor: '#2d9dff',
    backgroundColor: 'rgba(45,157,255,0.15)',
  },
  optionThumbSpacingVertical: { marginBottom: 14 },
  optionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  decorateButton: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  decorateLabel: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
