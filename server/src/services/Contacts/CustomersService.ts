import { Inject, Service } from 'typedi';
import { omit, difference } from 'lodash';
import JournalPoster from "@/services/Accounting/JournalPoster";
import JournalCommands from "@/services/Accounting/JournalCommands";
import ContactsService from '@/services/Contacts/ContactsService';
import { 
  ICustomerNewDTO,
  ICustomerEditDTO,
 } from '@/interfaces';
import { ServiceError } from '@/exceptions';
import TenancyService from '@/services/Tenancy/TenancyService';
import { ICustomer } from 'src/interfaces';

@Service()
export default class CustomersService {
  @Inject()
  contactService: ContactsService;

  @Inject()
  tenancy: TenancyService;

  /**
   * Converts customer to contact DTO.
   * @param {ICustomerNewDTO|ICustomerEditDTO} customerDTO 
   * @returns {IContactDTO}
   */
  customerToContactDTO(customerDTO: ICustomerNewDTO|ICustomerEditDTO) {
    return {
      ...omit(customerDTO, ['customerType']),
      contactType: customerDTO.customerType,
      active: (typeof customerDTO.active === 'undefined') ?
        true : customerDTO.active,
    };
  }

  /**
   * Creates a new customer.
   * @param {number} tenantId 
   * @param {ICustomerNewDTO} customerDTO 
   * @return {Promise<void>}
   */
  async newCustomer(tenantId: number, customerDTO: ICustomerNewDTO) {
    const contactDTO = this.customerToContactDTO(customerDTO)
    const customer = await this.contactService.newContact(tenantId, contactDTO, 'customer');

    // Writes the customer opening balance journal entries.
    if (customer.openingBalance) { 
      await this.writeCustomerOpeningBalanceJournal(
        tenantId,
        customer.id,
        customer.openingBalance,
      );
    }
    return customer;
  }

  /**
   * Edits details of the given customer.
   * @param {number} tenantId 
   * @param {ICustomerEditDTO} customerDTO 
   */
  async editCustomer(tenantId: number, customerId: number, customerDTO: ICustomerEditDTO) {
    const contactDTO = this.customerToContactDTO(customerDTO);
    return this.contactService.editContact(tenantId, customerId, contactDTO, 'customer');
  }

  /**
   * Deletes the given customer from the storage.
   * @param {number} tenantId 
   * @param {number} customerId 
   * @return {Promise<void>}
   */
  async deleteCustomer(tenantId: number, customerId: number) {
    await this.customerHasNoInvoicesOrThrowError(tenantId, customerId);
    return this.contactService.deleteContact(tenantId, customerId, 'customer');
  }

  /**
   * Retrieve the given customer details.
   * @param {number} tenantId 
   * @param {number} customerId 
   */
  async getCustomer(tenantId: number, customerId: number) {
    return this.contactService.getContact(tenantId, customerId, 'customer');
  }

  /**
   * Writes customer opening balance journal entries.
   * @param {number} tenantId 
   * @param {number} customerId 
   * @param {number} openingBalance 
   * @return {Promise<void>}
   */
  async writeCustomerOpeningBalanceJournal(
    tenantId: number,
    customerId: number,
    openingBalance: number,
  ) {
    const journal = new JournalPoster(tenantId);
    const journalCommands = new JournalCommands(journal);

    await journalCommands.customerOpeningBalance(customerId, openingBalance)

    await Promise.all([
      journal.saveBalance(),
      journal.saveEntries(),
    ]);
  }

  /**
   * Retrieve the given customers or throw error if one of them not found.
   * @param {numebr} tenantId 
   * @param {number[]} customersIds
   */
  getCustomersOrThrowErrorNotFound(tenantId: number, customersIds: number[]) {
    return this.contactService.getContactsOrThrowErrorNotFound(tenantId, customersIds, 'customer');
  }

  /**
   * Deletes the given customers from the storage.
   * @param {number} tenantId 
   * @param {number[]} customersIds 
   * @return {Promise<void>}
   */
  async deleteBulkCustomers(tenantId: number, customersIds: number[]) {
    const { Contact } = this.tenancy.models(tenantId);

    await this.getCustomersOrThrowErrorNotFound(tenantId, customersIds);
    await this.customersHaveNoInvoicesOrThrowError(tenantId, customersIds);

    await Contact.query().whereIn('id', customersIds).delete();
  }

  /**
   * Validates the customer has no associated sales invoice
   * or throw service error.
   * @param {number} tenantId 
   * @param {number} customerId 
   */
  async customerHasNoInvoicesOrThrowError(tenantId: number, customerId: number) {
    const { customerRepository } = this.tenancy.repositories(tenantId);
    const salesInvoice = await customerRepository.getSalesInvoices(customerId);

    if (salesInvoice.length > 0) {
      throw new ServiceError('customer_has_invoices');
    }
  }

  /**
   * Throws error in case one of customers have associated sales invoices.
   * @param  {number} tenantId 
   * @param  {number[]} customersIds 
   * @throws {ServiceError}
   */
  async customersHaveNoInvoicesOrThrowError(tenantId: number, customersIds: number[]) {
    const { customerRepository } = this.tenancy.repositories(tenantId);

    const customersWithInvoices = await customerRepository.customersWithSalesInvoices(
      customersIds,
    );
    const customersIdsWithInvoice = customersWithInvoices
      .filter((customer: ICustomer) => customer.salesInvoices.length > 0)
      .map((customer: ICustomer) => customer.id);

    const customersHaveInvoices = difference(customersIds, customersIdsWithInvoice);

    if (customersHaveInvoices.length > 0) {
      throw new ServiceError('some_customers_have_invoices');
    }
  }
}
