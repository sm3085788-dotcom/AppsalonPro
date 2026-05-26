import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Pull-to-refresh estándar en App Salón.
 * @param {() => void | Promise<void>} reloadFn
 */
export function useSalonPullRefresh(reloadFn) {
  const { colors: c } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadFn?.();
    } finally {
      setRefreshing(false);
    }
  }, [reloadFn]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={c.primary}
        colors={[c.primary]}
        progressBackgroundColor={c.card}
      />
    ),
    [refreshing, onRefresh, c.primary, c.card],
  );

  return { refreshing, onRefresh, refreshControl };
}
