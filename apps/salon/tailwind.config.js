/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          gold: '#D4AF37',
          cream: '#FDFBF7',
          charcoal: '#2C2C2C',
          silver: '#C0C0C0',
        },
      },
      fontFamily: {
        'luxury-thin': ['Montserrat_100Thin'],
        'luxury-light': ['Montserrat_300Light'],
        'luxury-regular': ['Montserrat_400Regular'],
        'luxury-medium': ['Montserrat_500Medium'],
      },
    },
  },
  plugins: [],
}
