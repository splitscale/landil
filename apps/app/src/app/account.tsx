import { Link, router, useTheme } from 'expo-router';
import { BadgeCheck, LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconText } from '@/components/icon-text';
import { useSession } from '@/lib/session';

export default function Account() {
  const { colors } = useTheme();
  const { user, ready, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  // No redirect here: it raced the router.back() after Sign out and left a Sign in screen with no
  // way back. Signed out (e.g. an old link to /account): offer to sign in instead.
  if (!user) {
    return ready ? (
      <View style={styles.page}>
        <Text style={{ color: colors.text }}>You are not signed in.</Text>
        <Link href="/sign-in" style={{ color: colors.primary, fontWeight: '600' }}>
          Sign in
        </Link>
      </View>
    ) : null;
  }

  const row = (label: string, value: string) => (
    <View style={[styles.row, { borderColor: colors.border }]} key={label}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ color: colors.text }}>{value}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
        {user.verified && <BadgeCheck size={20} color={colors.primary} accessibilityLabel="Verified" />}
      </View>
      <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {row('Username', `@${user.username ?? '—'}`)}
        {row('Email', user.email)}
        {row('Role', user.role)}
        {row('Plan', user.plan)}
      </View>
      <Pressable
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await signOut();
          router.back();
        }}
        style={[styles.signOut, { borderColor: colors.border }]}>
        <IconText icon={LogOut} color="#e5484d" style={styles.bold}>
          Sign out
        </IconText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  muted: { color: '#888' },
  signOut: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  bold: { fontWeight: '600' },
});
