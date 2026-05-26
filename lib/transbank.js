import { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes } from "transbank-sdk";

const env = process.env.TRANSBANK_ENV || "integration";

export function getWebpayTx() {
  if (env === "production") {
    return new WebpayPlus.Transaction(
      new Options(
        process.env.TRANSBANK_COMMERCE_CODE,
        process.env.TRANSBANK_API_KEY,
        "https://webpay3g.transbank.cl"
      )
    );
  }

  return new WebpayPlus.Transaction(
    new Options(
      process.env.TRANSBANK_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS,
      process.env.TRANSBANK_API_KEY || IntegrationApiKeys.WEBPAY,
      "https://webpay3gint.transbank.cl"
    )
  );
}