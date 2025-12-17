import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROOM_BACKGROUNDS = {
  livingroom1: require('../assets/livingroom1.png'),
  livingroom2: require('../assets/livingroom2.png'),
  livingroom3: require('../assets/livingroom3.png'),
};

const TREE_IMAGES = {
  tree1: require('../assets/tree1.png'),
  tree2: require('../assets/tree2.png'),
  tree3: require('../assets/tree3.png'),
};

const SET_PIECES = {
  set1: [
    { key: 'set1-1', source: require('../assets/set1.1.png') },
    { key: 'set1-2', source: require('../assets/set1.2.png') },
    { key: 'set1-3', source: require('../assets/set1.3.png') },
    { key: 'set1-4', source: require('../assets/set1.4.png') },
    { key: 'set1-5', source: require('../assets/set1.5.png') },
    { key: 'set1-6', source: require('../assets/set1.6.png') },
  ],
  set2: [
    { key: 'set2-1', source: require('../assets/set2.1.png') },
    { key: 'set2-2', source: require('../assets/set2.2.png') },
    { key: 'set2-3', source: require('../assets/set2.3.png') },
    { key: 'set2-4', source: require('../assets/set2.4.png') },
    { key: 'set2-5', source: require('../assets/set2.5.png') },
    { key: 'set2-6', source: require('../assets/set2.6.png') },
  ],
  set3: [
    { key: 'set3-1', source: require('../assets/set3.1.png') },
    { key: 'set3-2', source: require('../assets/set3.2.png') },
    { key: 'set3-3', source: require('../assets/set3.3.png') },
    { key: 'set3-4', source: require('../assets/set3.4.png') },
    { key: 'set3-5', source: require('../assets/set3.5.png') },
    { key: 'set3-6', source: require('../assets/set3.6.png') },
  ],
};

