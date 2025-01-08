import React from 'react';
import { CssBaseline } from '@material-ui/core';
import {
  UnifiedThemeProvider,
  createUnifiedTheme,
  genPageTheme,
  palettes,
} from '@backstage/theme';
import { AppTheme } from '@backstage/core-plugin-api';
import { commonThemePalette, themeId } from './Common';

const lightThemePalette = {
  primaryBackground: '#FFFFFF',
  secondaryBackground: '#F8F8F8',
  hoverBackground: '#EBEBEB',
  primaryText: '#333333',
};

const moonlightLightTheme = createUnifiedTheme({
  fontFamily: commonThemePalette.fontFamily,
  palette: {
    ...palettes.light,
    text: {
      primary: lightThemePalette.primaryText,
    },
    primary: {
      main: commonThemePalette.primaryColor,
    },
    background: {
      default: lightThemePalette.primaryBackground,
      paper: lightThemePalette.secondaryBackground,
    },
    navigation: {
      ...palettes.light.navigation,
      background: lightThemePalette.primaryBackground,
      color: lightThemePalette.primaryText,
      indicator: commonThemePalette.primaryColor,
      selectedColor: lightThemePalette.primaryText,
      navItem: {
        hoverBackground: lightThemePalette.hoverBackground,
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
          boxShadow:
            '0px 0px 6px rgba(0, 0, 0, 0.04), 0px 7px 32px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    BackstageSidebarItem: {
      styleOverrides: {
        selected: {
          backgroundColor: lightThemePalette.hoverBackground,
        },
      },
    },
  },
});

export const lightTheme: Partial<AppTheme> & Omit<AppTheme, 'theme'> = {
  id: themeId.light,
  title: 'light Theme',
  variant: 'light',
  Provider: ({ children }: { children: React.ReactNode }) => (
    <UnifiedThemeProvider theme={moonlightLightTheme} noCssBaseline>
      <CssBaseline>{children}</CssBaseline>
    </UnifiedThemeProvider>
  ),
};
