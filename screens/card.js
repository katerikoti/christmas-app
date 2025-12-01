import React, { useState, useRef } from 'react';
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
  const stickerTouchRef = useRef({});
  const isInteractingStickerRef = useRef(false);

  function onLayoutCanvas(e) {
    const { x, y } = e.nativeEvent.layout;
    canvasOffset.current = { x, y };
  }

  function handleStart(evt) {
    const touch = evt.nativeEvent;
    // if touch is on any sticker, don't start drawing
    if (touch.pageX && touch.pageY) {
      for (const s of stickers) {
        const left = canvasOffset.current.x + s.x;
        const top = canvasOffset.current.y + s.y;
        if (touch.pageX >= left && touch.pageX <= left + 48 && touch.pageY >= top && touch.pageY <= top + 48) {
          isInteractingStickerRef.current = true;
          return;
        }
      }
    }
    if (isInteractingStickerRef.current) return; // don't start drawing when interacting with stickers
    const x = touch.locationX;
    const y = touch.locationY;
    const newStroke = { color, width: strokeWidth, points: [{ x, y }] };
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
    const x = SCREEN_WIDTH / 2 - 24;
    const y = SCREEN_HEIGHT / 2 - 24;
    setStickers(arr => [...arr, { id, emoji, x, y, rotation: 0 }]);
    setShowStickers(false);
  }

  function updateSticker(id, x, y, rotation) {
    setStickers(arr => arr.map(s => (s.id === id ? { ...s, x, y, rotation: rotation ?? s.rotation } : s)));
  }

  function handleStickerGrant(id, e) {
    const { pageX, pageY } = e.nativeEvent;
    // decide whether this gesture is a move or rotate based on touch distance from sticker center
    const s = stickers.find(x => x.id === id);
    let mode = 'move';
    if (s) {
      const centerX = canvasOffset.current.x + s.x + 24;
      const centerY = canvasOffset.current.y + s.y + 24;
      const dx = pageX - centerX;
      const dy = pageY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // if touch is near edge (outside ~18px) treat as rotate gesture
      if (dist > 16) mode = 'rotate';
    }
    stickerTouchRef.current[id] = { startX: pageX, startY: pageY, moved: false, mode };
    isInteractingStickerRef.current = true;
  }

  function handleStickerMove(id, e) {
    const { pageX, pageY } = e.nativeEvent;
    const info = stickerTouchRef.current[id] || {};
    const dx = Math.abs((pageX || 0) - (info.startX || 0));
    const dy = Math.abs((pageY || 0) - (info.startY || 0));
    if (dx > 4 || dy > 4) info.moved = true;
    stickerTouchRef.current[id] = info;
    const s = stickers.find(x => x.id === id);
    if (!s) return;
    if (info.mode === 'rotate') {
      // rotate based on angle from sticker center to touch
      const centerX = canvasOffset.current.x + s.x + 24;
      const centerY = canvasOffset.current.y + s.y + 24;
      const angle = Math.atan2(pageY - centerY, pageX - centerX) * (180 / Math.PI);
      updateSticker(id, s.x, s.y, angle);
    } else {
      const x = pageX - canvasOffset.current.x - 24;
      const y = pageY - canvasOffset.current.y - 24;
      updateSticker(id, x, y);
    }
  }

  function handleStickerRelease(id, e) {
    // release ends interaction; do not treat as tap for rotation anymore
    delete stickerTouchRef.current[id];
    isInteractingStickerRef.current = false;
  }

  /* Rotation handle: start rotating a sticker by tracking angle */
  function handleRotateGrant(id, e) {
    const { pageX, pageY } = e.nativeEvent;
    stickerTouchRef.current[id] = { startX: pageX, startY: pageY, mode: 'rotate' };
  }

  function handleRotateMove(id, e) {
    // keep for backward compatibility (not used if rotate handle removed)
    const { pageX, pageY } = e.nativeEvent;
    const s = stickers.find(x => x.id === id);
    if (!s) return;
    const centerX = canvasOffset.current.x + s.x + 24;
    const centerY = canvasOffset.current.y + s.y + 24;
    const angle = Math.atan2(pageY - centerY, pageX - centerX) * (180 / Math.PI);
    updateSticker(id, s.x, s.y, angle);
  }

  function handleRotateRelease(id, e) {
    delete stickerTouchRef.current[id];
  }

  return (
    <SafeAreaView style={styles.flex}>
      <View style={[styles.container, { backgroundColor: bgColor }]} onLayout={onLayoutCanvas}>
        <View
          style={styles.canvasWrapper}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
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

          {/* render stickers */}
          {stickers.map(st => (
            <View
              key={`sticker-${st.id}`}
              style={[
                styles.sticker,
                { left: st.x, top: st.y, transform: [{ rotate: `${st.rotation}deg` }] },
              ]}
              onStartShouldSetResponder={() => true}
              onResponderGrant={e => handleStickerGrant(st.id, e)}
              onResponderMove={e => handleStickerMove(st.id, e)}
              onResponderRelease={e => handleStickerRelease(st.id, e)}
            >
              <Text style={styles.stickerEmoji}>{st.emoji}</Text>
            </View>
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
