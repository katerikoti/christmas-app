/* Card.js — fixed: stickers above SVG, correct gestures, no jumping, toolbar clickable */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import Icon from '../components/Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Sticker assets mapping (use keys as the "emoji" identifier for minimal change)
const STICKER_IMAGES = {
  ball: require('../assets/ball.png'),
  bell: require('../assets/bell.png'),
  chtree: require('../assets/chtree.png'),
  flake: require('../assets/flake.png'),
  gingerman: require('../assets/gingerman.png'),
  mistletoe: require('../assets/mistletoe.png'),
  present: require('../assets/present.png'),
};

function pointsToSvgPath(points = []) {
  if (points.length === 0) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return d;
}

export default function Card() {
  const [strokes, setStrokes] = useState([]); // {color, width, points}
  const [current, setCurrent] = useState(null);
  const [actions, setActions] = useState([]); // stack of actions: {type: 'stroke' } or {type: 'sticker', id}
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [activeTool, setActiveTool] = useState(null);
  const [stickers, setStickers] = useState([]); // {id, emoji, x, y, rotation}
  const canvasOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const canvasLeft = useSharedValue(0);
  const canvasTop = useSharedValue(0);
  const idCounter = useRef(1);
  const prevToolRef = useRef(null);

  function onLayoutCanvas(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    canvasOffset.current = { x, y, width, height };
    // keep shared values in sync so worklets can read canvas position
    canvasLeft.value = x;
    canvasTop.value = y;
  }

  function handleStart(evt) {
    const touch = evt.nativeEvent;
    const x = touch.locationX;
    const y = touch.locationY;
    const strokeColor = activeTool === 'eraser' ? bgColor : color;
    const newStroke = { color: strokeColor, width: strokeWidth, points: [{ x, y }] };
    setCurrent(newStroke);
  }

  function handleMove(evt) {
    if (!current) return;
    const touch = evt.nativeEvent;
    const x = touch.locationX;
    const y = touch.locationY;
    setCurrent(s => ({ ...s, points: [...s.points, { x, y }] }));
  }

  function handleEnd() {
    if (!current) return;
    setStrokes(s => [...s, current]);
    setActions(a => [...a, { type: 'stroke' }]);
    setCurrent(null);
  }

  function undo() {
    setActions(prev => {
      if (!prev || prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.type === 'stroke') {
        setStrokes(s => s.slice(0, -1));
      } else if (last.type === 'sticker') {
        setStickers(s => s.filter(st => st.id !== last.id));
      }
      return prev.slice(0, -1);
    });
  }

  function clearAll() {
    setStrokes([]);
    setStickers([]);
    setBgColor('#ffffff');
    setActions([]);
  }

  function addSticker(emoji) {
    const id = idCounter.current++;
    const cw = canvasOffset.current.width || SCREEN_WIDTH;
    const ch = canvasOffset.current.height || SCREEN_HEIGHT;
    // center inside canvas
    const x = Math.round((cw - 48) / 2);
    const y = Math.round((ch - 48) / 2);
    setStickers(arr => [...arr, { id, emoji, x, y, rotation: 0 }]);
    setActions(a => [...a, { type: 'sticker', id }]);
  }

  function updateSticker(id, x, y, rotation) {
    // persist final transform and bring to top (render last)
    setStickers(arr => {
      const updated = arr.map(s => (s.id === id ? { ...s, x, y, rotation: rotation ?? s.rotation } : s));
      const moved = updated.find(s => s.id === id);
      if (!moved) return updated;
      // bring moved sticker to end
      return [...updated.filter(s => s.id !== id), moved];
    });
  }

  function handleStickerGestureStart() {
    if (activeTool === 'pen' || activeTool === 'eraser') {
      prevToolRef.current = activeTool;
      setActiveTool(null);
    } else {
      prevToolRef.current = null;
    }
  }

  function handleStickerGestureEnd() {
    if (prevToolRef.current === 'pen' || prevToolRef.current === 'eraser') {
      setActiveTool(prevToolRef.current);
    }
    prevToolRef.current = null;
  }

  // Hit-test helper: returns true if the touch is inside any sticker's bounds
  function isTouchOnSticker(locationX, locationY) {
    const SIZE = 48;
    const PADDING = 8;
    for (let i = 0; i < stickers.length; i++) {
      const s = stickers[i];
      const left = s.x;
      const top = s.y;
      if (locationX >= left - PADDING && locationX <= left + SIZE + PADDING && locationY >= top - PADDING && locationY <= top + SIZE + PADDING) {
        return true;
      }
    }
    return false;
  }

  /* Sticker component: separate, uses transforms only (no left/top from parent).
     Returns final coordinates through onUpdate(id,x,y,rotation). */
  function Sticker({ emoji, id, initialX = 0, initialY = 0, initialRotation = 0, onUpdate, onGestureStart, onGestureEnd }) {
    const transX = useSharedValue(initialX);
    const transY = useSharedValue(initialY);
    const rot = useSharedValue(initialRotation || 0);

    useEffect(() => {
      transX.value = initialX;
      transY.value = initialY;
      rot.value = initialRotation || 0;
    }, [initialX, initialY, initialRotation]);

    let startX = 0;
    let startY = 0;
    let startRot = 0;
    const interacting = useSharedValue(false);
    const grabX = useSharedValue(0);
    const grabY = useSharedValue(0);

    const pan = Gesture.Pan()
      .onStart(e => {
        // record starting transform
        startX = transX.value;
        startY = transY.value;
        // compute touch point in screen coordinates (absoluteX preferred)
        const touchAbsX = (e.absoluteX ?? (e.x + canvasLeft.value));
        const touchAbsY = (e.absoluteY ?? (e.y + canvasTop.value));
        // grab offset = touch point - sticker's top-left (in screen coords)
        grabX.value = touchAbsX - (canvasLeft.value + transX.value);
        grabY.value = touchAbsY - (canvasTop.value + transY.value);
        if (!interacting.value) {
          interacting.value = true;
          if (onGestureStart) runOnJS(onGestureStart)();
        }
      })
      .onUpdate(e => {
        // Prefer absolute coordinates when available so the finger stays anchored
        const touchAbsX = (e.absoluteX ?? (canvasLeft.value + e.x));
        const touchAbsY = (e.absoluteY ?? (canvasTop.value + e.y));
        // New top-left = finger position (relative to canvas) minus grab offset
        transX.value = touchAbsX - canvasLeft.value - grabX.value;
        transY.value = touchAbsY - canvasTop.value - grabY.value;
      })
      .onEnd(() => {
        if (onUpdate) runOnJS(onUpdate)(id, Math.round(transX.value), Math.round(transY.value), Math.round(rot.value));
        if (interacting.value) {
          interacting.value = false;
          if (onGestureEnd) runOnJS(onGestureEnd)();
        }
      });

    const rotation = Gesture.Rotation()
      .onStart(() => {
        startRot = rot.value || 0;
        if (!interacting.value) {
          interacting.value = true;
          if (onGestureStart) runOnJS(onGestureStart)();
        }
      })
      .onUpdate(e => {
        const r = e.rotation ?? 0;
        const deg = r * (180 / Math.PI);
        rot.value = startRot + deg;
      })
      .onEnd(() => {
        if (onUpdate) runOnJS(onUpdate)(id, Math.round(transX.value), Math.round(transY.value), Math.round(rot.value));
        if (interacting.value) {
          interacting.value = false;
          if (onGestureEnd) runOnJS(onGestureEnd)();
        }
      });

    const gesture = Gesture.Simultaneous(pan, rotation);

    const aStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: transX.value },
        { translateY: transY.value },
        { rotate: `${rot.value}deg` },
      ],
    }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          // absolutely positioned inside canvasWrapper (0,0) and moved by transform
          style={[
            styles.sticker,
            aStyle,
            { position: 'absolute' }, // ensure absolute for z-order
          ]}
        >
          {/* Render sticker image from assets mapping. Keep prop name `emoji` for compatibility. */}
          <Image source={STICKER_IMAGES[emoji]} style={styles.stickerImage} />
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <View style={[styles.container]}>
        {/* Canvas region: relative positioning so absolute children use this as origin */}
        <View
          style={[styles.canvasWrapper, { backgroundColor: bgColor }]}
          onLayout={onLayoutCanvas}
          // only capture touches when drawing tools are active
          pointerEvents={activeTool === 'pen' || activeTool === 'eraser' ? 'auto' : 'box-none'}
        >
          {/* SVG drawing layer (bottom) */}
          <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
              <Rect x="0" y="0" width="100%" height="100%" fill={bgColor} />
              {strokes.map((s, i) => (
                <Path
                  key={`stroke-${i}`}
                  d={pointsToSvgPath(s.points)}
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {current && (
                <Path
                  d={pointsToSvgPath(current.points)}
                  stroke={current.color}
                  strokeWidth={current.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>
          </View>

          {/* Stickers and gesture area (top) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Render stickers — positioned relative to canvasWrapper origin */}
            {stickers.map(st => (
              <Sticker
                key={`sticker-${st.id}`}
                id={st.id}
                emoji={st.emoji}
                initialX={st.x}
                initialY={st.y}
                initialRotation={st.rotation}
                onGestureStart={handleStickerGestureStart}
                onGestureEnd={handleStickerGestureEnd}
                onUpdate={updateSticker}
              />
            ))}

            {/* Transparent responder area used only when pen/eraser active.
                It enables drawing by using RN responder handlers. */}
            {(activeTool === 'pen' || activeTool === 'eraser') && (
              <View
                style={StyleSheet.absoluteFill}
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleStart}
                onResponderMove={handleMove}
                onResponderRelease={handleEnd}
                pointerEvents={activeTool === 'pen' || activeTool === 'eraser' ? 'auto' : 'box-none'}
              />
            )}
          </View>
        </View>

        {/* Bottom toolbar */}
        <View style={styles.menuBar}>
          <View style={styles.mainMenu}>
            <View style={styles.menuColumn}>
              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'bucket' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'bucket' ? null : 'bucket')}
              >
                <Icon name="bucket" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'pen' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'pen' ? null : 'pen')}
              >
                <Icon name="pen" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} style={[styles.menuButton, styles.menuAction]} onPress={undo}>
                <Icon name="undo" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.menuColumn}>
              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'sticker' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'sticker' ? null : 'sticker')}
              >
                <Icon name="sticker" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'eraser' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'eraser' ? null : 'eraser')}
              >
                <Icon name="eraser" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} style={[styles.menuButton, styles.menuAction]} onPress={clearAll}>
                <Icon name="clear" size={18} color="#ff9aa2" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.toolPanel}>
            {activeTool === 'pen' && (
              <View style={styles.panelContentTop}>
                <View style={styles.colorGridSmall}>
                  {['#e63946','#2a9d8f','#00a8e8','#000000','#ffffff','#8b5a2b','#ffeb3b','#f72585','#f5f5dc','#d4af37'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorSwatchSmall, { backgroundColor: c, borderWidth: color === c ? 2 : 1 }]}
                      onPress={() => { setColor(c); }}
                    />
                  ))}
                </View>
                <View style={styles.sizeRowSmall}>
                  {[6,10,16].map(s => (
                    <TouchableOpacity key={s} style={styles.sizeButtonSmall} onPress={() => { setStrokeWidth(s); }}>
                      <View style={{ width: s, height: s, borderRadius: s/2, backgroundColor: color }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTool === 'bucket' && (
              <View style={styles.panelContentTop}>
                <View style={styles.colorGridSmall}>
                  {['#e63946','#2a9d8f','#00a8e8','#000000','#ffffff','#8b5a2b','#ffeb3b','#f72585','#f5f5dc','#d4af37'].map(c => (
                    <TouchableOpacity key={c} style={[styles.colorSwatchSmall, { backgroundColor: c }]} onPress={() => { setBgColor(c); }} />
                  ))}
                </View>
              </View>
            )}

            {activeTool === 'eraser' && (
              <View style={styles.panelContentTop}>
                <View style={styles.sizeRowSmall}>
                  {[6,10,16].map(s => (
                    <TouchableOpacity key={s} style={styles.sizeButtonSmall} onPress={() => { setStrokeWidth(s); setColor(bgColor); }}>
                      <View style={{ width: s, height: s, borderRadius: s/2, backgroundColor: '#ccc' }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTool === 'sticker' && (
              <View style={styles.panelContentTop}>
                <View style={styles.stickerGrid}>
                  {['ball','bell','chtree','flake','gingerman','mistletoe','present'].map(key => (
                    <TouchableOpacity key={key} style={styles.pickerStickerSmall} onPress={() => { addSticker(key); }}>
                      <Image source={STICKER_IMAGES[key]} style={styles.pickerImageSmall} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start', backgroundColor: '#041021' },
  canvasWrapper: { flex: 1, backgroundColor: 'transparent', position: 'relative' },

  /* Menu layout */
  menuBar: { height: 140, backgroundColor: '#041021', borderTopWidth: 1, borderColor: '#041021', padding: 8, flexDirection: 'row', alignItems: 'center' },
  mainMenu: { width: 80, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingVertical: 0, zIndex: 2 },
  menuColumn: { width: 31, alignItems: 'center', justifyContent: 'center', marginRight: 6, height: '100%' },
  menuButton: { width: 36, height: 36, borderRadius: 6, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'hsla(0, 0%, 100%, 1.00)', marginVertical: 0.5 },
  menuButtonActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  menuText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  toolPanel: { flex: 1, paddingLeft: 12, paddingRight: 8, zIndex: 1, alignItems: 'flex-start' },
  panelContent: { flex: 1 },
  panelContentTop: { flex: 1, justifyContent: 'flex-start', paddingTop: 12 },
  panelTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  panelNote: { fontSize: 12, color: '#666', marginTop: 8 },

  colorGridSmall: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', maxWidth: 160 },
  colorSwatchSmall: { width: 28, height: 28, borderRadius: 6, margin: 2, borderWidth: 1, borderColor: '#ccc' },

  sizeRowSmall: { flexDirection: 'row', marginTop: 4 },
  sizeButtonSmall: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, backgroundColor: '#fff' },

  /* Sticker */
  sticker: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stickerEmoji: { fontSize: 36 },
  stickerGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', maxWidth: 160 },
  pickerStickerSmall: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', margin: 2, borderWidth: 0, borderColor: 'transparent', borderRadius: 6, backgroundColor: 'transparent' },
  pickerImageSmall: { width: 22, height: 22, resizeMode: 'contain' },
  stickerImage: { width: 40, height: 40, resizeMode: 'contain' },

  /* Bottom actions */
  menuAction: { width: 36, height: 36, borderRadius: 6, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff' },

  /* leftover modal styles (unused but harmless) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  stickerPickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  pickerSticker: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', margin: 8 },
  pickerEmoji: { fontSize: 20 },
  closeButton: { marginTop: 12, backgroundColor: '#2a9d8f', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});