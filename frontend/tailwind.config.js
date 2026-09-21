/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563EB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563EB', // Electric Blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#172554',
          dark: '#18181b', // Obsidian Charcoal
          charcoal: '#0f172a',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 30px 0 rgba(37, 99, 235, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
        'glass-hover': '0 12px 36px 0 rgba(37, 99, 235, 0.09), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'glass-lg': '0 20px 48px -8px rgba(15, 23, 42, 0.08), 0 8px 24px -4px rgba(37, 99, 235, 0.06)',
        'glow-blue': '0 0 25px -3px rgba(37, 99, 235, 0.35)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '2.75rem',
      },
    },
  },
  plugins: [],
};

