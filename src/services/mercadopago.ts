import { AbstractPaymentProcessor, isPaymentProcessorError, PaymentProcessorContext, PaymentProcessorError, PaymentProcessorSessionResponse, PaymentSessionStatus } from "@medusajs/medusa";
import { EOL } from "os";

abstract class MercadoPagoService extends AbstractPaymentProcessor {
  static identifier: string = "mercadopago";

  protected buildError(
    message: string,
    e: PaymentProcessorError | Error
  ): PaymentProcessorError {
    return {
      error: message,
      code: "code" in e ? e.code : "",
      detail: isPaymentProcessorError(e)
        ? `${e.error}${EOL}${e.detail ?? ""}`
        : "detail" in e
          ? e.detail
          : e.message ?? "",
    }
  }

  async capturePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    try {
      throw new Error("Method not implemented.");
    } catch (e) {
      return this.buildError(
        "Error at Capture Payment",
        e
      );
    }
  }

  async authorizePayment(paymentSessionData: Record<string, unknown>, context: Record<string, unknown>): Promise<PaymentProcessorError | { status: PaymentSessionStatus; data: Record<string, unknown>; }> {
    try {
      throw new Error("Method not implemented.");
    } catch (e) {
      return this.buildError(
        "Error at Capture Payment",
        e
      );
    }
  }

  async cancelPayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async initiatePayment(context: PaymentProcessorContext): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
    throw new Error("Method not implemented.");
  }

  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus> {
    throw new Error("Method not implemented.");
  }

  async refundPayment(paymentSessionData: Record<string, unknown>, refundAmount: number): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async updatePayment(context: PaymentProcessorContext): Promise<void | PaymentProcessorError | PaymentProcessorSessionResponse> {
    throw new Error("Method not implemented.");
  }

  async updatePaymentData(sessionId: string, data: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }
}

export default MercadoPagoService;
