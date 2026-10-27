/**
 * EduCompass Design System Theme Tokens
 * Card E1: Design tokens, color scales, typography, and constants
 */

export const THEME = {
  colors: {
    brand: {
      50: '#f0f7ff',
      100: '#e0effe',
      200: '#bae0fd',
      300: '#7cc5fb',
      400: '#38a5f8',
      500: '#0e87eb',
      600: '#026bc9',
      700: '#0355a2',
      800: '#074885',
      900: '#0c3d6e',
      950: '#082749',
    },
    surface: {
      dark: '#0b0f19',
      darkElevated: '#111827',
      darkCard: '#182234',
      darkBorder: '#1f2d42',
      light: '#ffffff',
      lightElevated: '#f8fafc',
      lightCard: '#ffffff',
      lightBorder: '#e2e8f0',
    },
    status: {
      success: {
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: '#10b981',
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: '#f59e0b',
      },
      danger: {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)',
        text: '#ef4444',
      },
      info: {
        bg: 'rgba(56, 165, 248, 0.1)',
        border: 'rgba(56, 165, 248, 0.3)',
        text: '#38a5f8',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
  },
  disclaimer: {
    notice: 'Guidance estimates, not official university decisions.',
    termsUrl: '/terms',
  },
} as const;

export type ThemeColors = typeof THEME.colors;
