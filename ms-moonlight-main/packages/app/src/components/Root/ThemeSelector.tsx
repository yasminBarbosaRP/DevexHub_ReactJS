import React from 'react';
import { SunIcon } from './assets/sun-icon';
import { MoonIcon } from './assets/moon-icon';
import { SidebarItem } from '@backstage/core-components';
import { themeId } from '../../theme/Common';
import { useMoonlightTheme } from '../../hooks/useMoonlightTheme';

export const ThemeSelector = () => {
  const { currentTheme, switchTheme } = useMoonlightTheme();

  return (
    <SidebarItem
      onClick={switchTheme}
      icon={currentTheme === themeId.dark ? SunIcon : MoonIcon}
      text={currentTheme === themeId.dark ? 'Light Mode' : 'Dark Mode'}
    />
  );
};
