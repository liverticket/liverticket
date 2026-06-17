import {
  WebpayPlus,
  Options,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
} from "transbank-sdk";

const env = process.env.TRANSBANK_ENV || "integration";

export function getWebpayTx() {
  const isProduction = env === "production";

  const commerceCode = isProduction
    ? process.env.TRANSBANK_COMMERCE_CODE
    : process.env.TRANSBANK_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;

  const apiKey = isProduction
    ? process.env.TRANSBANK_API_KEY
    : process.env.TRANSBANK_API_KEY || IntegrationApiKeys.WEBPAY;

  const endpoint = isProduction
    ? "https://webpay3g.transbank.cl"
    : "https://webpay3gint.transbank.cl";

  if (isProduction && (!commerceCode || !apiKey)) {
    throw new Error("Faltan credenciales productivas de Transbank.");
  }

  return new WebpayPlus.Transaction(
    new Options(commerceCode, apiKey, endpoint)
  );
}