import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ROOM_OPTIONS = [
  {
    key: 'livingroom1',
    label: 'Living Room 1',
    source: require('../assets/livingroom1.png'),
  },
  {
    key: 'livingroom2',
    label: 'Living Room 2',
    source: require('../assets/livingroom2.png'),
  },
];

const TREE_OPTIONS = [
  { key: 'tree1', label: 'Tree 1', source: require('../assets/tree1.png') },
  { key: 'tree2', label: 'Tree 2', source: require('../assets/tree2.png') },
  { key: 'tree3', label: 'Tree 3', source: require('../assets/tree3.png') },
];

const SET_OPTIONS = [
  { key: 'set1', label: 'Decor Set 1', source: require('../assets/set1.png') },
  { key: 'set2', label: 'Decor Set 2', source: require('../assets/set2.png') },
  { key: 'set3', label: 'Decor Set 3', source: require('../assets/set3.png') },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SQUARE_SIZE = Math.min(170, SCREEN_WIDTH * 0.58);

function OptionSquare({ title, options, selectedKey, onSelect }) {
  const optionThumbSize = SQUARE_SIZE - 60;

  return (
    <View style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
      <Text style={styles.squareTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionStrip}
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
              index < options.length - 1 && styles.optionThumbSpacing,
            ]}
          >
            <Image source={option.source} style={styles.optionImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function Tree() {
  const [selectedRoom, setSelectedRoom] = useState(ROOM_OPTIONS[0].key);
  const [selectedTree, setSelectedTree] = useState(TREE_OPTIONS[0].key);
  const [selectedSet, setSelectedSet] = useState(SET_OPTIONS[0].key);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>🎄 Tree Decorating Time</Text>
        <Text style={styles.instructions}>
          Scroll each square to pick your favorite setting, tree, and decorations.
        </Text>

        <View style={styles.squareStack}>
          <View style={styles.squareWrapper}>
            <OptionSquare
              title="Room"
              options={ROOM_OPTIONS}
              selectedKey={selectedRoom}
              onSelect={setSelectedRoom}
            />
          </View>
          <View style={styles.squareWrapper}>
            <OptionSquare
              title="Tree"
              options={TREE_OPTIONS}
              selectedKey={selectedTree}
              onSelect={setSelectedTree}
            />
          </View>
          <View style={styles.squareWrapper}>
            <OptionSquare
              title="Decor"
              options={SET_OPTIONS}
              selectedKey={selectedSet}
              onSelect={setSelectedSet}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.decorateButton} activeOpacity={0.85}>
          <Text style={styles.decorateLabel}>Let&apos;s Decorate</Text>
        </TouchableOpacity>

        <View style={styles.selectionSummary}>
          <Text style={styles.summaryLabel}>Current picks</Text>
          <Text style={styles.summaryText}>Room: {selectedRoom}</Text>
          <Text style={styles.summaryText}>Tree: {selectedTree}</Text>
          <Text style={styles.summaryText}>Decor: {selectedSet}</Text>
        </View>
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
  heading: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  instructions: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 22,
  },
  squareStack: {
    width: '100%',
    alignItems: 'center',
  },
  squareWrapper: { marginBottom: 18 },
  square: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  squareTitle: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 15,
  },
  optionStrip: {
    alignItems: 'center',
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
  optionThumbSpacing: { marginRight: 12 },
  optionImage: {
    width: '100%',
    height: '78%',
    borderRadius: 14,
    marginBottom: 6,
  },
  decorateButton: {
    marginTop: 28,
    backgroundColor: '#2d9dff',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  decorateLabel: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  selectionSummary: {
    marginTop: 24,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryText: { color: '#ffffff', fontSize: 14, marginTop: 4 },
});
