"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      className="thermalPrintButton"
      onClick={() => window.print()}
    >
      Imprimir entrada
    </button>
  );
}
