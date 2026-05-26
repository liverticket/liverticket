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


export const metadata = {
  title: "LiverTicket",
  description: "Compra. Entra. Vive.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}