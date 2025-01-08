import React from 'react';
import { CssBaseline } from '@material-ui/core';
import {
  UnifiedThemeProvider,
  genPageTheme,
  palettes,
  createUnifiedTheme,
} from '@backstage/theme';
import { AppTheme } from '@backstage/core-plugin-api';
import { commonThemePalette, themeId } from './Common';

const darkThemePalette = {
  primaryBackground: '#121212',
  secondaryBackground: '#252525',
  hoverBackground: '#717171',
  primaryText: '#F5F5F5',
};

const moondarkDarkTheme = createUnifiedTheme({
  fontFamily: commonThemePalette.fontFamily,
  palette: {
    ...palettes.dark,
    text: {
      primary: darkThemePalette.primaryText,
    },
    primary: {
      main: commonThemePalette.primaryColor,
    },
    background: {
      default: darkThemePalette.primaryBackground,
      paper: darkThemePalette.secondaryBackground,
    },
    navigation: {
      ...palettes.dark.navigation,
      background: darkThemePalette.primaryBackground,
      color: darkThemePalette.primaryText,
      indicator: commonThemePalette.primaryColor,
      selectedColor: darkThemePalette.primaryText,
      navItem: {
        hoverBackground: darkThemePalette.hoverBackground,
      },
    },
  },
  defaultPageTheme: 'home',

  pageTheme: {
    home: genPageTheme({
      colors: [commonThemePalette.primaryColor],
      shape: `linear-gradient(${commonThemePalette.primaryColor}, ${commonThemePalette.primaryColor})`,
      options: {
        fontColor: commonThemePalette.textForPrimaryColor,
      },
    }),
  },
  components: {
    BackstageSidebar: {
      styleOverrides: {
        drawer: {
          backgroundColor: darkThemePalette.secondaryBackground,
          boxShadow:
            '0px 0px 6px rgba(0, 0, 0, 0.04), 0px 7px 32px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    BackstageSidebarItem: {
      styleOverrides: {
        selected: {
          backgroundColor: darkThemePalette.hoverBackground,
        },
      },
    },
  },
});

export const darkTheme: Partial<AppTheme> & Omit<AppTheme, 'theme'> = {
  id: themeId.dark,
  title: 'Dark Theme',
  variant: 'dark',
  Provider: ({ children }: { children: React.ReactNode }) => (
    <UnifiedThemeProvider theme={moondarkDarkTheme} noCssBaseline>
      <CssBaseline>{children}</CssBaseline>
    </UnifiedThemeProvider>
  ),
};
