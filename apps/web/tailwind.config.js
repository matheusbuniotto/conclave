/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slack: {
          sidebar: "#3F0E40",
          sidebarHover: "#350d36",
          sidebarText: "#BCABB4",
          sidebarTextActive: "#FFFFFF",
          sidebarActive: "#1164A3",
          border: "#522653",
        },
      },
    },
  },
  plugins: [],
};
