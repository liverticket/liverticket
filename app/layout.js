import "@/styles/globals.css";
import "@/styles/navbar.css";
import "@/styles/buttons.css";
import "@/styles/home.css";
import "@/styles/auth.css";
import "@/styles/create-event.css";
import "@/styles/tickets.css";
import "@/styles/admin.css";
import "@/styles/checkout.css";
import "@/styles/profile.css";
import "@/styles/event-detail.css";
import "@/styles/responsive.css";
import "@/styles/my-events.css";


export const metadata = {
  title: {
    default: "LiverTicket",
    template: "%s | LiverTicket",
  },
  description:
    "Compra entradas para conciertos, festivales, tributos, fiestas y eventos en Chile. LiverTicket: compra, entra, vive.",
  keywords: [
    "LiverTicket",
    "entradas eventos Chile",
    "comprar entradas",
    "ticketera Chile",
    "eventos Talca",
    "conciertos Chile",
    "festivales Chile",
  ],
  authors: [{ name: "LiverTicket" }],
  creator: "LiverTicket",
  publisher: "LiverTicket",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "LiverTicket",
    description:
      "Compra entradas para conciertos, festivales, tributos, fiestas y eventos en Chile.",
    url: "https://liverticket.cl",
    siteName: "LiverTicket",
    locale: "es_CL",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}