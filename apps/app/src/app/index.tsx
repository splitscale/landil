import { Image } from 'expo-image';
import { Link, useTheme } from 'expo-router';
import { LandPlot, MapPin, PhilippinePeso, Search, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { IconText, Money } from '@/components/icon-text';
import { api, type ListingCard, type Page } from '@/lib/api';

// Same values as v1 (src/lib/listings-browse.ts, listings/new/validate.ts).
const TYPES = ['Lot / Land', 'House & Lot', 'Condo unit', 'Commercial', 'Farm lot'];
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
  const [items, setItems] = useState<ListingCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const request = useRef(0);

  async function load(reset: boolean) {
    if (!reset && (loading || !cursor)) return;
    const id = ++request.current;
    setLoading(true);
    setError(undefined);
    try {
      const page = await api<Page<ListingCard>>('/v1/listings', {
        q: q.trim() || undefined,
        type,
        price,
        cursor: reset ? undefined : cursor!,
      });
      if (id !== request.current) return; // a newer search started
      setItems((old) => (reset ? page.items : [...old, ...page.items]));
      setCursor(page.next_cursor);
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setLoading(false);
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

  return (
    <FlatList
      key={columns}
      numColumns={columns}
      data={items}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.list}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      onEndReached={() => load(false)}
      onEndReachedThreshold={0.5}
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
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : (
          <Text style={[styles.note, { color: colors.text }]}>{error ?? 'No listings found.'}</Text>
        )
      }
      ListFooterComponent={loading ? <ActivityIndicator style={styles.note} /> : undefined}
      renderItem={({ item }) => (
        <Link href={`/listings/${item.id}`} asChild>
          <Pressable style={StyleSheet.flatten([styles.card, { backgroundColor: colors.card, borderColor: colors.border }])}>
            <Image source={item.cover_url} style={styles.cover} contentFit="cover" transition={150} />
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
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 12, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  row: { gap: 12 },
  header: { gap: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  card: { flex: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cover: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#ddd' },
  body: { padding: 12, gap: 2 },
  price: { fontWeight: '700' },
  note: { textAlign: 'center', padding: 24 },
});
