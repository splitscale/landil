import { useTheme } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Same values as v1 (src/lib/listings-browse.ts, listings/new/validate.ts) and the API.
export const TYPES = ['Lot / Land', 'House & Lot', 'Condo unit', 'Commercial', 'Farm lot'];
export const PRICES = [
  ['under-1m', 'Under ₱1M'],
  ['1m-3m', '₱1M – 3M'],
  ['3m-5m', '₱3M – 5M'],
  ['5m-10m', '₱5M – 10M'],
  ['over-10m', 'Over ₱10M'],
] as const;

export type Filters = { type?: string; price?: string };

export const countFilters = (f: Filters) => Number(!!f.type) + Number(!!f.price);

/** The filter groups. A second tap on the selected option clears it. */
export function FilterOptions({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  return (
    <View style={styles.groups}>
      <Group
        title="Property type"
        options={TYPES.map((t) => [t, t] as const)}
        selected={value.type}
        onSelect={(type) => onChange({ ...value, type })}
      />
      <Group
        title="Price"
        options={PRICES}
        selected={value.price}
        onSelect={(price) => onChange({ ...value, price })}
      />
    </View>
  );
}

function Group({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: readonly (readonly [string, string])[];
  selected?: string;
  onSelect: (v: string | undefined) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.chips}>
        {options.map(([value, label]) => {
          const active = selected === value;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(active ? undefined : value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.chip, { borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={{ color: active ? '#fff' : colors.text }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom sheet for phones. Changes apply only on "Show results", so the list does not reload on every tap. */
export function FilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value); // start from the applied filters each time it opens
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: 16 + bottom }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>
          <Pressable onPress={() => setDraft({})} disabled={countFilters(draft) === 0} hitSlop={8}>
            <Text style={{ color: countFilters(draft) ? colors.primary : '#888' }}>Clear all</Text>
          </Pressable>
        </View>
        <FilterOptions value={draft} onChange={setDraft} />
        <Pressable
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          style={[styles.apply, { backgroundColor: colors.primary }]}>
          <Text style={styles.applyText}>Show results</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 20 },
  group: { gap: 10 },
  title: { fontWeight: '600', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 16 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  apply: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  applyText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
