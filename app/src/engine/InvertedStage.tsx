import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BOARD, InversionEngine, InversionState } from './inversion';

const native = Platform.OS !== 'web';

/**
 * Draws `children` on a fixed 400x700 board, centred in the window, kept upside
 * down / mirrored per the engine. Use `engine.toBoard(pageX, pageY)` to map touches.
 */
export function InvertedStage({ engine, state, children }: { engine: InversionEngine; state: InversionState; children: ReactNode }) {
  useWindowDimensions(); // re-render on resize
  const rot = useRef(new Animated.Value(state.rotation)).current;
  const mirror = useRef(new Animated.Value(state.mirrored ? -1 : 1)).current;

  useEffect(() => {
    Animated.spring(rot, { toValue: state.rotation, useNativeDriver: native, friction: 6, tension: 60 }).start();
  }, [state.rotation, rot]);
  useEffect(() => {
    Animated.spring(mirror, { toValue: state.mirrored ? -1 : 1, useNativeDriver: native, friction: 7, tension: 60 }).start();
  }, [state.mirrored, mirror]);

  const scale = engine.scale();
  const rotate = rot.interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] });

  return (
    <View style={styles.fill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.board,
          { transform: [{ rotate }, { scale }, { scaleX: mirror }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  board: { width: BOARD.width, height: BOARD.height, overflow: 'hidden', backgroundColor: '#15151d' },
});
