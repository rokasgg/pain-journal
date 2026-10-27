/** @type {import('tailwindcss').Config} */
// Keep these values in sync with `colors` in src/lib/theme.ts (native-prop
// colors like icon/tabBarStyle colors can't consume Tailwind classes).
const colors = {
  white: '#ffffff',
  black: '#000000',
  gray: '#8e8e93',
  borderLight: '#e5e7eb',
  borderDark: '#27272a',
  background: '#EEF1EE',
  backgroundDark: '#0B1410',
  surface: '#ffffffff',
  surfaceDark: '#111C16',
  primary: '#3B6247',
  primaryDark: '#4F7A5C',
  primaryMuted: '#DCEBF5',
  primaryMutedDark: '#16232B',
  bgSettings: '#d0e8f7ff',
  bgSettingsSelected: '#9dc9e2ff',
  pink: '#FFDAD6',
  strongGray: '#416352',
  selectedTab: '#506873',
  selectedTabColor: '#CDE6F4',
  bone: '#F5F0E6',
  test: '#CDE6F4',
  accent: '#2F5A41',
  accentMuted: '#E5EEE7',
  // History tab redesign: segmented-control track, primary/secondary ink.
  segmentTrack: '#E3E8E4',
  segmentTrackDark: '#1C2620',
  ink: '#1C2420',
  inkSecondary: '#5B6660',
  // Insights: overdue-visit banner.
  creamTint: '#FBF3E4',
  creamTintDark: '#2A2417',
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      // Named type scale: [size, { lineHeight, fontWeight }]. Extends (doesn't
      // replace) Tailwind's text-xs … text-4xl.
      fontSize: {
        hero: ['52px', { lineHeight: '56px', fontWeight: '700' }], // oak day counter, big stats
        display: ['34px', { lineHeight: '40px', fontWeight: '700' }], // big numbers (Insights)
        title: ['24px', { lineHeight: '30px', fontWeight: '700' }], // screen titles: "Kaip jaučiatės?"
        nav: ['17px', { lineHeight: '22px', fontWeight: '600' }], // header title, primary button
        heading: ['16px', { lineHeight: '22px', fontWeight: '600' }], // section titles: "Kur skauda?"
        value: ['18px', { lineHeight: '22px', fontWeight: '600' }], // slider value "5 · noticeable"
        body: ['16px', { lineHeight: '22px' }], // text, inputs, list rows
        label: ['14px', { lineHeight: '18px' }], // chips, segmented, secondary buttons
        caption: ['12px', { lineHeight: '16px' }], // hints, slider ends, "Last time", sources
      },
    },
  },
  plugins: [],
};
