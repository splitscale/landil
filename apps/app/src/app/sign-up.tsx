import { Link, router, useTheme } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Choice, Field, FormError, SubmitButton } from '@/components/form';
import { useSession, type SignUpFields } from '@/lib/session';

// v1 sign-up form: male = false, female = true.
const GENDERS = [
  [false, 'Male'],
  [true, 'Female'],
] as const;

export default function SignUp() {
  const { colors } = useTheme();
  const { signUp } = useSession();
  const [f, setF] = useState<Partial<SignUpFields>>({});
  const set = <K extends keyof SignUpFields>(k: K) => (v: SignUpFields[K]) => setF((old) => ({ ...old, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    // The API checks everything again; these only save a round trip for the obvious cases.
    if (!f.name?.trim() || !f.username?.trim() || !f.email?.trim() || !f.password) return setError('Fill in every field.');
    if (f.gender === undefined) return setError('Choose a gender.');
    setBusy(true);
    setError(undefined);
    try {
      await signUp(f as SignUpFields);
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
        <Field label="Full name" value={f.name ?? ''} onChangeText={set('name')} autoComplete="name" />
        <Field
          label="Username"
          value={f.username ?? ''}
          onChangeText={set('username')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          placeholder="4 to 10 letters, digits, _ or ."
        />
        <Field
          label="Email"
          value={f.email ?? ''}
          onChangeText={set('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={f.password ?? ''}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
        />
        <Choice label="Gender" options={GENDERS} value={f.gender} onChange={set('gender')} />
        <FormError>{error}</FormError>
        <SubmitButton busy={busy} onPress={submit}>
          Create account
        </SubmitButton>
        <Text style={[styles.center, { color: colors.text }]}>
          Have an account?{' '}
          <Link href="/sign-in" replace style={{ color: colors.primary, fontWeight: '600' }}>
            Sign in
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
