import { AbstractPaymentProcessor, Cart, CartService, isPaymentProcessorError, LineItem, PaymentProcessorContext, PaymentProcessorError, PaymentProcessorSessionResponse } from "@medusajs/medusa";
import { PaymentSessionStatus } from "@medusajs/types";
import { humanizeAmount } from "medusa-core-utils";
import MercadoPagoConfig, { Payment, Preference } from "mercadopago";
import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { PreferenceRequest, PreferenceResponse } from "mercadopago/dist/clients/preference/commonTypes";
import { PreferenceCreateData } from "mercadopago/dist/clients/preference/create/types";
import { EOL } from "os";

type MercadoPagoOptions = {
  public_key: string;
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

    console.log(options);
    this.options_ = {
      public_key: options.mercadopago_public_key,
      success_back_url: options.mercadopago_success_back_url,
      webhook_url: `${options.mercadopago_webhook_url}/mercadopago/hooks`,
    };
  
    console.log(this.options_);

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
    const { captured } = paymentSessionData.data as Record<string, unknown>;
    try {
      if (captured === true) {
        return paymentSessionData.data as Record<string, unknown>;
      }
    } catch (e) {
      return this.buildError(
        "Error capturing payment",
        e
      );
    }
  }

  async authorizePayment(paymentSessionData: Record<string, unknown>, context: Record<string, unknown>): Promise<PaymentProcessorError | { status: PaymentSessionStatus; data: Record<string, unknown>; }> {
    console.log("authorizePayment");
    console.log(paymentSessionData, context);
    let payment: PaymentResponse;
    try {
      //@ts-ignore
      payment = await this.retrievePayment({ id: context.id });

    } catch (e) {
      return this.buildError(
        "Error retrieving payment in authorize payment",
        e
      );
    }

    return {
      status: getStatus(payment.status),
      data: {
        ...paymentSessionData,
        id: context.id
      }
    }

  }

  async cancelPayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async initiatePayment(context: PaymentProcessorContext): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
    console.log("initiate payment v2");
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

    console.log(paymentIntent);

    return {
      session_data: {
        public_key: this.options_.public_key,
        preference_id: paymentIntent.id,
        payment_url: paymentIntent.init_point,
        payment_sandbox_url: paymentIntent.sandbox_init_point
      }
    };
  }

  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    console.log("delete payment");
    console.log(paymentSessionData);
    return {}
  }

  async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus> {
    console.log("getPaymentStatus");
    const { status } = paymentSessionData.data as Record<string, unknown>;
    console.log(paymentSessionData);
    return getStatus(status as string);
  }

  async refundPayment(paymentSessionData: Record<string, unknown>, refundAmount: number): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.");
  }

  async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown> | PaymentProcessorError> {
    try {
      const res = await this.payment_.get({ id: paymentSessionData.id as string });
      return {
        ...res
      }
    } catch (e) {
      return this.buildError(
        "Error retrieving payment data",
        e
      );
    }
  }

  async updatePayment(context: PaymentProcessorContext): Promise<void | PaymentProcessorError | PaymentProcessorSessionResponse> {
    console.log("updatePayment");
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

    console.log(paymentIntent);

    return {
      session_data: {
        public_key: this.options_.public_key,
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

function getStatus(status: string): PaymentSessionStatus {
  switch (status) {
    case "approved":
    case "authorized":
      return PaymentSessionStatus.AUTHORIZED;
    case "refunded":
    case "charged_back":
    case "cancelled":
      return PaymentSessionStatus.CANCELED;
    case "rejected":
      return PaymentSessionStatus.ERROR;
    case "pending":
    case "in_process":
    case "in_mediation":
      return PaymentSessionStatus.PENDING;
    default:
      return PaymentSessionStatus.PENDING;
  }
}

export default MercadoPagoService;
