import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useTheme } from 'expo-router';
import {
  FileText,
  LandPlot,
  Lock,
  MapPin,
  Ruler,
  Scale,
  ScrollText,
  Share2,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { IconText, Money } from '@/components/icon-text';
import { api, SITE_URL, type ListingDetail } from '@/lib/api';

export default function Listing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900; // LND-MOB-11: gallery and details side by side
  const [listing, setListing] = useState<ListingDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api<ListingDetail>(`/v1/listings/${id}`).then(setListing, (e) => setError(e.message));
  }, [id]);

  if (error) return <Text style={[styles.note, { color: colors.text }]}>{error}</Text>;
  if (!listing) return <ActivityIndicator style={styles.note} />;

  const text = { color: colors.text };
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
      <ScrollView horizontal pagingEnabled style={wide ? styles.half : undefined}>
        {listing.photos.map((url) => (
          <Image
            key={url}
            source={url}
            style={{ width: wide ? Math.min(width, 1200) / 2 - 24 : width - 24, aspectRatio: 4 / 3 }}
            contentFit="cover"
          />
        ))}
      </ScrollView>

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

        <Text style={[text, styles.section]}>Documents</Text>
        {listing.documents.map((d) => (
          <Pressable key={d.url} onPress={() => Linking.openURL(d.url)}>
            <IconText icon={FileText} color={colors.primary}>
              {d.name}
            </IconText>
          </Pressable>
        ))}
        {listing.private_document_count > 0 && (
          <IconText icon={Lock} color="#888">
            {listing.private_document_count} private document(s), visible to the seller
          </IconText>
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
  details: { gap: 8 },
  price: { fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, textAlign: 'right' },
  description: { marginTop: 8, lineHeight: 22 },
  section: { marginTop: 8, fontWeight: '600' },
  button: { marginTop: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600' },
  note: { textAlign: 'center', padding: 24 },
});
