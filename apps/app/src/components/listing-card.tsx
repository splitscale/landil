import { Image } from 'expo-image';
import { Link, useTheme } from 'expo-router';
import { LandPlot, MapPin } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconText, Money } from '@/components/icon-text';
import type { ListingCard as Listing } from '@/lib/api';

export function ListingCard({ item }: { item: Listing }) {
  const { colors } = useTheme();
  return (
    <Link href={`/listings/${item.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.card, { backgroundColor: colors.card, borderColor: colors.border }])}>
        <Image
          source={item.cover_url}
          style={styles.cover}
          contentFit="cover"
          transition={150}
          recyclingKey={item.id} // FlashList reuses views: do not show the old photo while the new one loads
        />
        <View style={styles.body}>
          <Money value={item.asking_price} size={18} style={styles.price} />
          <Text style={{ color: colors.text }} numberOfLines={1}>
            {item.title}
          </Text>
          <IconText icon={LandPlot} size={13} color="#888">
            {item.property_type}
          </IconText>
          <IconText icon={MapPin} size={13} color="#888">
            {item.city}, {item.province}
          </IconText>
        </View>
      </Pressable>
    </Link>
  );
}

/** Grey placeholder with the same size as a card, shown while the first page loads. */
export function ListingCardSkeleton() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const bar = (width: `${number}%`, height: number) => (
    <View style={[styles.bar, { width, height, backgroundColor: colors.border }]} />
  );
  return (
    <Animated.View style={[styles.card, { opacity, backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cover, { backgroundColor: colors.border }]} />
      <View style={[styles.body, styles.bars]}>
        {bar('40%', 18)}
        {bar('80%', 14)}
        {bar('50%', 12)}
        {bar('60%', 12)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cover: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#ddd' },
  body: { padding: 12, gap: 2 },
  bars: { gap: 6 },
  bar: { borderRadius: 4 },
  price: { fontWeight: '700' },
});
