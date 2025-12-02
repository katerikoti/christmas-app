import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
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
  const [showStickers, setShowStickers] = useState(false);
  const [stickers, setStickers] = useState([]); // {id, emoji, x, y, rotation}
  const canvasOffset = useRef({ x: 0, y: 0 });
  const idCounter = useRef(1);
  // sticker gestures are handled by the Sticker component (reanimated + gesture-handler)

  function onLayoutCanvas(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    canvasOffset.current = { x, y, width, height };
  }

  function handleStart(evt) {
    const touch = evt.nativeEvent;
    const x = touch.locationX;
    const y = touch.locationY;
    // If eraser is active, use the current background color for the stroke
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
    // place in center of canvas
    const cw = canvasOffset.current.width || SCREEN_WIDTH;
    const ch = canvasOffset.current.height || SCREEN_HEIGHT;
    const x = cw / 2 - 24;
    const y = ch / 2 - 24;
    setStickers(arr => [...arr, { id, emoji, x, y, rotation: 0 }]);
    setShowStickers(false);
  }

  function updateSticker(id, x, y, rotation) {
    setStickers(arr => arr.map(s => (s.id === id ? { ...s, x, y, rotation: rotation ?? s.rotation } : s)));
  }

  // remember previous tool so we can disable pen/eraser while interacting with a sticker
  const prevToolRef = useRef(null);

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

  // sticker gesture handling has moved into the Sticker component

  // Hit-test helper: returns true if the touch is inside any sticker's bounds
  function isTouchOnSticker(locationX, locationY) {
    // sticker size matches styles.sticker (48 x 48)
    const SIZE = 48;
    for (let i = 0; i < stickers.length; i++) {
      const s = stickers[i];
      const left = s.x;
      const top = s.y;
      if (locationX >= left && locationX <= left + SIZE && locationY >= top && locationY <= top + SIZE) {
        return true;
      }
    }
    return false;
  }

/*
  Sticker component: uses react-native-gesture-handler v2 Gesture API
  and react-native-reanimated v2 shared values. Supports simultaneous
  pan + rotation gestures and reports final state via onUpdate.
*/
function Sticker({ emoji, id, initialX = 0, initialY = 0, initialRotation = 0, onUpdate, onGestureStart, onGestureEnd }) {
  const transX = useSharedValue(initialX);
  const transY = useSharedValue(initialY);
  const rot = useSharedValue(initialRotation || 0);

  // ensure shared values follow prop changes (parent persisted updates)
  useEffect(() => {
    transX.value = initialX;
    transY.value = initialY;
    rot.value = initialRotation || 0;
  }, [initialX, initialY, initialRotation]);

  let panStartX = 0;
  let panStartY = 0;
  let rotStart = 0;

  // track whether we've already signalled gesture start to avoid duplicate calls
  const interacting = useSharedValue(false);

  const pan = Gesture.Pan()
    .onStart(() => {
      panStartX = transX.value;
      panStartY = transY.value;
      if (!interacting.value) {
        interacting.value = true;
        if (onGestureStart) runOnJS(onGestureStart)();
      }
    })
    .onUpdate(e => {
      transX.value = panStartX + (e.changeX ?? 0);
      transY.value = panStartY + (e.changeY ?? 0);
    })
    .onEnd(() => {
      if (onUpdate) runOnJS(onUpdate)(id, transX.value, transY.value, rot.value);
      if (interacting.value) {
        interacting.value = false;
        if (onGestureEnd) runOnJS(onGestureEnd)();
      }
    });

  const rotation = Gesture.Rotation()
    .onStart(() => {
      rotStart = rot.value || 0;
      if (!interacting.value) {
        interacting.value = true;
        if (onGestureStart) runOnJS(onGestureStart)();
      }
    })
    .onUpdate(e => {
      const deg = (e.rotation || 0) * (180 / Math.PI);
      rot.value = rotStart + deg;
    })
    .onEnd(() => {
      if (onUpdate) runOnJS(onUpdate)(id, transX.value, transY.value, rot.value);
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
      <Animated.View style={[styles.sticker, aStyle]}>
        <Text style={styles.stickerEmoji}>{emoji}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

  return (
    <SafeAreaView style={styles.flex}>
      <View style={[styles.container, { backgroundColor: bgColor }]} onLayout={onLayoutCanvas}>
        <View
          style={styles.canvasWrapper}
          onStartShouldSetResponder={(evt) => {
            const isPen = activeTool === 'pen' || activeTool === 'eraser';
            if (!isPen) return false;
            const { locationX, locationY } = evt.nativeEvent;
            // if touching a sticker, don't capture — let the sticker's gesture handler win
            if (isTouchOnSticker(locationX, locationY)) return false;
            return true;
          }}
          onMoveShouldSetResponder={() => activeTool === 'pen' || activeTool === 'eraser'}
          onResponderGrant={handleStart}
          onResponderMove={handleMove}
          onResponderRelease={handleEnd}
        >
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

          {/* render stickers using the reanimated + gesture-handler Sticker component */}
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
        </View>

        {/* Bottom toolbar: left main menu + dynamic panel to the right */}
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
            {/* Pen options (no title so colors align with menu) */}
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

            {/* Bucket options (no title) */}
            {activeTool === 'bucket' && (
              <View style={styles.panelContentTop}>
                <View style={styles.colorGridSmall}>
                  {['#e63946','#2a9d8f','#00a8e8','#000000','#ffffff','#8b5a2b','#ffeb3b','#f72585','#f5f5dc','#d4af37'].map(c => (
                    <TouchableOpacity key={c} style={[styles.colorSwatchSmall, { backgroundColor: c }]} onPress={() => { setBgColor(c); }} />
                  ))}
                </View>
              </View>
            )}

            {/* Eraser options (no title) */}
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

            {/* Sticker options: show 10 stickers in two rows of 5 */}
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

        {/* (Undo/Clear moved into the left menu) */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-start' },
  canvasWrapper: { flex: 1, backgroundColor: 'transparent' },

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

  colorRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
  colorSwatch: { width: 28, height: 28, borderRadius: 6, marginHorizontal: 2, borderWidth: 1, borderColor: '#ccc' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  bucketSwatch: { width: 28, height: 28, borderRadius: 6, margin: 2, borderWidth: 1, borderColor: '#ccc' },
  colorGridSmall: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', maxWidth: 160 },
  colorSwatchSmall: { width: 28, height: 28, borderRadius: 6, margin: 2, borderWidth: 1, borderColor: '#ccc' },

  sizeRow: { flexDirection: 'row' },
  sizeRowSmall: { flexDirection: 'row', marginTop: 4 },
  sizeButton: { backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, marginHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd' },
  sizeButtonSmall: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, backgroundColor: '#fff' },

  /* Sticker */
  sticker: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stickerEmoji: { fontSize: 36 },
  /* small sticker picker grid */
  stickerGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', maxWidth: 160 },
  pickerStickerSmall: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', margin: 2, borderWidth: 0, borderColor: 'transparent', borderRadius: 6, backgroundColor: 'transparent' },

  /* Bottom actions */
  menuAction: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ccc' },
  smallAction: { width: 40, height: 40, paddingVertical: 0, paddingHorizontal: 0 },

  /* leftover modal styles (unused but harmless) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  stickerPickerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  pickerSticker: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', margin: 8 },
  pickerEmoji: { fontSize: 20 },
  closeButton: { marginTop: 12, backgroundColor: '#2a9d8f', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
