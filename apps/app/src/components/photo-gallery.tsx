import { Image } from 'expo-image';
import { useTheme } from 'expo-router';
import { ImageOff, X } from 'lucide-react-native';
import { memo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
  useExclusiveGestures,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

type Props = { photos: string[]; width: number };

/** Swipeable photos with a "2 / 12" counter. A tap opens the full-screen viewer. */
export function PhotoGallery({ photos, width }: Props) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const height = (width * 3) / 4;

  if (photos.length === 0) {
    return (
      <View style={[styles.empty, { width, height, backgroundColor: colors.card, borderColor: colors.border }]}>
        <ImageOff size={32} color="#888" />
        <Text style={styles.muted}>No photos yet</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(url) => url}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable onPress={() => setViewer(true)} accessibilityLabel="Open photo full screen">
            <Image source={item} style={{ width, height }} contentFit="cover" transition={150} />
          </Pressable>
        )}
      />
      <Counter index={index} total={photos.length} />
      {viewer && (
        <PhotoViewer
          photos={photos}
          start={index}
          onClose={(i) => {
            setViewer(false);
            setIndex(i);
          }}
        />
      )}
    </View>
  );
}

function Counter({ index, total }: { index: number; total: number }) {
  return total > 1 ? (
    <View style={styles.counter} pointerEvents="none">
      <Text style={styles.counterText}>
        {index + 1} / {total}
      </Text>
    </View>
  ) : null;
}

/** Full-screen photos on black: swipe between them, pinch or double-tap to zoom. */
function PhotoViewer({ photos, start, onClose }: { photos: string[]; start: number; onClose: (index: number) => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal visible animationType="fade" onRequestClose={() => onClose(index)} statusBarTranslucent>
      {/* A Modal is a separate native root, so gestures need their own root view. */}
      <GestureHandlerRootView style={styles.viewer}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={start}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url) => url}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <ZoomableImage url={item} width={width} height={height} onZoom={setZoomed} />}
        />
        <Counter index={index} total={photos.length} />
        <Pressable onPress={() => onClose(index)} style={styles.close} hitSlop={12} accessibilityLabel="Close">
          <X size={24} color="#fff" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const MAX_SCALE = 4;

// memo: the viewer re-renders when zoom turns its paging off, and this must not re-render then.
const ZoomableImage = memo(function ZoomableImage({
  url,
  width,
  height,
  onZoom,
}: {
  url: string;
  width: number;
  height: number;
  onZoom: (zoomed: boolean) => void;
}) {
  const zoomed = useSharedValue(false); // a shared value, not state: a zoom change needs no re-render
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Keep the photo inside the screen: it can move at most the part that sticks out.
  const clamp = (v: number, size: number, s: number) => {
    'worklet';
    const max = (size * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, v));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    zoomed.value = false;
    scheduleOnRN(onZoom, false);
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.value <= 1.05) return reset();
      savedScale.value = scale.value;
      x.value = withTiming(clamp(x.value, width, scale.value));
      y.value = withTiming(clamp(y.value, height, scale.value));
      savedX.value = clamp(x.value, width, scale.value);
      savedY.value = clamp(y.value, height, scale.value);
      zoomed.value = true;
      scheduleOnRN(onZoom, true);
    },
  });

  // Only while zoomed: otherwise a horizontal drag must swipe to the next photo.
  const pan = usePanGesture({
    enabled: zoomed,
    onUpdate: (e) => {
      'worklet';
      x.value = clamp(savedX.value + e.translationX, width, scale.value);
      y.value = clamp(savedY.value + e.translationY, height, scale.value);
    },
    onDeactivate: () => {
      'worklet';
      savedX.value = x.value;
      savedY.value = y.value;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: () => {
      'worklet';
      if (savedScale.value > 1) return reset();
      scale.value = withTiming(2.5);
      savedScale.value = 2.5;
      zoomed.value = true;
      scheduleOnRN(onZoom, true);
    },
  });

  const gesture = useExclusiveGestures(doubleTap, useSimultaneousGestures(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>
        <Image source={url} style={{ width, height }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12 },
  muted: { color: '#888' },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    padding: 8,
  },
});
