import { useTheme } from 'expo-router';
import { PhilippinePeso, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View, type ColorValue, type TextStyle } from 'react-native';

type Props = { icon: LucideIcon; children: React.ReactNode; size?: number; color?: ColorValue; style?: TextStyle };

/** A Lucide icon before a text. All icons in the app come from Lucide. */
export function IconText({ icon: Icon, children, size = 14, color, style }: Props) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  return (
    <View style={styles.row}>
      <Icon size={size} color={c} />
      <Text style={[{ color: c, fontSize: size }, style]}>{children}</Text>
    </View>
  );
}

/** An amount in PHP with the peso icon, for example ₱1,500,000. */
export function Money({ value, ...rest }: Omit<Props, 'icon' | 'children'> & { value: number | string }) {
  return (
    <IconText icon={PhilippinePeso} {...rest}>
      {typeof value === 'number' ? value.toLocaleString('en-PH') : value}
    </IconText>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
