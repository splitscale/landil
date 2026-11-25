import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { RotateCw, Search, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { countFilters, FilterOptions, FilterSheet, type Filters } from '@/components/filters';
import { IconText } from '@/components/icon-text';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import { api, type ListingCard as Listing, type Page } from '@/lib/api';

const SKELETONS = Array.from({ length: 6 }, (_, i) => ({ skeleton: i }));
const PANEL = 260; // width of the filter side panel on wide screens

export default function Home() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  // LND-MOB-11: filters in a side panel and more columns on wide screens, a bottom sheet on phones.
  const wide = width >= 1024;
  const listWidth = Math.min(width, 1200) - (wide ? PANEL : 0);
  const columns = listWidth >= 840 ? 3 : listWidth >= 560 ? 2 : 1;

  // Filters live in the URL, so a shared browse link opens with the same results.
  const params = useLocalSearchParams<{ q?: string; type?: string; price?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [filters, setFilters] = useState<Filters>({ type: params.type, price: params.price });
  const { type, price } = filters;
  const [sheet, setSheet] = useState(false);
  const [items, setItems] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; reset: boolean }>();
  const request = useRef(0);
  const synced = useRef(false);

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
    const t = setTimeout(() => {
      // Not on the first run: the URL is where the values came from, and the navigator may not be mounted yet.
      if (synced.current) router.setParams({ q: q.trim() || undefined, type, price });
      synced.current = true;
      load(true);
    }, 300); // wait until the user stops typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, price]);

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

  const active = countFilters(filters);

  return (
    <View style={[styles.page, wide && styles.row]}>
      {wide && (
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Filters</Text>
            {active > 0 && (
              <Pressable onPress={() => setFilters({})} hitSlop={8}>
                <Text style={{ color: colors.primary }}>Clear all</Text>
              </Pressable>
            )}
          </View>
          <FilterOptions value={filters} onChange={setFilters} />
        </View>
      )}
      <View style={styles.list}>
      <FlashList<Listing | { skeleton: number }>
        key={columns}
        numColumns={columns}
        data={firstLoad ? SKELETONS : items}
        keyExtractor={(l) => ('id' in l ? l.id : `skeleton-${l.skeleton}`)}
        contentContainerStyle={styles.content}
        onEndReached={() => load(false)}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => load(true, true)}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <View style={[styles.search, { borderColor: colors.border }]}>
                <Search size={18} color="#888" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search title, city or province"
                  placeholderTextColor="#888"
                  returnKeyType="search"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
              {!wide && (
                <Pressable
                  onPress={() => setSheet(true)}
                  accessibilityLabel={active ? `Filters, ${active} selected` : 'Filters'}
                  style={[styles.filterButton, { borderColor: active ? colors.primary : colors.border }]}>
                  <SlidersHorizontal size={18} color={active ? colors.primary : colors.text} />
                  {active > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{active}</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
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
      <FilterSheet visible={sheet} value={filters} onApply={setFilters} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  row: { flexDirection: 'row' },
  list: { flex: 1 },
  content: { padding: 6 },
  panel: { width: PANEL, padding: 16, borderRightWidth: 1, gap: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 18, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8 },
  filterButton: { borderWidth: 1, borderRadius: 8, width: 46, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cell: { flex: 1, padding: 6 },
  header: { gap: 8, padding: 6 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 16 },
  note: { padding: 24, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  retry: { fontWeight: '600' },
});
