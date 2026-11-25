import { Link, Stack, useLocalSearchParams, useTheme } from 'expo-router';
import {
  ChevronRight,
  FileText,
  LandPlot,
  RotateCw,
  MapPin,
  Ruler,
  Scale,
  ScrollText,
  Share2,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { IconText, Money } from '@/components/icon-text';
import { PhotoGallery } from '@/components/photo-gallery';
import { api, SITE_URL, type ListingDetail } from '@/lib/api';

export default function Listing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900; // LND-MOB-11: gallery and details side by side
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
        <IconText icon={RotateCw} color={colors.primary} style={styles.buttonText}>
          Retry
        </IconText>
      </Pressable>
    );
  }
  if (!listing) return <ActivityIndicator style={styles.note} />;

  const text = { color: colors.text };
  const docCount = listing.documents.length + listing.private_document_count;
  const row = (icon: LucideIcon, label: string, value?: string | null) =>
    value ? (
      <View style={styles.row} key={label}>
        <IconText icon={icon} color="#888">
          {label}
        </IconText>
        <Text style={[text, styles.value]}>{value}</Text>
      </View>
    ) : null;

  return (
    <ScrollView contentContainerStyle={[styles.page, wide && styles.wide]}>
      <Stack.Screen options={{ title: listing.title }} />
      <View style={[styles.gallery, wide && styles.half]}>
        <PhotoGallery photos={listing.photos} width={wide ? Math.min(width, 1200) / 2 - 24 : width - 24} />
      </View>

      <View style={[styles.details, wide && styles.half]}>
        <Money value={listing.asking_price} size={24} style={styles.price} />
        <Text style={[text, styles.title]}>{listing.title}</Text>
        <IconText icon={MapPin} color="#888">
          {listing.city}, {listing.province}
        </IconText>

        {row(LandPlot, 'Property type', listing.property_type)}
        {row(Ruler, 'Lot area', listing.lot_area)}
        {row(Ruler, 'Floor area', listing.floor_area)}
        {row(ScrollText, 'Title type', listing.title_type)}
        {row(Zap, 'Utilities', listing.utilities.join(', '))}
        {row(Scale, 'Encumbrances', listing.encumbrances.join(', '))}
        {row(
          User,
          'Seller',
          listing.seller_username ? `${listing.seller_name} (@${listing.seller_username})` : listing.seller_name,
        )}

        <Text style={[text, styles.description]}>{listing.description}</Text>

        {docCount > 0 && (
          <Link href={`/listings/${listing.id}/documents`} asChild>
            <Pressable
              style={StyleSheet.flatten([styles.docs, { borderColor: colors.border, backgroundColor: colors.card }])}>
              <FileText size={20} color={colors.primary} />
              <Text style={[text, styles.docsLabel]}>Documents</Text>
              <Text style={styles.muted}>{docCount}</Text>
              <ChevronRight size={18} color="#888" />
            </Pressable>
          </Link>
        )}

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => Share.share({ message: `${listing.title}: ${SITE_URL}/listings/${listing.id}` })}>
          <IconText icon={Share2} color="#fff" size={16} style={styles.buttonText}>
            Share
          </IconText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 12, gap: 16, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  wide: { flexDirection: 'row', alignItems: 'flex-start' },
  half: { flex: 1 },
  gallery: { borderRadius: 12, overflow: 'hidden' },
  details: { gap: 8 },
  price: { fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, textAlign: 'right' },
  description: { marginTop: 8, lineHeight: 22 },
  docs: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, padding: 14, borderWidth: 1, borderRadius: 12 },
  docsLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  muted: { color: '#888' },
  center: { textAlign: 'center' },
  button: { marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600' },
  note: { padding: 24, alignItems: 'center', gap: 8 },
});
