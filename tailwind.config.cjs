/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f8ff",
          100: "#dce9ff",
          200: "#b9d3ff",
          300: "#92bbff",
          400: "#5f97ff",
          500: "#3a76f6",
          600: "#2359d2",
          700: "#1947a9",
          800: "#133a88",
          900: "#0f2f6b"
        }
      }
    }
  },
  plugins: []
};
