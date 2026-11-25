import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { CircleUser } from 'lucide-react-native';
import { Pressable, useColorScheme, type ColorValue } from 'react-native';

import { SessionProvider, useSession } from '@/lib/session';

// A link straight to a listing (shared link, push, cold start) still gets Home underneath it,
// so the back arrow and the Android Back button have somewhere to go.
export const unstable_settings = { anchor: 'index' };

/** Home header: your account when signed in, else sign in. */
function AccountButton({ tint }: { tint?: ColorValue }) {
  const { user } = useSession();
  return (
    <Pressable
      onPress={() => router.push(user ? '/account' : '/sign-in')}
      hitSlop={10}
      accessibilityLabel={user ? `Account, ${user.username}` : 'Sign in'}>
      <CircleUser size={24} color={user ? tint : '#888'} />
    </Pressable>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={theme}>
      <SessionProvider>
        <Stack>
          <Stack.Screen
            name="index"
            options={{ title: 'Landil', headerRight: () => <AccountButton tint={theme.colors.primary} /> }}
          />
          <Stack.Screen name="listings/[id]" options={{ title: 'Listing' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in', presentation: 'modal' }} />
          <Stack.Screen name="sign-up" options={{ title: 'Create account', presentation: 'modal' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
        </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}
