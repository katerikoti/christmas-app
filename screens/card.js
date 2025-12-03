/* Card.js — fixed: stickers above SVG, correct gestures, no jumping, toolbar clickable */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function pointsToSvgPath(points = []) {
  if (points.length === 0) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return d;
}

export default function Card() {
  const [strokes, setStrokes] = useState([]); // {color, width, points}
  const [current, setCurrent] = useState(null);
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
    setCurrent(null);
  }

  function undo() {
    setStrokes(s => s.slice(0, -1));
  }

  function clearAll() {
    setStrokes([]);
    setStickers([]);
    setBgColor('#ffffff');
  }

  function addSticker(emoji) {
    const id = idCounter.current++;
    const cw = canvasOffset.current.width || SCREEN_WIDTH;
    const ch = canvasOffset.current.height || SCREEN_HEIGHT;
    // center inside canvas
    const x = Math.round((cw - 48) / 2);
    const y = Math.round((ch - 48) / 2);
    setStickers(arr => [...arr, { id, emoji, x, y, rotation: 0 }]);
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
          <Text style={styles.stickerEmoji}>{emoji}</Text>
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
                pointerEvents="box-none" // gestures still pass to sticker detector first
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
                <Text style={styles.menuText}>🪣</Text>
              </TouchableOpacity>

              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'pen' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'pen' ? null : 'pen')}
              >
                <Text style={styles.menuText}>🖊️</Text>
              </TouchableOpacity>

              <TouchableOpacity hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} style={[styles.menuButton, styles.menuAction]} onPress={undo}>
                <Text style={styles.menuText}>↶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuColumn}>
              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'sticker' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'sticker' ? null : 'sticker')}
              >
                <Text style={styles.menuText}>⭐</Text>
              </TouchableOpacity>

              <TouchableOpacity
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                style={[styles.menuButton, activeTool === 'eraser' && styles.menuButtonActive]}
                onPress={() => setActiveTool(activeTool === 'eraser' ? null : 'eraser')}
              >
                <Text style={styles.menuText}>🧽</Text>
              </TouchableOpacity>

              <TouchableOpacity hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} style={[styles.menuButton, styles.menuAction, { backgroundColor: '#fff' }]} onPress={clearAll}>
                <Text style={[styles.menuText, { color: '#b00020' }]}>✖</Text>
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
                  {['🎁','🎄','⭐','❄️','⛄','🦌','🍪','🎀','🕯️','🧦'].map(emoji => (
                    <TouchableOpacity key={emoji} style={styles.pickerStickerSmall} onPress={() => { addSticker(emoji); }}>
                      <Text style={styles.pickerEmoji}>{emoji}</Text>
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
  container: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start' },
  canvasWrapper: { flex: 1, backgroundColor: 'transparent', position: 'relative' },

  /* Menu layout */
  menuBar: { height: 140, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', padding: 8, flexDirection: 'row', alignItems: 'flex-start' },
  mainMenu: { width: 80, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', paddingVertical: 12, zIndex: 2 },
  menuColumn: { width: 31, alignItems: 'center', justifyContent: 'flex-start', marginRight: 6 },
  menuButton: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ccc', marginVertical: 0.5 },
  menuButtonActive: { backgroundColor: '#f3f3f3', borderColor: '#999' },
  menuText: { color: '#333', fontWeight: '700', fontSize: 16 },

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

  /* Bottom actions */
  menuAction: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ccc' },

  /* leftover modal styles (unused but harmless) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  stickerPickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  pickerSticker: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', margin: 8 },
  pickerEmoji: { fontSize: 20 },
  closeButton: { marginTop: 12, backgroundColor: '#2a9d8f', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});