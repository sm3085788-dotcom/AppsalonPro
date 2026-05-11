import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { typography } from '@appsalon/design-tokens';
import {
  SubScreenChrome,
  useSubStyles,
  SalonButton,
} from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

export function SalonModulePlaceholder({ module: mod, onBack }) {
  const subStyles = useSubStyles();
  const { colors: c, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome title={mod.title} subtitle={mod.subtitle} onBack={onBack}>
        <View style={subStyles.card}>
          <Text style={subStyles.bullets}>
            Pantalla enlazada sin lógica todavía. Aquí integraremos datos y flujos reales para{' '}
            <Text style={{ fontFamily: typography.fontSansMedium, color: c.foreground }}>
              {mod.title}
            </Text>
            .
          </Text>
        </View>
        <SalonButton title="Acción principal (demo)" variant="heroGold" fullWidth onPress={() => {}} />
        <SalonButton title="Secundaria" variant="outlineGray" fullWidth onPress={() => {}} />
      </SubScreenChrome>
    </>
  );
}
