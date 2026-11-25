import { Link, router, useTheme } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Field, FormError, SubmitButton } from '@/components/form';
import { useSession } from '@/lib/session';

export default function SignIn() {
  const { colors } = useTheme();
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    if (!username.trim() || !password) return setError('Enter your username and password.');
    setBusy(true);
    setError(undefined);
    try {
      await signIn(username, password);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <FormError>{error}</FormError>
        <SubmitButton busy={busy} onPress={submit}>
          Sign in
        </SubmitButton>
        <Text style={[styles.center, { color: colors.text }]}>
          New to Landil?{' '}
          <Link href="/sign-up" replace style={{ color: colors.primary, fontWeight: '600' }}>
            Create an account
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 16, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { textAlign: 'center' },
});
