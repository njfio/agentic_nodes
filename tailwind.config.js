/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./client/**/*.{html,js}",
    "./client/**/*.html",
    "./client/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors to match your existing design
        'dark': {
          'bg': '#1e1e1e',
          'surface': '#2a2a2a',
          'border': '#444'
        },
        'accent': {
          DEFAULT: '#4CAF50',
          'hover': '#45a049'
        },
        'text': {
          'primary': '#eee',
          'secondary': '#ccc'
        },
        'node': {
          'bg': '#333',
          'border': '#555'
        },
        'connection': '#4a90e2'
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'sans': ['Arial', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      boxShadow: {
        'node': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'node-hover': '0 8px 16px rgba(0, 0, 0, 0.5)',
        'node-selected': '0 0 0 2px #4a90e2, 0 8px 16px rgba(0, 0, 0, 0.5)',
        'modal': '0 10px 25px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 10px rgba(76, 175, 80, 0.5)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
  // Ensure dark mode is enabled
  darkMode: 'class'
}
