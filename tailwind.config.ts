import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fffef0',
          100: '#fffacc',
          200: '#fff49e',
          300: '#ffe860',
          400: '#ffd92e',
          500: '#f5c000',
          600: '#d4a000',
          700: '#a87800',
          800: '#845f00',
          900: '#6a4c00',
        },
        cream: '#fffef5',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
