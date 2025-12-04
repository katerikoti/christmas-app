import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

export default function Icon({ name, size = 20, color = '#333' }) {
  const strokeW = Math.max(1, Math.round(size * 0.09));
  switch (name) {
    case 'bucket':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8h16" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 8l1.6 10h8.8L18 8" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 5c2-1 8-1 10 0" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'pen':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 21l3-1 11-11-2-2L5 18l-2 3z" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M14 6l3 3" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'sticker':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2l2.6 5.3L20 8l-4 3.6L17 18l-5-3-5 3 1-6.4L4 8l5.4-.7L12 2z" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'eraser':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 17l6-6 8 8-6 6H3v-8z" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 11l6 6" stroke={color} strokeWidth={Math.max(1, strokeW - 0)} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'undo':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 14L4 9l5-5" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M20 20a8 8 0 0 0-11.3-11.3" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'clear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeW} />
          <Path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" fill={color} />
        </Svg>
      );
  }
}
