import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Svg, { Path, G, Polygon, Defs, ClipPath, Circle, Line } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const SIZE = Math.min(width * 0.85, 350);
const CENTER = SIZE / 2;

// The folded paper is a 60-degree wedge (1/6 of the circle, like a pizza slice)
// This represents paper folded in half 3 times
const WEDGE_ANGLE = 60; // degrees
const WEDGE_RADIUS = SIZE * 0.45;

// Calculate wedge points (cone shape - like a pizza slice pointing up)
const getWedgePoints = () => {
  const startAngle = -90 - WEDGE_ANGLE / 2; // Start from top-left
  const endAngle = -90 + WEDGE_ANGLE / 2;   // End at top-right
  
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  const x1 = CENTER + WEDGE_RADIUS * Math.cos(startRad);
  const y1 = CENTER + WEDGE_RADIUS * Math.sin(startRad);
  const x2 = CENTER + WEDGE_RADIUS * Math.cos(endRad);
  const y2 = CENTER + WEDGE_RADIUS * Math.sin(endRad);
  
  return `${CENTER},${CENTER} ${x1},${y1} ${x2},${y2}`;
};

// Create arc path for the wedge (curved outer edge)
const getWedgePath = () => {
  const startAngle = -90 - WEDGE_ANGLE / 2;
  const endAngle = -90 + WEDGE_ANGLE / 2;
  
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  const x1 = CENTER + WEDGE_RADIUS * Math.cos(startRad);
  const y1 = CENTER + WEDGE_RADIUS * Math.sin(startRad);
  const x2 = CENTER + WEDGE_RADIUS * Math.cos(endRad);
  const y2 = CENTER + WEDGE_RADIUS * Math.sin(endRad);
  
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${WEDGE_RADIUS} ${WEDGE_RADIUS} 0 0 1 ${x2} ${y2} Z`;
};

export default function Snowflake() {
  const [mode, setMode] = useState('folded'); // folded | cutting | unfolding | done
  const [cutShapes, setCutShapes] = useState([]); // Array of closed shapes (cut-out pieces)
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const unfoldAnim = useRef(new Animated.Value(0)).current;

  // Pan gesture for drawing cuts
  const pan = Gesture.Pan()
    .onStart(e => {
      if (mode !== 'cutting') return;
      setIsDrawing(true);
      setCurrentPath([{ x: e.x, y: e.y }]);
    })
    .onUpdate(e => {
      if (mode !== 'cutting' || !isDrawing) return;
      setCurrentPath(prev => [...prev, { x: e.x, y: e.y }]);
    })
    .onEnd(() => {
      if (mode !== 'cutting') return;
      setIsDrawing(false);
      
      // If the path has enough points, create a cut shape
      if (currentPath.length > 3) {
        // Close the shape by connecting back to start
        const closedShape = [...currentPath];
        setCutShapes(prev => [...prev, closedShape]);
      }
      setCurrentPath([]);
    });

  // Convert points array to SVG path string (closed shape)
  const pointsToClosedPath = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ' Z'; // Close the path
    return d;
  };

  // Transform a point for snowflake symmetry
  const transformPoint = (point, angle, mirror = false) => {
    // Translate to origin (center)
    let x = point.x - CENTER;
    let y = point.y - CENTER;
    
    // Mirror if needed (for 12-fold symmetry)
    if (mirror) {
      x = -x;
    }
    
    // Rotate
    const rad = (angle * Math.PI) / 180;
    const newX = x * Math.cos(rad) - y * Math.sin(rad);
    const newY = x * Math.sin(rad) + y * Math.cos(rad);
    
    // Translate back
    return {
      x: newX + CENTER,
      y: newY + CENTER
    };
  };

  // Transform an entire shape
  const transformShape = (shape, angle, mirror = false) => {
    return shape.map(point => transformPoint(point, angle, mirror));
  };

  // Generate all snowflake shapes (6-fold symmetry with mirroring = 12 copies)
  const generateSnowflakeShapes = () => {
    const allShapes = [];
    
    cutShapes.forEach((shape, shapeIndex) => {
      // Create 6-fold rotational symmetry with mirroring
      for (let i = 0; i < 6; i++) {
        const angle = i * 60;
        // Original
        allShapes.push({
          key: `${shapeIndex}-${i}-orig`,
          path: pointsToClosedPath(transformShape(shape, angle, false))
        });
        // Mirrored
        allShapes.push({
          key: `${shapeIndex}-${i}-mirror`,
          path: pointsToClosedPath(transformShape(shape, angle, true))
        });
      }
    });
    
    return allShapes;
  };

  // Handle unfold animation
  const handleUnfold = () => {
    setMode('unfolding');
    Animated.timing(unfoldAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start(() => {
      setMode('done');
    });
  };

  // Reset everything
  const handleReset = () => {
    setCutShapes([]);
    setCurrentPath([]);
    setMode('folded');
    unfoldAnim.setValue(0);
  };

  // Undo last cut
  const handleUndo = () => {
    setCutShapes(prev => prev.slice(0, -1));
  };

  const wedgePath = getWedgePath();
  const snowflakeShapes = generateSnowflakeShapes();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>❄️ Paper Snowflake</Text>
      
      <Text style={styles.instructions}>
        {mode === 'folded' && 'Tap "Start Cutting" to begin!'}
        {mode === 'cutting' && 'Draw shapes to cut out pieces'}
        {mode === 'unfolding' && 'Unfolding...'}
        {mode === 'done' && 'Your snowflake is ready!'}
      </Text>

      <View style={styles.canvas}>
        <GestureDetector gesture={pan}>
          <View style={styles.svgContainer}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Defs>
                {/* Clip path for the wedge shape */}
                <ClipPath id="wedgeClip">
                  <Path d={wedgePath} />
                </ClipPath>
                {/* Clip path for circular snowflake */}
                <ClipPath id="circleClip">
                  <Circle cx={CENTER} cy={CENTER} r={WEDGE_RADIUS} />
                </ClipPath>
              </Defs>

              {/* Background circle hint */}
              {mode !== 'done' && mode !== 'unfolding' && (
                <Circle 
                  cx={CENTER} 
                  cy={CENTER} 
                  r={WEDGE_RADIUS + 2} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.1)" 
                  strokeWidth={1}
                  strokeDasharray="5,5"
                />
              )}

              {/* FOLDED MODE: Show the wedge (folded paper) */}
              {(mode === 'folded' || mode === 'cutting') && (
                <G>
                  {/* Paper wedge */}
                  <Path d={wedgePath} fill="#f5f5f5" />
                  
                  {/* Fold lines (decorative) */}
                  <Line 
                    x1={CENTER} y1={CENTER} 
                    x2={CENTER + WEDGE_RADIUS * Math.cos((-90 - WEDGE_ANGLE/2) * Math.PI / 180)} 
                    y2={CENTER + WEDGE_RADIUS * Math.sin((-90 - WEDGE_ANGLE/2) * Math.PI / 180)}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth={1}
                  />
                  <Line 
                    x1={CENTER} y1={CENTER} 
                    x2={CENTER + WEDGE_RADIUS * Math.cos((-90 + WEDGE_ANGLE/2) * Math.PI / 180)} 
                    y2={CENTER + WEDGE_RADIUS * Math.sin((-90 + WEDGE_ANGLE/2) * Math.PI / 180)}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth={1}
                  />
                  <Line 
                    x1={CENTER} y1={CENTER} 
                    x2={CENTER} 
                    y2={CENTER - WEDGE_RADIUS}
                    stroke="rgba(0,0,0,0.15)"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />

                  {/* Existing cut shapes (shown as holes) */}
                  {cutShapes.map((shape, i) => (
                    <Path
                      key={`cut-${i}`}
                      d={pointsToClosedPath(shape)}
                      fill="#041021"
                      clipPath="url(#wedgeClip)"
                    />
                  ))}

                  {/* Current drawing path */}
                  {currentPath.length > 1 && (
                    <Path
                      d={pointsToClosedPath(currentPath)}
                      fill="rgba(4, 16, 33, 0.5)"
                      stroke="#ff6b6b"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                      clipPath="url(#wedgeClip)"
                    />
                  )}
                </G>
              )}

              {/* DONE MODE: Show the unfolded snowflake */}
              {(mode === 'unfolding' || mode === 'done') && (
                <G clipPath="url(#circleClip)">
                  {/* Base circle (the paper) */}
                  <Circle cx={CENTER} cy={CENTER} r={WEDGE_RADIUS} fill="#f5f5f5" />
                  
                  {/* All the cut-out shapes creating the snowflake pattern */}
                  {snowflakeShapes.map((shape) => (
                    <Path
                      key={shape.key}
                      d={shape.path}
                      fill="#041021"
                    />
                  ))}
                </G>
              )}
            </Svg>
          </View>
        </GestureDetector>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttons}>
        {mode === 'folded' && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('cutting')}>
            <Text style={styles.primaryButtonText}>✂️ Start Cutting</Text>
          </TouchableOpacity>
        )}

        {mode === 'cutting' && (
          <View style={styles.buttonRow}>
            {cutShapes.length > 0 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleUndo}>
                <Text style={styles.secondaryButtonText}>↩️ Undo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={handleUnfold}>
              <Text style={styles.primaryButtonText}>❄️ Unfold</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'done' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
            <Text style={styles.primaryButtonText}>🔄 Try Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cut counter */}
      {mode === 'cutting' && (
        <Text style={styles.counter}>
          {cutShapes.length} cut{cutShapes.length !== 1 ? 's' : ''} made
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041021',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructions: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  canvas: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
  },
  svgContainer: {
    width: SIZE,
    height: SIZE,
  },
  buttons: {
    marginTop: 30,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#4a90d9',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    shadowColor: '#4a90d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  counter: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 15,
  },
});