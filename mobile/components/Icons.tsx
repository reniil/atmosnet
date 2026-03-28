import React from 'react';
import { Text } from 'react-native';

// Placeholder icon component (install @expo/vector-icons for real icons)
export const Ionicons = ({ name, size, color, style }: { 
  name: string; 
  size: number; 
  color: string;
  style?: any;
}) => (
  <Text style={[{ fontSize: size, color: color }, style]}>📍</Text>
);

export default Ionicons;
