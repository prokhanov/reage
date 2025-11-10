import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
          glow: "hsl(var(--secondary-glow))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glow: "hsl(var(--accent-glow))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          good: "hsl(var(--status-good))",
          warning: "hsl(var(--status-warning))",
          danger: "hsl(var(--status-danger))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-dark': 'var(--gradient-dark)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'neon-primary': 'var(--shadow-neon-primary)',
        'neon-secondary': 'var(--shadow-neon-secondary)',
        'neon-accent': 'var(--shadow-neon-accent)',
      },
      transitionProperty: {
        'smooth': 'var(--transition-smooth)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "25%": {
            transform: "translate(150px, -120px) scale(1.08)",
          },
          "50%": {
            transform: "translate(-110px, 140px) scale(0.96)",
          },
          "75%": {
            transform: "translate(130px, 100px) scale(1.04)",
          },
        },
        "float-delayed": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "25%": {
            transform: "translate(-140px, 150px) scale(0.95)",
          },
          "50%": {
            transform: "translate(170px, -100px) scale(1.12)",
          },
          "75%": {
            transform: "translate(-100px, -120px) scale(1.06)",
          },
        },
        "float-slow": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "33%": {
            transform: "translate(120px, 120px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-90px, -80px) scale(0.92)",
          },
        },
        "float-x": {
          "0%, 100%": {
            transform: "translateX(0) scale(1)",
          },
          "50%": {
            transform: "translateX(180px) scale(1.08)",
          },
        },
        "float-y": {
          "0%, 100%": {
            transform: "translateY(0) scale(1)",
          },
          "50%": {
            transform: "translateY(-150px) scale(1.1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "float": "float 28s ease-in-out infinite alternate both",
        "float-delayed": "float-delayed 34s ease-in-out infinite alternate both",
        "float-slow": "float-slow 40s ease-in-out infinite alternate both",
        "float-x": "float-x 32s ease-in-out infinite alternate both",
        "float-y": "float-y 36s ease-in-out infinite alternate both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
