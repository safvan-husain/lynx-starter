module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('@lynx-js/tailwind-preset')],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      keyframes: {
        'logo-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'logo-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'logo-spin': 'logo-spin 20s linear infinite',
        'logo-pulse': 'logo-pulse 0.5s ease infinite',
      },
    },
  },
}
