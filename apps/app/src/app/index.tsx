import { FlashList } from '@shopify/flash-list';
import { useTheme } from 'expo-router';
import { PhilippinePeso, RotateCw, Search, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { IconText } from '@/components/icon-text';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import { api, type ListingCard as Listing, type Page } from '@/lib/api';

// Same values as v1 (src/lib/listings-browse.ts, listings/new/validate.ts).
const TYPES = ['Lot / Land', 'House & Lot', 'Condo unit', 'Commercial', 'Farm lot'];
const SKELETONS = Array.from({ length: 6 }, (_, i) => ({ skeleton: i }));
const PRICES = [
  ['under-1m', 'Under 1M'],
  ['1m-3m', '1M – 3M'],
  ['3m-5m', '3M – 5M'],
  ['5m-10m', '5M – 10M'],
  ['over-10m', 'Over 10M'],
] as const;

export default function Home() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const columns = width >= 1024 ? 3 : width >= 640 ? 2 : 1; // LND-MOB-11: same card, more columns

  const [q, setQ] = useState('');
  const [type, setType] = useState<string>();
  const [price, setPrice] = useState<string>();
  const [items, setItems] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; reset: boolean }>();
  const request = useRef(0);

  async function load(reset: boolean, pulled = false) {
    if (!reset && (loading || !cursor || error)) return; // after an error, wait for Retry
    const id = ++request.current;
    setLoading(true);
    setRefreshing(pulled);
    setError(undefined);
    try {
      const page = await api<Page<Listing>>('/v1/listings', {
        q: q.trim() || undefined,
        type,
        price,
        cursor: reset ? undefined : cursor!,
      });
      if (id !== request.current) return; // a newer search started
      setItems((old) => (reset ? page.items : [...old, ...page.items]));
      setCursor(page.next_cursor);
    } catch (e) {
      if (id === request.current) setError({ message: (e as Error).message, reset });
    } finally {
      if (id === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(true), 300); // wait until the user stops typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, price]);

  const chip = (label: string, active: boolean, onPress: () => void, icon?: LucideIcon) => {
    const color = active ? '#fff' : colors.text;
    return (
      <Pressable
        key={label}
        onPress={onPress}
        style={[styles.chip, { borderColor: colors.border }, active && { backgroundColor: colors.primary }]}>
        {icon ? <IconText icon={icon} color={color}>{label}</IconText> : <Text style={{ color }}>{label}</Text>}
      </Pressable>
    );
  };

  // A failed refresh shows at the top (where the user pulled); a failed next page at the end.
  const retry = error && (
    <Pressable onPress={() => (setError(undefined), load(error.reset))} style={styles.note}>
      <Text style={[styles.center, { color: colors.text }]}>{error.message}</Text>
      <IconText icon={RotateCw} color={colors.primary} style={styles.retry}>
        Retry
      </IconText>
    </Pressable>
  );
  const firstLoad = loading && !refreshing && items.length === 0;

  return (
    <View style={styles.page}>
      <FlashList<Listing | { skeleton: number }>
        key={columns}
        numColumns={columns}
        data={firstLoad ? SKELETONS : items}
        keyExtractor={(l) => ('id' in l ? l.id : `skeleton-${l.skeleton}`)}
        contentContainerStyle={styles.list}
        onEndReached={() => load(false)}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => load(true, true)}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.search, { borderColor: colors.border }]}>
              <Search size={18} color="#888" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search title, city or province"
                placeholderTextColor="#888"
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {TYPES.map((t) => chip(t, type === t, () => setType(type === t ? undefined : t)))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {PRICES.map(([v, label]) => chip(label, price === v, () => setPrice(price === v ? undefined : v), PhilippinePeso))}
            </ScrollView>
            {items.length > 0 && error?.reset && retry}
          </View>
        }
        ListEmptyComponent={
          loading ? undefined : error ? retry : <Text style={[styles.note, styles.center, { color: colors.text }]}>No listings found.</Text>
        }
        ListFooterComponent={
          items.length > 0 && error && !error.reset ? retry : loading && !firstLoad && !refreshing ? <ActivityIndicator style={styles.note} /> : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>{'id' in item ? <ListingCard item={item} /> : <ListingCardSkeleton />}</View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  list: { padding: 6 },
  cell: { flex: 1, padding: 6 },
  header: { gap: 8, padding: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  note: { padding: 24, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  retry: { fontWeight: '600' },
});
