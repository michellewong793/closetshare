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
          50:  '#fdf4f4',
          100: '#fbe8e8',
          200: '#f5d0d0',
          300: '#ecacac',
          400: '#df7878',
          500: '#ce4f4f',
          600: '#b83333',
          700: '#9a2828',
          800: '#802424',
          900: '#6c2323',
        },
        cream: '#faf7f4',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
