import { CartService, MedusaRequest, MedusaResponse, OrderService, SwapService } from "@medusajs/medusa";
import { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import MercadoPagoService from "src/services/mercadopago";
import { EntityManager } from "typeorm";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const mercadoPagoService = req.scope.resolve<MercadoPagoService>('mercadopagoProviderService');

  const authorizeCart = async (req: MedusaRequest, cartId: string, notificationType: string, paymentId: number) => {
    const manager: EntityManager = req.scope.resolve("manager");
    const cartService: CartService = req.scope.resolve("cartService");
    const orderService: OrderService = req.scope.resolve("orderService");


    await manager.transaction(async (m) => {
      const cart = await cartService.withTransaction(m).retrieve(cartId);

      switch (cart.type) {
        // TODO: Implement swap
        default: {
          // NOTE: For now only support payment creation
          if (notificationType !== "payment.created") break;

          const order = await orderService
            .withTransaction(m)
            .retrieveByCartId(cartId)
            .catch((_) => undefined)

          if (!order) {
            await cartService
              .withTransaction(m)
              .setPaymentSession(cartId, "mercadopago")
            await cartService.withTransaction(m).authorizePayment(cartId, { id: paymentId })
            await orderService.withTransaction(m).createFromCart(cartId)
          }
          break
        }
      }
    });
  }

  console.log(req.body);
  switch (req.body.type) {
    case "payment":
      try {
        console.log("payment type switch");
        //TODO: Remove ts-ignore and create a flexble type of response to fix value types of Payment Response
        //@ts-ignore
        const payment: PaymentResponse = await mercadoPagoService.retrievePayment({ id: req.body.id });
        console.log("payment switch", payment);
        await authorizeCart(req, payment.external_reference, req.body.action, payment.id);
        res.sendStatus(200);
      } catch (e) {
        res.send(402);
      }
      break;
  }

  res.sendStatus(204);
};
