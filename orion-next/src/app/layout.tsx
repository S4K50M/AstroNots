import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { LocationProvider } from "@/contexts/LocationContext";

const sans = Inter({ subsets: ["latin"], variable: '--font-geist-sans' });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: "Orion | Space Weather",
  description: "Tactical Aurora Forecasting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} bg-void text-slate-300 antialiased overflow-hidden`}>
        <LocationProvider>
          <div className="flex h-screen w-screen flex-col md:flex-row">
            
            {/* Top Header (Mobile Only) */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800/60 bg-surface/80 backdrop-blur-md z-50">
              <h1 className="text-xl font-black tracking-[0.3em] text-cyan-400 uppercase">Orion</h1>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow"></div>
            </header>

            {/* Responsive Navigation */}
            <Navigation />

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden bg-void pb-16 md:pb-0">
              {children}
            </main>
            
          </div>
        </LocationProvider>
      </body>
    </html>
  );
}