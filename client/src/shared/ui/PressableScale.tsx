import React, { useRef, useCallback } from "react";
import {
  Pressable,
  Animated,
  PressableProps,
  ViewStyle,
  StyleProp,
} from "react-native";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
}

export default function PressableScale({
  children,
  style,
  onPressIn,
  onPressOut,
  disabled,
  scaleValue = 0.96,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      Animated.spring(scale, {
        toValue: scaleValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
      onPressIn?.(e);
    },
    [scale, scaleValue, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
