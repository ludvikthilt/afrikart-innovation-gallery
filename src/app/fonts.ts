import { Anton, Bodoni_Moda, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

// Titres et cartels (catalogue de musée)
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
});

// Textes courants
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jakarta",
  display: "swap",
});

// Étiquettes, numéros de salle, prix
export const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-grotesk",
  display: "swap",
});

// Nom de la galerie dans le logo (grotesque condensée, comme le logo)
export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});
