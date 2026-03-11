import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Monitor de Ruido - Aulas",
    description: "Sistema de monitorizacion de niveles de ruido en aulas en tiempo real",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className="min-h-screen bg-gray-950 text-white antialiased">
                <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                <h1 className="text-xl font-bold tracking-tight">
                                    Monitor de Ruido
                                </h1>
                                <span className="text-sm text-gray-400 hidden sm:inline">
                                    | Aulas en tiempo real
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>&lt;50 dB</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span>50-70 dB</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    <span>&gt;70 dB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </body>
        </html>
    );
}
