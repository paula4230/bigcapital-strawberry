import { Inject, Service } from 'typedi';
import { difference } from 'lodash';
import { ServiceError } from "@/exceptions";
import TenancyService from '@/services/Tenancy/TenancyService';
import { 
  IContact,
  IContactNewDTO,
  IContactEditDTO,
 } from "@/interfaces";

type TContactService = 'customer' | 'vendor';

@Service()
export default class ContactsService {
  @Inject()
  tenancy: TenancyService;

  @Inject('logger')
  logger: any;

  /**
   * Get the given contact or throw not found contact.
   * @param {number} tenantId 
   * @param {number} contactId 
   * @param {TContactService} contactService
   * @return {Promise<IContact>}
   */
  private async getContactByIdOrThrowError(tenantId: number, contactId: number, contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);

    this.logger.info('[contact] trying to validate contact existance.', { tenantId, contactId });
    const contact = await Contact.query().findById(contactId).where('contact_service', contactService);

    if (!contact) {
      throw new ServiceError('contact_not_found');
    }
    return contact;
  }

  /**
   * Creates a new contact on the storage.
   * @param {number} tenantId 
   * @param {TContactService} contactService
   * @param {IContactDTO} contactDTO 
   */
  async newContact(tenantId: number, contactDTO: IContactNewDTO, contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);

    this.logger.info('[contacts] trying to insert contact to the storage.', { tenantId, contactDTO });
    const contact = await Contact.query().insert({ contactService, ...contactDTO });

    this.logger.info('[contacts] contact inserted successfully.', { tenantId, contact });
    return contact;
  }

  /**
   * Edit details of the given on the storage.
   * @param {number} tenantId 
   * @param {number} contactId 
   * @param {TContactService} contactService
   * @param {IContactDTO} contactDTO 
   */
  async editContact(tenantId: number, contactId: number, contactDTO: IContactEditDTO, contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);
    const contact = await this.getContactByIdOrThrowError(tenantId, contactId, contactService);

    this.logger.info('[contacts] trying to edit the given contact details.', { tenantId, contactId, contactDTO });
    await Contact.query().findById(contactId).patch({ ...contactDTO })
  }

  /**
   * Deletes the given contact from the storage.
   * @param {number} tenantId 
   * @param {number} contactId
   * @param {TContactService} contactService 
   * @return {Promise<void>}
   */
  async deleteContact(tenantId: number, contactId: number, contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);
    const contact = await this.getContactByIdOrThrowError(tenantId, contactId, contactService);

    this.logger.info('[contacts] trying to delete the given contact.', { tenantId, contactId });
    await Contact.query().findById(contactId).delete();
  }

  /**
   * Get contact details of the given contact id.
   * @param {number} tenantId 
   * @param {number} contactId 
   * @param {TContactService} contactService
   * @returns {Promise<IContact>}
   */
  async getContact(tenantId: number, contactId: number, contactService: TContactService) {
    return this.getContactByIdOrThrowError(tenantId, contactId, contactService);
  }

  /**
   * Retrieve contacts or throw not found error if one of ids were not found
   * on the storage.
   * @param {number} tenantId 
   * @param {number[]} contactsIds 
   * @param {TContactService} contactService
   * @return {Promise<IContact>}
   */
  async getContactsOrThrowErrorNotFound(tenantId: number, contactsIds: number[], contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);
    const contacts = await Contact.query().whereIn('id', contactsIds).where('contact_service', contactService);
    const storedContactsIds = contacts.map((contact: IContact) => contact.id);

    const notFoundCustomers = difference(contactsIds, storedContactsIds);

    if (notFoundCustomers.length > 0) {
      throw new ServiceError('contacts_not_found');
    }
    return contacts;
  }

  /**
   * Deletes the given contacts in bulk.
   * @param  {number} tenantId 
   * @param  {number[]} contactsIds 
   * @param  {TContactService} contactService
   * @return {Promise<void>}
   */
  async deleteBulkContacts(tenantId: number, contactsIds: number[], contactService: TContactService) {
    const { Contact } = this.tenancy.models(tenantId);
    this.getContactsOrThrowErrorNotFound(tenantId, contactsIds, contactService);

    await Contact.query().whereIn('id', contactsIds).delete();
  }
}