import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

// A link straight to a listing (shared link, push, cold start) still gets Home underneath it,
// so the back arrow and the Android Back button have somewhere to go.
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Landil' }} />
        <Stack.Screen name="listings/[id]" options={{ title: 'Listing' }} />
      </Stack>
    </ThemeProvider>
  );
}
