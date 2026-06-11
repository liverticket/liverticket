"use client";

import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";

const CART_STORAGE_KEY = "liverticket_cart";

export default function WebpayRetornoPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function commitTransaction() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token_ws");
        const tbkToken = params.get("TBK_TOKEN");

        if (tbkToken) {
          setResult({
            success: false,
            title: "Pago cancelado",
            message: "El pago fue cancelado o rechazado antes de completarse.",
          });
          setLoading(false);
          return;
        }

        if (!token) {
          setResult({
            success: false,
            title: "Retorno inválido",
            message: "No recibimos el token de la transacción.",
          });
          setLoading(false);
          return;
        }

        const res = await fetch("/api/webpay/commit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.success) {
          localStorage.removeItem(CART_STORAGE_KEY);
          window.dispatchEvent(new Event("liverticket-cart-updated"));

          window.location.href = "/mis-tickets";
          return;
        }

        setResult(data);
      } catch (error) {
        console.error("WEBPAY_RETURN_PAGE_ERROR:", error);

        setResult({
          success: false,
          title: "Error",
          message: "Ocurrió un problema al confirmar el pago.",
        });
      } finally {
        setLoading(false);
      }
    }

    commitTransaction();
  }, []);

  return (
    <>
      <Navbar />

      <main className="section">
        <div className="container simpleBox">
          {loading ? (
            <>
              <h1>Confirmando pago...</h1>
              <p>Estamos validando tu transacción con Webpay.</p>
            </>
          ) : (
            <>
              <h1>{result?.title || "Resultado del pago"}</h1>
              <p>{result?.message || ""}</p>

              {result?.success && (
                <div style={{ marginTop: 20 }}>
                  <p>
                    <strong>Orden:</strong> {result.buyOrder}
                  </p>
                  <p>
                    <strong>Monto:</strong> $
                    {Number(result.amount || 0).toLocaleString("es-CL")}
                  </p>
                  <p>
                    <strong>Autorización:</strong> {result.authorizationCode}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}