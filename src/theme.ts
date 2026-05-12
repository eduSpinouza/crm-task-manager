'use client';
// ============================================================
// CobraYa! CRM — MUI v5 Theme Override
// Wraps the app via ThemeRegistry → ThemeProvider.
// Pairs with src/styles/tokens.css — both must be loaded.
// ============================================================

import { createTheme } from '@mui/material/styles';

// Hex fallbacks for MUI internals that can't resolve CSS vars
// (SVG icons, some palette.contrastText paths). Prefer CSS vars
// in component sx / sx props everywhere else.
const hex = {
  paper:      '#fbfaf7',
  paper2:     '#f5f3ef',
  paper3:     '#ebe8e2',
  ink:        '#2a2d33',
  ink2:       '#555860',
  ink3:       '#86888f',
  line:       '#dedad2',
  line2:      '#e9e5de',
  accent:     '#4967cc',
  accentSoft: '#e5eaf6',
  warn:       '#d49a3e',
  warnInk:    '#7a5212',
  warnSoft:   '#f6ecd8',
  danger:     '#c43e2b',
  dangerSoft: '#f4d9d3',
  good:       '#3aa370',
  goodInk:    '#1e5a3d',
  goodSoft:   '#d4eadb',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: hex.accent,  contrastText: '#ffffff' },
    error:      { main: hex.danger,  contrastText: '#ffffff' },
    warning:    { main: hex.warn,    contrastText: hex.warnInk },
    success:    { main: hex.good,    contrastText: '#ffffff' },
    text:       { primary: hex.ink, secondary: hex.ink2, disabled: hex.ink3 },
    background: { default: hex.paper, paper: hex.paper },
    divider:    hex.line,
    action: {
      hover:    hex.paper2,
      selected: hex.accentSoft,
      focus:    hex.accentSoft,
    },
  },

  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: 14,
    htmlFontSize: 16,

    h1: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, lineHeight: 1.0, fontWeight: 400, letterSpacing: '-0.01em' },
    h2: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.01em' },
    h3: { fontSize: 18, lineHeight: 1.3, fontWeight: 600 },
    h4: { fontSize: 16, lineHeight: 1.3, fontWeight: 600 },
    body1:   { fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
    body2:   { fontSize: 13, lineHeight: 1.5, fontWeight: 400 },
    button:  { fontSize: 12, lineHeight: 1,   fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
    caption: { fontSize: 11, lineHeight: 1.3, fontWeight: 400 },
    overline: {
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 10, lineHeight: 1, fontWeight: 500,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    },
  },

  shape: { borderRadius: 4 },

  // Only modals/dialogs get a shadow — everything else uses borders.
  shadows: Array(25).fill('none').map((_, i) =>
    i >= 8 ? '0 20px 60px rgba(0,0,0,0.25)' : 'none'
  ) as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body': { WebkitFontSmoothing: 'antialiased' },
        '.tnum, .amount, .count, td.num': { fontVariantNumeric: 'tabular-nums' },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 3,
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 500,
          transition: `background var(--dur-fast, 120ms) var(--ease, cubic-bezier(0.2,0,0,1))`,
        },
        containedPrimary: {
          backgroundColor: hex.accent,
          '&:hover': { backgroundColor: '#3f5ab8' },
        },
        outlinedPrimary: {
          borderColor: hex.line,
          color: hex.ink,
          backgroundColor: hex.paper2,
          '&:hover': { backgroundColor: hex.paper3, borderColor: hex.line },
        },
        text: { color: hex.ink2 },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: hex.paper,
          backgroundImage: 'none',
        },
        outlined: { borderColor: hex.line },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: 14,
          backgroundColor: hex.paper,
          '& fieldset': { borderColor: hex.line },
          '&:hover fieldset': { borderColor: hex.ink3 },
          '&.Mui-focused fieldset': { borderColor: hex.accent, borderWidth: 2 },
        },
      },
    },

    MuiTable: {
      styleOverrides: { root: { borderCollapse: 'separate' } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: hex.paper2,
            color: hex.ink3,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${hex.line}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          fontSize: 14,
          borderBottom: `1px solid ${hex.line2}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: `background var(--dur-fast, 120ms) var(--ease, cubic-bezier(0.2,0,0,1))`,
          '&:hover': { backgroundColor: hex.paper2 },
          '&.Mui-selected': {
            backgroundColor: hex.accentSoft,
            '&:hover': { backgroundColor: hex.accentSoft },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 500,
          height: 20,
        },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: {
          backgroundColor: hex.paper,
          borderBottom: `1px solid ${hex.line}`,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 6 },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: hex.ink,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 6, color: hex.ink3 },
      },
    },
  },
});

export default theme;
