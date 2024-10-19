import { Inject, Service } from 'typedi';
import { ChromiumlyTenancy } from '@/services/ChromiumlyTenancy/ChromiumlyTenancy';
import { TemplateInjectable } from '@/services/TemplateInjectable/TemplateInjectable';
import { GetPaymentReceived } from './GetPaymentReceived';
import HasTenancyService from '@/services/Tenancy/TenancyService';
import { PaymentReceivedBrandingTemplate } from './PaymentReceivedBrandingTemplate';
import { transformPaymentReceivedToPdfTemplate } from './utils';
import { PaymentReceivedPdfTemplateAttributes } from '@/interfaces';
import events from '@/subscribers/events';
import { EventPublisher } from '@/lib/EventPublisher/EventPublisher';

@Service()
export default class GetPaymentReceivedPdf {
  @Inject()
  private tenancy: HasTenancyService;

  @Inject()
  private chromiumlyTenancy: ChromiumlyTenancy;

  @Inject()
  private templateInjectable: TemplateInjectable;

  @Inject()
  private getPaymentService: GetPaymentReceived;

  @Inject()
  private paymentBrandingTemplateService: PaymentReceivedBrandingTemplate;

  @Inject()
  private eventPublisher: EventPublisher;

  /**
   * Retrieve sale invoice pdf content.
   * @param {number} tenantId -
   * @param {IPaymentReceived} paymentReceive -
   * @returns {Promise<Buffer>}
   */
  async getPaymentReceivePdf(
    tenantId: number,
    paymentReceivedId: number
  ): Promise<[Buffer, string]> {
    const brandingAttributes = await this.getPaymentBrandingAttributes(
      tenantId,
      paymentReceivedId
    );
    const htmlContent = await this.templateInjectable.render(
      tenantId,
      'modules/payment-receive-standard',
      brandingAttributes
    );
    const filename = await this.getPaymentReceivedFilename(
      tenantId,
      paymentReceivedId
    );
    // Converts the given html content to pdf document.
    const content = await this.chromiumlyTenancy.convertHtmlContent(
      tenantId,
      htmlContent
    );
    const eventPayload = { tenantId, paymentReceivedId };

    // Triggers the `onCreditNotePdfViewed` event.
    await this.eventPublisher.emitAsync(
      events.paymentReceive.onPdfViewed,
      eventPayload
    );
    return [content, filename];
  }

  /**
   * Retrieves the filename of the given payment.
   * @param {number} tenantId
   * @param {number} paymentReceivedId
   * @returns {Promise<string>}
   */
  private async getPaymentReceivedFilename(
    tenantId: number,
    paymentReceivedId: number
  ): Promise<string> {
    const { PaymentReceive } = this.tenancy.models(tenantId);

    const payment = await PaymentReceive.query().findById(paymentReceivedId);

    return `Payment-${payment.paymentReceiveNo}`;
  }

  /**
   * Retrieves the given payment received branding attributes.
   * @param {number} tenantId
   * @param {number} paymentReceivedId
   * @returns {Promise<PaymentReceivedPdfTemplateAttributes>}
   */
  async getPaymentBrandingAttributes(
    tenantId: number,
    paymentReceivedId: number
  ): Promise<PaymentReceivedPdfTemplateAttributes> {
    const { PdfTemplate } = this.tenancy.models(tenantId);

    const paymentReceived = await this.getPaymentService.getPaymentReceive(
      tenantId,
      paymentReceivedId
    );
    const templateId =
      paymentReceived?.pdfTemplateId ??
      (
        await PdfTemplate.query().findOne({
          resource: 'PaymentReceive',
          default: true,
        })
      )?.id;

    const brandingTemplate =
      await this.paymentBrandingTemplateService.getPaymentReceivedPdfTemplate(
        tenantId,
        templateId
      );
    return {
      ...brandingTemplate.attributes,
      ...transformPaymentReceivedToPdfTemplate(paymentReceived),
    };
  }
}
