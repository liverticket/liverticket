import QRCode from "qrcode";

export async function generateQrDataUrl(text) {
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 2,
  });
}