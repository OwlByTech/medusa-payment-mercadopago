import { AbstractPaymentProcessor, Cart, CartService, isPaymentProcessorError, LineItem, PaymentProcessorContext, PaymentProcessorError, PaymentProcessorSessionResponse, PaymentSessionStatus } from "@medusajs/medusa";
import { humanizeAmount } from "medusa-core-utils";
import MercadoPagoConfig, { Payment, Preference } from "mercadopago";
import { PreferenceRequest, PreferenceResponse } from "mercadopago/dist/clients/preference/commonTypes";
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { EOL } from "os";

type MercadoPagoOptions = {
  success_back_url: string;
  webhook_url: string;
};

abstract class MercadoPagoService extends AbstractPaymentProcessor {
  static identifier: string = "mercadopago";
  protected readonly options_: MercadoPagoOptions;
  protected readonly preference_: Preference;
  protected readonly payment_: Payment;
  protected readonly cartService_: CartService;

  constructor(container, options) {
    super(container);

    this.cartService_ = container.cartService;

    this.options_ = {
      success_back_url: options.mercadopago_success_back_url,
      webhook_url: `${options.mercadopago_webhook_url}/mercadopago/hooks`,
    };

    const config = new MercadoPagoConfig({ accessToken: options.mercadopago_access_token });
    this.preference_ = new Preference(config);
    this.payment_ = new Payment(config);
  }

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
    const { resource_id } = context;
    const cart: Cart = await this.cartService_.retrieveWithTotals(resource_id);

    const preferenceData = this.parsePreference(cart, context);
    let paymentIntent: PreferenceResponse;

    try {
      paymentIntent = await this.preference_.create(preferenceData);
    } catch (e) {
      return this.buildError(
        "Trying create preference",
        e
      );
    }

    return {
      session_data: {
        preference_id: paymentIntent.id,
        payment_url: paymentIntent.init_point,
        payment_sandbox_url: paymentIntent.sandbox_init_point
      }
    };
  }

  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    return {}
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
    const { resource_id, paymentSessionData } = context;
    const preference_id: string = paymentSessionData.preference_id as string;

    if (!preference_id) {
      return this.buildError("Preference id is not passing.", new Error());
    }

    const cart: Cart = await this.cartService_.retrieveWithTotals(resource_id);

    const preferenceData = this.parsePreference(cart, context);
    let paymentIntent: PreferenceResponse;

    try {
      paymentIntent = await this.preference_.update({
        id: preference_id,
        updatePreferenceRequest: preferenceData.body,
        requestOptions: preferenceData.requestOptions
      });
    } catch (e) {
      return this.buildError(
        "Trying create preference",
        e
      );
    }

    return {
      session_data: {
        preference_id: paymentIntent.id,
        payment_url: paymentIntent.init_point,
        payment_sandbox_url: paymentIntent.sandbox_init_point
      }
    };
  }

  async updatePaymentData(sessionId: string, data: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  parsePreference(cart: Cart, context: PaymentProcessorContext): PreferenceCreateData {
    const { resource_id, customer, currency_code } = context;
    const items = cart.items.map((item) => {
      return {
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        description: item.description,
        currency_id: currency_code.toUpperCase(),
        unit_price: humanizeAmount(item.unit_price, currency_code)
      };
    });

    const preferenceData: PreferenceCreateData = {
      body: {
        items: items,
        payer: {
          name: customer.first_name,
          surname: customer.last_name,
          email: customer.email
        },
        notification_url: `${this.options_.webhook_url}`,
        external_reference: resource_id,
        back_urls: {
          success: `${this.options_.success_back_url}`,
        }
      }
    };

    return preferenceData;

  }
}

export default MercadoPagoService;
