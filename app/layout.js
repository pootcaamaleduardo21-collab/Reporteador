import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400","500","600","700","800"],
});

export const metadata = {
  title: "Reporteador Ads",
  description: "Dashboard de Meta Ads para traffickers y agencias",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
