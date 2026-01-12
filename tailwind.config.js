/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      screens: {
        xs: '320px', // Mobile phones
        sm: '640px', // Landscape phones
        md: '768px', // Tablets (breakpoint for slider layout)
        lg: '1024px', // Small laptops (full slider experience)
        xl: '1280px', // Desktops
        '2xl': '1536px', // Large displays
      },
    },
  },
  plugins: [],
};
