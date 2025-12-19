import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Image,
  ScrollView,
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

// Fixed menu order
const MENU_ORDER = ['snowball', 'coal', 'carrot', 'snowmanhat', 'scarf', 'broom'];

export default function Snowman() {
  const [parts, setParts] = useState([]); // {id, key, x, y, rotation, scale}
  const activePartId = useSharedValue(null);
  const idCounter = useRef(1);
  const canvasOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canvasLeft = useSharedValue(0);
  const canvasTop = useSharedValue(0);

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
    let initialScale = 1;
    if (partKey === 'snowball') initialScale = 1.2;
    else if (partKey === 'carrot') initialScale = 0.85;
    else if (partKey === 'coal') initialScale = 0.35;
    else if (partKey === 'broom') initialScale = 1.25;
    else if (partKey === 'scarf') initialScale = 1.2;
    setParts(arr => [...arr, { id, key: partKey, x, y, rotation: 0, scale: initialScale }]);
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
          <Image source={require('../assets/snowmanbackground.png')} style={styles.canvasBackground} resizeMode="cover" />

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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.menuInner}
          >
            {MENU_ORDER.map((key, index) => (
              <TouchableOpacity key={key} style={[styles.menuItem, index === MENU_ORDER.length - 1 && styles.menuItemLast]} onPress={() => addPart(key)}>
                <Image source={PART_IMAGES[key]} style={styles.menuImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.resetButton} onPress={clearSnowman}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const PART_SIZE = 100; // matches styles.part width/height
const MIN_TOUCH_SIZE = 80; // minimum touch area for small items

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
  // Store center position for proper transform origin behavior
  const centerX = useSharedValue(initialX + PART_SIZE / 2);
  const centerY = useSharedValue(initialY + PART_SIZE / 2);
  const rot = useSharedValue(initialRotation || 0);
  const scale = useSharedValue(initialScale ?? 1);
  const startScale = useSharedValue(initialScale ?? 1);
  const startRot = useSharedValue(0);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);

  useEffect(() => {
    centerX.value = initialX + PART_SIZE / 2;
    centerY.value = initialY + PART_SIZE / 2;
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
      // Grab offset from center of element
      grabX.value = touchAbsX - (canvasLeft.value + centerX.value);
      grabY.value = touchAbsY - (canvasTop.value + centerY.value);
    })
    .onUpdate(e => {
      if (activeIdSV.value !== id) return;
      const touchAbsX = e.absoluteX ?? (canvasLeft.value + e.x);
      const touchAbsY = e.absoluteY ?? (canvasTop.value + e.y);
      centerX.value = touchAbsX - canvasLeft.value - grabX.value;
      centerY.value = touchAbsY - canvasTop.value - grabY.value;
    })
    .onEnd(() => {
      // Convert center back to top-left for storage
      const topLeftX = centerX.value - PART_SIZE / 2;
      const topLeftY = centerY.value - PART_SIZE / 2;
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(topLeftX), Math.round(topLeftY), Math.round(rot.value), Number(scale.value.toFixed(2)));
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
      const topLeftX = centerX.value - PART_SIZE / 2;
      const topLeftY = centerY.value - PART_SIZE / 2;
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(topLeftX), Math.round(topLeftY), Math.round(rot.value), Number(scale.value.toFixed(2)));
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
      const topLeftX = centerX.value - PART_SIZE / 2;
      const topLeftY = centerY.value - PART_SIZE / 2;
      if (onUpdate) runOnJS(onUpdate)(id, Math.round(topLeftX), Math.round(topLeftY), Math.round(rot.value), Number(scale.value.toFixed(2)));
      if (activeIdSV.value === id) activeIdSV.value = null;
    });

  const gesture = Gesture.Simultaneous(pan, rotation, pinch);

  const animatedStyle = useAnimatedStyle(() => {
    // Use minimum touch size for small items, but scale up for larger ones
    const scaledSize = PART_SIZE * scale.value;
    const touchSize = Math.max(scaledSize, MIN_TOUCH_SIZE);
    return {
      width: touchSize,
      height: touchSize,
      transform: [
        // Position by center, accounting for touch area size
        { translateX: centerX.value - touchSize / 2 },
        { translateY: centerY.value - touchSize / 2 },
        { rotate: `${rot.value}deg` },
      ],
    };
  });

  // Scale the image based on actual scale value (visual size)
  const imageStyle = useAnimatedStyle(() => {
    const scaledImageSize = 90 * scale.value;
    return {
      width: scaledImageSize,
      height: scaledImageSize,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.part, animatedStyle]}>
        <Animated.Image source={PART_IMAGES[assetKey]} style={[styles.partImage, imageStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#041021' },
  container: { flex: 1, backgroundColor: '#041021', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 },
  canvasWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2d74a8', alignItems: 'center', justifyContent: 'center' },
  canvasBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.75 },
  menuBar: { marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  menuInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, marginBottom: 12 },
  menuItem: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(45,157,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  menuItemLast: { marginRight: 0 },
  menuImage: { width: 42, height: 42, resizeMode: 'contain' },
  resetButton: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  resetText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  part: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  partImage: { resizeMode: 'contain' },
});
