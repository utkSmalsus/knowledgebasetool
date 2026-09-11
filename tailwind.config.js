/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'slide-in-right': { from: { opacity: 0, transform: 'translateX(8px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        'check-pop': { '0%': { transform: 'scale(0.6)', opacity: 0 }, '60%': { transform: 'scale(1.15)', opacity: 1 }, '100%': { transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out both',
        'fade-up': 'fade-up 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.15s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slide-in-right 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'check-pop': 'check-pop 0.4s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
