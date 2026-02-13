/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15191f",
        paper: "#f7f5ef",
        accent: "#e65f2b",
        muted: "#737b86"
      }
    }
  },
  plugins: []
};
