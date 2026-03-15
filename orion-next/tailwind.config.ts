import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        surface: "#09090b",
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          900: "#164e63",
        },
        violet: {
          400: "#c084fc",
          500: "#a855f7",
          900: "#581c87",
        }
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'monospace'],
        sans: ['var(--font-geist-sans)', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(34, 211, 238, 0.4)' },
          '50%': { opacity: '.5', boxShadow: '0 0 5px rgba(34, 211, 238, 0.1)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;