export default function TreeDecorate({ route }) {
  const params = route?.params ?? {};
  const roomKey = params.room ?? 'livingroom1';
  const treeKey = params.tree ?? 'tree1';
  const setKey = params.set ?? 'set1';

  const backgroundImage = ROOM_BACKGROUNDS[roomKey] || ROOM_BACKGROUNDS.livingroom1;
  const treeImage = TREE_IMAGES[treeKey] || TREE_IMAGES.tree1;
  const menuPieces = useMemo(() => SET_PIECES[setKey] || SET_PIECES.set1, [setKey]);

  const [decorations, setDecorations] = useState([]);
  const [isTreeLocked, setIsTreeLocked] = useState(false);
  const treePositionRef = useRef({ x: 0, y: 0 });
  const [treeDimensions, setTreeDimensions] = useState({ width: 0, height: 0 });
  const canvasOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canvasLeft = useSharedValue(0);
  const canvasTop = useSharedValue(0);
  const canvasWidthSV = useSharedValue(0);
  const canvasHeightSV = useSharedValue(0);
  const activeDecorationId = useSharedValue(null);
  const idCounter = useRef(1);
  const initialPlacementDone = useRef(false);

  const treeTransX = useSharedValue(0);
  const treeTransY = useSharedValue(0);
  const treeGrabX = useSharedValue(0);
  const treeGrabY = useSharedValue(0);
  const treeWidthSV = useSharedValue(0);
  const treeHeightSV = useSharedValue(0);
  const treeBoundsRef = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

  useEffect(() => {
    setDecorations([]);
    idCounter.current = 1;
    setIsTreeLocked(false);
  }, [setKey]);

  const updateTreePosition = useCallback((x, y) => {
    treePositionRef.current = { x, y };
  }, []);

  function handleCanvasLayout(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    canvasOffset.current = { x, y, width, height };
    canvasLeft.value = x;
    canvasTop.value = y;
    canvasWidthSV.value = width;
    canvasHeightSV.value = height;

    const computedTreeWidth = width * 0.6;
    const computedTreeHeight = height * 0.82;
    treeWidthSV.value = computedTreeWidth;
    treeHeightSV.value = computedTreeHeight;
    setTreeDimensions({ width: computedTreeWidth, height: computedTreeHeight });

    const horizontalAllowance = computedTreeWidth * 0.22;
    const verticalAllowanceTop = computedTreeHeight * 0.4;
    const verticalAllowanceBottom = Math.max(32, height * 0.14);
    treeBoundsRef.current = {
      minX: -horizontalAllowance,
      maxX: Math.max(0, width - computedTreeWidth) + horizontalAllowance,
      minY: -verticalAllowanceTop,
      maxY: Math.max(0, height - computedTreeHeight) + verticalAllowanceBottom,
    };

    if (!initialPlacementDone.current) {
      const startX = (width - computedTreeWidth) / 2;
      const groundPadding = Math.max(16, height * 0.08);
      const startY = height - computedTreeHeight - groundPadding;
      treeTransX.value = startX;
      treeTransY.value = startY;
      updateTreePosition(Math.round(startX), Math.round(startY));
      initialPlacementDone.current = true;
    } else {
      // keep tree within bounds if layout changes (e.g., rotation)
      const { minX, maxX, minY, maxY } = treeBoundsRef.current;
      const clampedX = Math.min(Math.max(treeTransX.value, minX), maxX);
      const clampedY = Math.min(Math.max(treeTransY.value, minY), maxY);
      treeTransX.value = clampedX;
      treeTransY.value = clampedY;
      updateTreePosition(Math.round(clampedX), Math.round(clampedY));
    }
  }

  function addDecoration(piece) {
    const id = idCounter.current++;
    const cw = canvasOffset.current.width || SCREEN_WIDTH;
    const ch = canvasOffset.current.height || SCREEN_HEIGHT;
    const x = Math.round((cw - 80) / 2);
    const y = Math.round((ch - 100) / 2);
    setDecorations(current => [...current, { id, source: piece.source, x, y, rotation: 0, scale: 1 }]);
  }

  function updateDecoration(id, x, y, rotation, scale) {
    setDecorations(current => {
      const updated = current.map(dec => (dec.id === id ? { ...dec, x, y, rotation: rotation ?? dec.rotation, scale: scale ?? dec.scale } : dec));
      const moved = updated.find(dec => dec.id === id);
      if (!moved) return updated;
      return [...updated.filter(dec => dec.id !== id), moved];
    });
  }

  function bringToFront(id) {
    setDecorations(current => {
      const found = current.find(dec => dec.id === id);
      if (!found) return current;
      return [...current.filter(dec => dec.id !== id), found];
    });
  }

  function resetDecorations() {
    setDecorations([]);
    idCounter.current = 1;
    activeDecorationId.value = null;
  }

  function lockTreePlacement() {
    const { minX, maxX, minY, maxY } = treeBoundsRef.current;
    const clampedX = Math.min(Math.max(treeTransX.value, minX), maxX);
    const clampedY = Math.min(Math.max(treeTransY.value, minY), maxY);
    treeTransX.value = clampedX;
    treeTransY.value = clampedY;
    treePositionRef.current = { x: Math.round(clampedX), y: Math.round(clampedY) };
    setIsTreeLocked(true);
  }

  function unlockTreePlacement() {
    resetDecorations();
    setIsTreeLocked(false);
  }

  const treePan = Gesture.Pan()
    .enabled(!isTreeLocked)
    .onStart(e => {
      const touchAbsX = e.absoluteX ?? (e.x + canvasLeft.value);
      const touchAbsY = e.absoluteY ?? (e.y + canvasTop.value);
      treeGrabX.value = touchAbsX - (canvasLeft.value + treeTransX.value);
      treeGrabY.value = touchAbsY - (canvasTop.value + treeTransY.value);
    })
    .onUpdate(e => {
      if (isTreeLocked) return;
      const touchAbsX = e.absoluteX ?? (canvasLeft.value + e.x);
      const touchAbsY = e.absoluteY ?? (canvasTop.value + e.y);

      const proposedX = touchAbsX - canvasLeft.value - treeGrabX.value;
      const proposedY = touchAbsY - canvasTop.value - treeGrabY.value;

      const { minX, maxX, minY, maxY } = treeBoundsRef.current;

      treeTransX.value = Math.min(Math.max(proposedX, minX), maxX);
      treeTransY.value = Math.min(Math.max(proposedY, minY), maxY);
    })
    .onEnd(() => {
      if (isTreeLocked) return;
      runOnJS(updateTreePosition)(Math.round(treeTransX.value), Math.round(treeTransY.value));
    });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.instructions}>
          {isTreeLocked
            ? 'Drag ornaments from the menu onto your tree. Pinch to resize and twist to rotate.'
            : 'Drag the tree into the perfect spot, then lock it to start decorating.'}
        </Text>

        <View style={styles.canvasWrapper} onLayout={handleCanvasLayout}>
          <Image source={backgroundImage} style={styles.canvasBackground} resizeMode="cover" />
          {treeDimensions.width > 0 && treeDimensions.height > 0 && (
            <TreeSprite
              source={treeImage}
              gesture={treePan}
              width={treeDimensions.width}
              height={treeDimensions.height}
              transX={treeTransX}
              transY={treeTransY}
            />
          )}

          {decorations.map(decoration => (
            <DecorationPiece
              key={`dec-${decoration.id}`}
              id={decoration.id}
              source={decoration.source}
              initialX={decoration.x}
              initialY={decoration.y}
              initialRotation={decoration.rotation}
              initialScale={decoration.scale}
              activeIdSV={activeDecorationId}
              canvasLeft={canvasLeft}
              canvasTop={canvasTop}
              onBringToFront={bringToFront}
              onUpdate={updateDecoration}
            />
          ))}
        </View>

        <View style={styles.menuBar}>
          {isTreeLocked ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.menuInner}
              >
                {menuPieces.map((piece, index) => (
                  <TouchableOpacity
                    key={piece.key}
                    style={[styles.menuItem, index === menuPieces.length - 1 && styles.menuItemLast]}
                    onPress={() => addDecoration(piece)}
                  >
                    <Image source={piece.source} style={styles.menuImage} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.resetButton} onPress={resetDecorations}>
                  <Text style={styles.resetText}>Reset Ornaments</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustButton} onPress={unlockTreePlacement}>
                  <Text style={styles.adjustText}>Adjust Tree Placement</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.lockButton} onPress={lockTreePlacement} activeOpacity={0.85}>
              <Text style={styles.lockText}>Lock tree & start decorating</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TreeSprite({ source, gesture, width, height, transX, transY }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.treeWrapper, { width, height }, animatedStyle]}>
        <Image source={source} style={styles.treeImage} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

function DecorationPiece({
  id,
  source,
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
      <Animated.View style={[styles.decoration, animatedStyle]}>
        <Image source={source} style={styles.decorationImage} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#041021' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#041021' },
  instructions: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  canvasWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#13335d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  treeWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  treeImage: {
    width: '100%',
    height: '100%',
  },
  decoration: {
    position: 'absolute',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  decorationImage: {
    width: '90%',
    height: '90%',
  },
  menuBar: {
    marginTop: 18,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  menuInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  menuItem: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(45,157,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginRight: 12,
  },
  menuItemLast: { marginRight: 0 },
  menuImage: {
    width: 46,
    height: 46,
  },
  menuActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  resetButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  resetText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  adjustButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 8,
  },
  adjustText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    fontSize: 14,
  },
  lockButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(45,157,255,0.35)',
  },
  lockText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
