/** Generates invoice numbers in the format INV-YYYYMMDD-XXXX */
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${random}`;
}
