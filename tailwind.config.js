/** @type {import('tailwindcss').Config} */
// Keep these values in sync with `colors` in src/lib/theme.ts (native-prop
// colors like icon/tabBarStyle colors can't consume Tailwind classes).
const colors = {
  white: '#ffffff',
  black: '#000000',
  gray: '#8e8e93',
  borderLight: '#e5e7eb',
  borderDark: '#27272a',
  background: '#F3FAFF',
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
  test: '#CDE6F4'
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [],
};
