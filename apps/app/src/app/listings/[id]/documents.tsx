import { Stack, useLocalSearchParams, useTheme } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight, FileText, Lock, RotateCw } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconText } from '@/components/icon-text';
import { api, type ListingDetail } from '@/lib/api';

/** Public documents for everyone. Private ones show only as a count: the API never sends their URLs. */
export default function Documents() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [listing, setListing] = useState<ListingDetail>();
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setError(undefined);
    api<ListingDetail>(`/v1/listings/${id}`).then(setListing, (e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (error) {
    return (
      <Pressable onPress={load} style={styles.note}>
        <Text style={[styles.center, { color: colors.text }]}>{error}</Text>
        <IconText icon={RotateCw} color={colors.primary} style={styles.bold}>
          Retry
        </IconText>
      </Pressable>
    );
  }
  if (!listing) return <ActivityIndicator style={styles.note} />;

  const { documents, private_document_count: hidden } = listing;
  const border = { borderColor: colors.border };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Documents' }} />
      <Text style={styles.muted} numberOfLines={1}>
        {listing.title}
      </Text>

      {documents.length === 0 && hidden === 0 && <Text style={styles.muted}>This listing has no documents.</Text>}

      {documents.length > 0 && (
        <View style={[styles.group, border, { backgroundColor: colors.card }]}>
          {documents.map((d, i) => (
            <Pressable
              key={d.url}
              // In-app browser: the user stays in Landil and comes back with one tap. createTask: false keeps
              // the tab in the app's Android task, so Back returns here and not to whatever task was before.
              onPress={() => WebBrowser.openBrowserAsync(d.url, { createTask: false })}
              style={({ pressed }) => [styles.row, i > 0 && [styles.divider, border], pressed && styles.pressed]}
              accessibilityRole="link">
              <FileText size={20} color={colors.primary} />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {d.name}
              </Text>
              <ChevronRight size={18} color="#888" />
            </Pressable>
          ))}
        </View>
      )}

      {hidden > 0 && (
        <View style={[styles.group, styles.row, border]}>
          <Lock size={20} color="#888" />
          <Text style={[styles.name, styles.muted]}>
            {hidden === 1 ? '1 private document' : `${hidden} private documents`}. Only the seller can see{' '}
            {hidden === 1 ? 'it' : 'them'}.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 12, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  divider: { borderTopWidth: 1 },
  pressed: { opacity: 0.6 },
  name: { flex: 1, fontSize: 15 },
  muted: { color: '#888' },
  note: { padding: 24, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  bold: { fontWeight: '600' },
});
