import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Field, FormError, SubmitButton } from '@/components/form';
import { api } from '@/lib/api';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    if (!current || !next) return setError('Fill in every field.');
    if (next !== again) return setError('The new passwords do not match.');
    setBusy(true);
    setError(undefined);
    try {
      await api('/v1/me/password', undefined, { current_password: current, new_password: next });
      const done = 'Password changed. You were signed out on your other devices.';
      if (Platform.OS === 'web') window.alert(done);
      else Alert.alert('Password changed', 'You were signed out on your other devices.');
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
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        <Field
          label="New password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
        />
        <Field
          label="New password again"
          value={again}
          onChangeText={setAgain}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <FormError>{error}</FormError>
        <SubmitButton busy={busy} onPress={submit}>
          Change password
        </SubmitButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 16, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
