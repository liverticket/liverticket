import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function ContactoPage() {
  return (
    <>
      <Navbar />

      <main className="section">
        <div className="container">
          <div className="sectionHeader">
            <h1>Contacto</h1>
            <p>
              ¿Tienes dudas sobre eventos, compras o quieres trabajar con nosotros?
              Escríbenos y te ayudamos.
            </p>
          </div>

          <div className="contactBox">
            <div className="contactCard">
              <h2>Soporte</h2>
              <p>Email: liverticket06@gmail.com </p>
              <p>WhatsApp: +56922551661  o +56948037611</p>
            </div>

            <div className="contactCard">
              <h2>Organizadores</h2>
              <p>¿Quieres publicar tu evento?</p>
              <p>Escríbenos y te ayudamos a vender tus entradas.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}