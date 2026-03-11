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
                // Colores personalizados para niveles de ruido
                noise: {
                    low: "#22c55e",      // Verde - tranquilo
                    medium: "#eab308",   // Amarillo - moderado
                    high: "#ef4444",     // Rojo - ruidoso
                },
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
        },
    },
    plugins: [],
};

export default config;
