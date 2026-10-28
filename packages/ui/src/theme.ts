/**
 * EduCompass Design System Theme Tokens
 * Card E1: Design tokens, color scales, typography, and constants
 * Redesigned for NED University of Engineering & Technology (CISE Department)
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
    primary: {
      maroon: '#511030', // Sampled exact from NED crest
      specMaroon: '#5A1A3C',
      darkTint: '#B5557F', // WCAG AA contrast tint on dark surfaces
    },
    highlight: {
      gold: '#FFAE07', // Sampled exact from NED crest sun
      specGold: '#F2A31B',
    },
    neutrals: {
      light: {
        page: '#F6F7F9',
        surface: '#FFFFFF',
        border: '#E3E6EB',
        text: '#1B2330',
        muted: '#5C667A',
      },
      dark: {
        page: '#0E131B',
        surface: '#161D28',
        border: '#263040',
        text: '#E8ECF2',
        muted: '#9AA6B8',
      },
    },
    semantic: {
      success: '#1E8E5A',
      warning: '#C98A0B',
      danger: '#C0392B',
      info: '#2B6CB0',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, "IBM Plex Sans", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    weights: [400, 500, 600],
  },
  shape: {
    cardRadiusPx: 10,
    buttonRadiusPx: 8,
    inputRadiusPx: 8,
  },
  disclaimer: {
    notice: 'Guidance estimates, not official university decisions. Match scores, prerequisite mappings and recommendations are guidance only.',
    termsUrl: '/terms',
  },
} as const;

export type ThemeColors = typeof THEME.colors;

