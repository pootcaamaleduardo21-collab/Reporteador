import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400","500","600","700","800"],
});

export const metadata = {
  title: "Kaan — Analytics para traffickers",
  description: "Toma decisiones con datos reales, no con intuición.",
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: "Kaan",
    description: "Toma decisiones con datos reales, no con intuición.",
    siteName: "Kaan",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={jakarta.variable}>{children}</body>
    </html>
  );
}
