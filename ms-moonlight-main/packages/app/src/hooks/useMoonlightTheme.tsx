import { appThemeApiRef, useApi } from '@backstage/core-plugin-api';
import { useObservable } from 'react-use';
import { themeId } from '../theme/Common';

export const useMoonlightTheme = () => {
  const appThemeApi = useApi(appThemeApiRef);

  const currentTheme = useObservable(
    appThemeApi.activeThemeId$(),
    appThemeApi.getActiveThemeId(),
  );

  const switchTheme = () => {
    appThemeApi.setActiveThemeId(
      currentTheme === themeId.dark ? themeId.light : themeId.dark,
    );
  };

  return {
    currentTheme,
    switchTheme,
  };
};
