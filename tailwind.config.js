/** @type {import('tailwindcss').Config} */
// Keep these values in sync with `colors` in src/lib/theme.ts (native-prop
// colors like icon/tabBarStyle colors can't consume Tailwind classes).
const colors = {
  white: '#ffffff',
  black: '#000000',
  gray: '#8e8e93',
  borderLight: '#e5e7eb',
  borderDark: '#27272a',
  background: '#EAF3FA',
  backgroundDark: '#0B1410',
  surface: '#ffffff',
  surfaceDark: '#111C16',
  primary: '#3B6247',
  primaryDark: '#4F7A5C',
  primaryMuted: '#DCEBF5',
  primaryMutedDark: '#16232B',
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
