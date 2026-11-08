import { Inter, Hind_Siliguri, Manrope, DM_Sans, Poppins, Space_Grotesk, Playfair_Display } from "next/font/google";

// Every theme font is available; the active theme picks one through CSS variables.
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const bangla = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-bangla", display: "swap" });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", preload: false });
export const dmsans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap", preload: false });
export const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap", preload: false });
export const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap", preload: false });
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", preload: false });

export const fontVariables = [inter, bangla, manrope, dmsans, poppins, grotesk, playfair].map((f) => f.variable).join(" ");
