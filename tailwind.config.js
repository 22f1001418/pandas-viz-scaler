/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "Menlo", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "s1": "var(--s1)",
        "s2": "var(--s2)",
        "s3": "var(--s3)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        pink: "var(--pink)",
        "pink-soft": "var(--pink-soft)",
        teal: "var(--teal)",
        "teal-soft": "var(--teal-soft)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
        red: "var(--red)",
        "red-soft": "var(--red-soft)",
        green: "var(--green)",
        "green-soft": "var(--green-soft)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-lg": "0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};
