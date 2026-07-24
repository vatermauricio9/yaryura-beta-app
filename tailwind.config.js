/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#dd0209',
          'red-dark': '#b00207',
          'red-light': '#ec1d23',
          gray: '#e4e4e4',
          'gray-light': '#f4f4f4',
          'gray-dark': '#555555',
          black: '#212121',
        },
      },
      fontFamily: {
        heading: ['Capriola', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
