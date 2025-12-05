import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PART_IMAGES = {
  snowball: require('../assets/snowball.png'),
  snowmanhat: require('../assets/snowmanhat.png'),
  scarf: require('../assets/scarf.png'),
  broom: require('../assets/broom.png'),
  coal: require('../assets/coal.png'),
  carrot: require('../assets/carrot.png'),
};

const PART_KEYS = Object.keys(PART_IMAGES);

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Snowman() {
  const [parts, setParts] = useState([]); // {id, key, x, y, rotation, scale}
  const activePartId = useSharedValue(null);
  const idCounter = useRef(1);
  const canvasOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canvasLeft = useSharedValue(0);
  const canvasTop = useSharedValue(0);

  const menuOrder = useMemo(() => shuffle(PART_KEYS), []);

  function onLayoutCanvas(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    canvasOffset.current = { x, y, width, height };
    canvasLeft.value = x;
    canvasTop.value = y;
  }

  function addPart(partKey) {
    const id = idCounter.current++;
    const cw = canvasOffset.current.width || SCREEN_WIDTH;
    const ch = canvasOffset.current.height || SCREEN_HEIGHT;
    const x = Math.round((cw - 80) / 2);
    const y = Math.round((ch - 80) / 2);
    setParts(arr => [...arr, { id, key: partKey, x, y, rotation: 0, scale: 1 }]);
  }

  function updatePart(id, x, y, rotation, scale) {
    setParts(arr => {
      const updated = arr.map(part => (part.id === id ? { ...part, x, y, rotation: rotation ?? part.rotation, scale: scale ?? part.scale } : part));
      const moved = updated.find(part => part.id === id);
      if (!moved) return updated;
      return [...updated.filter(part => part.id !== id), moved];
    });
  }

  function bringPartToFront(id) {
    setParts(arr => {
      const found = arr.find(part => part.id === id);
      if (!found) return arr;
      return [...arr.filter(part => part.id !== id), found];
    });
  }

  function clearSnowman() {
    setParts([]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.canvasWrapper} onLayout={onLayoutCanvas}>
          <View style={styles.canvasBackground} />

          {parts.map(part => (
            <SnowmanPart
              key={`part-${part.id}`}
              id={part.id}
              assetKey={part.key}
              initialX={part.x}
              initialY={part.y}
              initialRotation={part.rotation}
              initialScale={part.scale}
              activeIdSV={activePartId}
              canvasLeft={canvasLeft}
              canvasTop={canvasTop}
              onBringToFront={bringPartToFront}
              onUpdate={updatePart}
            />
          ))}
        </View>

        <View style={styles.menuBar}>
          <View style={styles.menuInner}>
            {menuOrder.map(key => (
              <TouchableOpacity key={key} style={styles.menuItem} onPress={() => addPart(key)}>
                <Image source={PART_IMAGES[key]} style={styles.menuImage} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={clearSnowman}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SnowmanPart({
  id,
  assetKey,
  initialX = 0,
  initialY = 0,
  initialRotation = 0,
  initialScale = 1,
  activeIdSV,
  canvasLeft,
  canvasTop,
  onBringToFront,
  onUpdate,
}) {
  const transX = useSharedValue(initialX);
  const transY = useSharedValue(initialY);
  const rot = useSharedValue(initialRotation || 0);
  const scale = useSharedValue(initialScale ?? 1);
  const startScale = useSharedValue(initialScale ?? 1);
  const startRot = useSharedValue(0);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);

  useEffect(() => {
    transX.value = initialX;
    transY.value = initialY;
    rot.value = initialRotation || 0;
    scale.value = initialScale ?? 1;
    startScale.value = initialScale ?? 1;
  }, [initialX, initialY, initialRotation, initialScale]);

  const pan = Gesture.Pan()
    .onStart(e => {
      activeIdSV.value = id;
      runOnJS(onBringToFront)(id);
      const touchAbsX = e.absoluteX ?? (e.x + canvasLeft.value);
      const touchAbsY = e.absoluteY ?? (e.y + canvasTop.value);
      grabX.value = touchAbsX - (canvasLeft.value + transX.value);
      grabY.value = touchAbsY - (canvasTop.value + transY.value);
    })
    .onUpdate(e => {
      if (activeIdSV.value !== id) return;
      const touchAbsX = e.absoluteX ?? (canvasLeft.value + e.x);
      const touchAbsY = e.absoluteY ?? (canvasTop.value + e.y);
      transX.value = touchAbsX - canvasLeft.value - grabX.value;
      transY.value = touchAbsY - canvasTop.value - grabY.value;
    })
    .onEnd(() => {
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(transX.value), Math.round(transY.value), Math.round(rot.value), Number(scale.value.toFixed(2)));
      if (activeIdSV.value === id) activeIdSV.value = null;
    });

  const rotation = Gesture.Rotation()
    .onStart(() => {
      activeIdSV.value = id;
      runOnJS(onBringToFront)(id);
      startRot.value = rot.value || 0;
    })
    .onUpdate(e => {
      if (activeIdSV.value !== id) return;
      const r = e.rotation ?? 0;
      const deg = r * (180 / Math.PI);
      rot.value = startRot.value + deg;
    })
    .onEnd(() => {
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(transX.value), Math.round(transY.value), Math.round(rot.value), Number(scale.value.toFixed(2)));
      if (activeIdSV.value === id) activeIdSV.value = null;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      activeIdSV.value = id;
      runOnJS(onBringToFront)(id);
      startScale.value = scale.value;
    })
    .onUpdate(e => {
      if (activeIdSV.value !== id) return;
      const s = e.scale ?? 1;
      scale.value = startScale.value * s;
    })
    .onEnd(() => {
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(transX.value), Math.round(transY.value), Math.round(rot.value), Number(scale.value.toFixed(2)));
      if (activeIdSV.value === id) activeIdSV.value = null;
    });

  const gesture = Gesture.Simultaneous(pan, rotation, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.part, animatedStyle]}>
        <Image source={PART_IMAGES[assetKey]} style={styles.partImage} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#153a5a' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 },
  canvasWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#245a85', alignItems: 'center', justifyContent: 'center' },
  canvasBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  menuBar: { marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  menuInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  menuItem: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#2f6ea3', alignItems: 'center', justifyContent: 'center' },
  menuImage: { width: 42, height: 42, resizeMode: 'contain' },
  resetButton: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  resetText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  part: { position: 'absolute', width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  partImage: { width: 90, height: 90, resizeMode: 'contain' },
});
