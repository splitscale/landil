import { useTheme } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor="#888"
        accessibilityLabel={label}
        {...input}
        style={[styles.input, { color: colors.text, borderColor: error ? '#e5484d' : colors.border }]}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/** A row of options where one is chosen, e.g. gender. */
export function Choice<T>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.row}>
        {options.map(([v, text]) => {
          const on = v === value;
          return (
            <Pressable
              key={text}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.choice, { borderColor: on ? colors.primary : colors.border }, on && { backgroundColor: colors.primary }]}>
              <Text style={{ color: on ? '#fff' : colors.text }}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FormError({ children }: { children?: string }) {
  return children ? (
    <Text style={[styles.error, styles.formError]} accessibilityRole="alert">
      {children}
    </Text>
  ) : null;
}

export function SubmitButton({ busy, onPress, children }: { busy: boolean; onPress: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      style={[styles.submit, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{children}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  error: { color: '#e5484d', fontSize: 13 },
  formError: { fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  submit: { padding: 14, borderRadius: 10, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
