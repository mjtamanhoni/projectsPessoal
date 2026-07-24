/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: '#F5F3EE',
          secondary: '#C8DBBC',
        },
        foreground: {
          primary: '#1B3A28',
          secondary: '#4A6B52',
          muted: '#7A9A80',
        },
        accent: {
          primary: '#2D5E3A',
          light: '#E8EFEA',
          red: '#B84A4A',
        },
        border: {
          subtle: '#D6DDD0',
        },
        bg: {
          card: '#FFFFFF',
          muted: '#F3F4F3',
          primary: '#FAFAF8',
        },
        text: {
          primary: '#1B1F1C',
          secondary: '#6B706C',
          muted: '#9CA09D',
          inverse: '#FFFFFF',
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Geist', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
