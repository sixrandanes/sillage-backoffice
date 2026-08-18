/**
 * Une facture d'abonnement Sillage.
 *
 * **Tout ce qui figure ici a été figé à l'émission** — tarif, remise, libellé d'offre, nom du
 * client. Une revalorisation de la grille ou un changement de raison sociale ne réécrivent pas une
 * pièce déjà émise, et c'est précisément quand quelque chose a changé qu'on vient la relire.
 *
 * `remainingAmount` et `status` sont **dérivés des règlements** côté serveur, jamais stockés.
 */
export interface Invoice {
  id: number;
  number: string;
  type: 'INVOICE' | 'CREDIT_NOTE';
  typeLabel: string;
  /** Le numéro de la facture que cet avoir corrige. */
  correctedInvoiceNumber: string | null;
  organizationId: number;
  clientName: string;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  offerCode: string | null;
  offerLabel: string | null;
  plan: string;
  billingPeriod: string;
  baseAmount: string;
  /** Le taux consenti. **Le motif n'y est pas** : il est interne, une facture part chez le client. */
  discountRate: string | null;
  discountAmount: string;
  netAmount: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  paidAmount: string;
  remainingAmount: string;
  status: 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'CREDIT_NOTE';
  /** L'empreinte : c'est elle qui rend une réécriture détectable, la numérotation ne dit qu'une suppression. */
  hash: string;
}

export type InvoicePaymentMethod = 'TRANSFER' | 'CARD_ONLINE' | 'CHEQUE' | 'CASH' | 'OTHER';

export const INVOICE_PAYMENT_METHODS: { value: InvoicePaymentMethod; label: string }[] = [
  { value: 'TRANSFER', label: 'Virement' },
  { value: 'CARD_ONLINE', label: 'Carte en ligne' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'OTHER', label: 'Autre' },
];
