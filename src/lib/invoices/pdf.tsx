import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import type { InvoiceSnapshot } from "@/lib/invoices";
import { getSiteUrl } from "@/lib/site";

const NAVY = "#01264e";
const INK = "#101828";
const MUTED = "#5b6472";
const LINE = "#e2e8f0";
const PALE = "#f4f7fb";

export const SINGLE_PAGE_ITEM_LIMIT = 12;
const ITEMS_PER_PAGE = SINGLE_PAGE_ITEM_LIMIT;

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 34,
    paddingHorizontal: 40,
    fontSize: 9,
    color: INK,
    fontFamily: "Helvetica",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandBlock: { maxWidth: "58%" },
  brandName: { fontSize: 16, fontWeight: "bold" as const, color: NAVY },
  brandLine: { marginTop: 2, fontSize: 8, color: MUTED },
  titleBlock: { maxWidth: "40%", textAlign: "right" as const },
  documentTitle: { fontSize: 22, fontWeight: "bold" as const, color: NAVY, letterSpacing: 1 },
  titleLine: { marginTop: 3, fontSize: 8.5, color: INK },
  divider: { marginTop: 12, marginBottom: 12, borderBottomWidth: 0.7, borderBottomColor: LINE },
  infoRow: { flexDirection: "row", gap: 22 },
  infoBlock: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: "bold" as const,
    color: NAVY,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  infoName: { fontSize: 10, fontWeight: "bold" as const, color: INK },
  infoText: { marginTop: 1.5, fontSize: 8.5, color: MUTED, lineHeight: 1.35 },
  table: { marginTop: 14, borderWidth: 0.6, borderColor: LINE },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PALE,
    borderBottomWidth: 0.6,
    borderBottomColor: LINE,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderText: { fontSize: 7.5, fontWeight: "bold" as const, color: NAVY, letterSpacing: 0.4 },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    minHeight: 22,
  },
  rowLast: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 22,
  },
  colItem: { width: "46%" },
  colQty: { width: "8%", textAlign: "center" as const },
  colUnit: { width: "22%", textAlign: "right" as const },
  colTotal: { width: "24%", textAlign: "right" as const },
  itemName: { fontSize: 8.8, fontWeight: "bold" as const, color: INK },
  itemMeta: { marginTop: 1, fontSize: 7.2, color: MUTED },
  cell: { fontSize: 8.8, color: INK },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 26 },
  totalsBlock: { flex: 1 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalLabel: { fontSize: 8.5, color: MUTED },
  totalValue: { fontSize: 8.5, color: INK },
  grandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 0.7,
    borderTopColor: LINE,
  },
  grandLabel: { fontSize: 9.5, fontWeight: "bold" as const, color: INK },
  grandValue: { fontSize: 9.5, fontWeight: "bold" as const, color: INK },
  dueLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingVertical: 4, backgroundColor: PALE, paddingHorizontal: 5 },
  dueLabel: { fontSize: 8.5, fontWeight: "bold" as const, color: NAVY },
  dueValue: { fontSize: 8.5, fontWeight: "bold" as const, color: NAVY },
  deliveryBlock: { width: 168, alignItems: "center" },
  qr: { width: 112, height: 112 },
  qrCaption: { marginTop: 3, fontSize: 7.5, color: MUTED, textAlign: "center" as const },
  pinBox: {
    marginTop: 7,
    borderWidth: 1,
    borderColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
    width: 150,
  },
  pinLabel: { fontSize: 6.5, color: MUTED, letterSpacing: 0.4, textTransform: "uppercase" as const },
  pinValue: { marginTop: 1, fontSize: 15, fontWeight: "bold" as const, color: NAVY, fontFamily: "Courier", letterSpacing: 2 },
  pinNote: { marginTop: 2, fontSize: 6.2, color: MUTED, textAlign: "center" as const, lineHeight: 1.3 },
  notesBlock: { marginTop: 14, paddingTop: 8, borderTopWidth: 0.6, borderTopColor: LINE },
  notesTitle: { fontSize: 7.5, fontWeight: "bold" as const, color: NAVY, letterSpacing: 0.6, textTransform: "uppercase" as const },
  notesText: { marginTop: 3, fontSize: 7.8, color: MUTED, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: MUTED,
  },
  paymentLine: { marginTop: 6, fontSize: 8, color: MUTED },
  slipTitle: { fontSize: 24, fontWeight: "bold" as const, color: NAVY, letterSpacing: 1 },
  slipSection: { marginTop: 14 },
  slipItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: LINE },
  slipItemText: { fontSize: 9, color: INK, width: "78%" },
  slipItemValue: { fontSize: 9, color: INK, textAlign: "right" as const, width: "22%" },
  slipTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 6, borderTopWidth: 0.8, borderTopColor: NAVY },
  slipTotalLabel: { fontSize: 10.5, fontWeight: "bold" as const, color: INK },
  slipTotalValue: { fontSize: 10.5, fontWeight: "bold" as const, color: INK },
  signature: { marginTop: 22, flexDirection: "row", gap: 24 },
  signatureLine: { flex: 1, borderTopWidth: 0.6, borderTopColor: MUTED, paddingTop: 4, fontSize: 7.5, color: MUTED },
});

export type InvoicePdfInput = {
  snapshot: InvoiceSnapshot;
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date;
  revision?: number;
  deliveryToken?: string;
  pin?: string;
  slipSize?: "A5" | "A4";
  currencySymbol?: string;
  decimals?: number;
};

function formatMoney(value: number, symbol: string, decimals: number): string {
  const amount = Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${amount}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function chunkItems<T>(items: T[], size: number): T[][] {
  if (!items.length) return [[]];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function qrDataUrl(url: string, width = 320): Promise<string | null> {
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, { margin: 1, width, errorCorrectionLevel: "M" });
  } catch {
    return null;
  }
}

function addressLines(snapshot: InvoiceSnapshot): string[] {
  return [
    snapshot.delivery.line1,
    [snapshot.delivery.sector, snapshot.delivery.district, snapshot.delivery.city].filter(Boolean).join(", "),
    snapshot.delivery.landmark ? `Landmark: ${snapshot.delivery.landmark}` : "",
  ].filter(Boolean);
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const {
    snapshot,
    invoiceNumber,
    orderNumber,
    issuedAt,
    revision = 1,
    deliveryToken,
    pin,
    currencySymbol = "$",
    decimals = 2,
  } = input;

  const siteUrl = getSiteUrl();
  const deliveryUrl = deliveryToken ? `${siteUrl}/delivery/${deliveryToken}` : "";
  const qr = await qrDataUrl(deliveryUrl);
  const pages = chunkItems(snapshot.items, ITEMS_PER_PAGE);
  const amountDue = snapshot.totals.amountDue > 0 ? snapshot.totals.amountDue : 0;
  const money = (value: number) => formatMoney(value, currencySymbol, decimals);

  const document = (
    <Document title={`Invoice ${invoiceNumber}`} author={snapshot.seller.businessName}>
      {pages.map((items, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            <View style={styles.headerRow}>
              <View style={styles.brandBlock}>
                <Text style={styles.brandName}>{snapshot.seller.businessName || "Invoice"}</Text>
                {snapshot.seller.address ? <Text style={styles.brandLine}>{snapshot.seller.address}</Text> : null}
                {snapshot.seller.phone || snapshot.seller.email ? (
                  <Text style={styles.brandLine}>
                    {[snapshot.seller.phone, snapshot.seller.email].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                {snapshot.seller.tin ? <Text style={styles.brandLine}>TIN: {snapshot.seller.tin}</Text> : null}
              </View>
              <View style={styles.titleBlock}>
                <Text style={styles.documentTitle}>INVOICE</Text>
                <Text style={styles.titleLine}>{invoiceNumber}</Text>
                <Text style={styles.titleLine}>Order {orderNumber}</Text>
                <Text style={styles.titleLine}>Issued {formatDate(issuedAt)}</Text>
                {revision > 1 ? <Text style={styles.titleLine}>Revision {revision}</Text> : null}
              </View>
            </View>
            <View style={styles.divider} />

            {pageIndex === 0 ? (
              <View style={styles.infoRow}>
                <View style={styles.infoBlock}>
                  <Text style={styles.sectionLabel}>Billed to</Text>
                  <Text style={styles.infoName}>{snapshot.customer.name}</Text>
                  {snapshot.customer.phone ? <Text style={styles.infoText}>{snapshot.customer.phone}</Text> : null}
                  {snapshot.customer.email ? <Text style={styles.infoText}>{snapshot.customer.email}</Text> : null}
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.sectionLabel}>Deliver to</Text>
                  <Text style={styles.infoName}>{addressLines(snapshot)[0] ?? "—"}</Text>
                  {addressLines(snapshot)
                    .slice(1)
                    .map((line) => (
                      <Text key={line} style={styles.infoText}>
                        {line}
                      </Text>
                    ))}
                </View>
              </View>
            ) : null}

            <View style={styles.table}>
              <View style={styles.tableHeader} fixed>
                <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit price</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Line total</Text>
              </View>
              {items.map((item, index) => {
                const isLastRow = index === items.length - 1;
                const meta = [item.variantSku, item.options.join(", ")].filter(Boolean).join(" · ");
                return (
                  <View key={`${item.productId}-${index}`} style={isLastRow ? styles.rowLast : styles.row}>
                    <View style={styles.colItem}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
                      {item.campaignName ? <Text style={styles.itemMeta}>Offer: {item.campaignName}</Text> : null}
                    </View>
                    <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.cell, styles.colUnit]}>{money(item.unitPrice)}</Text>
                    <Text style={[styles.cell, styles.colTotal]}>{money(item.lineTotal)}</Text>
                  </View>
                );
              })}
              {!items.length ? (
                <View style={styles.rowLast}>
                  <Text style={styles.itemMeta}>No items.</Text>
                </View>
              ) : null}
            </View>

            {isLast ? (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.totalsBlock}>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>{money(snapshot.totals.subtotal)}</Text>
                    </View>
                    {snapshot.totals.campaignDiscount > 0 ? (
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Campaign discount</Text>
                        <Text style={styles.totalValue}>-{money(snapshot.totals.campaignDiscount)}</Text>
                      </View>
                    ) : null}
                    {snapshot.totals.couponDiscount > 0 ? (
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Coupon discount</Text>
                        <Text style={styles.totalValue}>-{money(snapshot.totals.couponDiscount)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>Delivery fee</Text>
                      <Text style={styles.totalValue}>{money(snapshot.totals.deliveryFee)}</Text>
                    </View>
                    <View style={styles.grandLine}>
                      <Text style={styles.grandLabel}>Total</Text>
                      <Text style={styles.grandValue}>{money(snapshot.totals.total)}</Text>
                    </View>
                    <View style={styles.dueLine}>
                      <Text style={styles.dueLabel}>Amount due</Text>
                      <Text style={styles.dueValue}>{money(amountDue)}</Text>
                    </View>
                    <Text style={styles.paymentLine}>
                      Payment: {snapshot.payment.method ? snapshot.payment.method.replaceAll("_", " ") : "Not set"} · {snapshot.payment.status || "unpaid"}
                    </Text>
                    {snapshot.seller.pricesIncludeVat && snapshot.seller.vatRate > 0 ? (
                      <Text style={styles.paymentLine}>Prices include VAT at {snapshot.seller.vatRate}%.</Text>
                    ) : null}
                  </View>
                  {deliveryToken ? (
                    <View style={styles.deliveryBlock}>
                      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt prop */}
                      {qr ? <Image src={qr} style={styles.qr} /> : null}
                      <Text style={styles.qrCaption}>Scan on delivery</Text>
                      {pin ? (
                        <View style={styles.pinBox}>
                          <Text style={styles.pinLabel}>Delivery code</Text>
                          <Text style={styles.pinValue}>{pin}</Text>
                          <Text style={styles.pinNote}>Give this code to the delivery agent only when you receive your items.</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View style={styles.notesBlock}>
                  {snapshot.notes ? (
                    <>
                      <Text style={styles.notesTitle}>Notes</Text>
                      <Text style={styles.notesText}>{snapshot.notes}</Text>
                    </>
                  ) : null}
                  {snapshot.delivery.notes ? (
                    <>
                      <Text style={[styles.notesTitle, { marginTop: 6 }]}>Delivery notes</Text>
                      <Text style={styles.notesText}>{snapshot.delivery.notes}</Text>
                    </>
                  ) : null}
                  {snapshot.terms ? (
                    <>
                      <Text style={[styles.notesTitle, { marginTop: 6 }]}>Terms</Text>
                      <Text style={styles.notesText}>{snapshot.terms}</Text>
                    </>
                  ) : null}
                </View>
              </>
            ) : null}

            <View style={styles.footer} fixed>
              <Text>
                {snapshot.seller.businessName} · {invoiceNumber}
              </Text>
              <Text>
                Page {pageIndex + 1} of {pages.length}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );

  return renderToBuffer(document);
}

export async function generateDeliverySlipPdf(input: InvoicePdfInput): Promise<Buffer> {
  const {
    snapshot,
    invoiceNumber,
    orderNumber,
    issuedAt,
    deliveryToken,
    slipSize = "A5",
    currencySymbol = "$",
    decimals = 0,
  } = input;
  const qr = deliveryToken ? await qrDataUrl(`${getSiteUrl()}/delivery/${deliveryToken}`) : null;
  const amountToCollect = snapshot.totals.amountDue;
  const money = (value: number) => formatMoney(value, currencySymbol, decimals);
  const parts = snapshot.customer.name.trim().split(/\s+/).filter(Boolean);
  const maskedName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]?.[0] ?? ""}.` : parts[0] ?? "";

  const document = (
    <Document title={`Delivery slip ${orderNumber}`} author={snapshot.seller.businessName}>
      <Page size={slipSize} style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.slipTitle}>DELIVERY SLIP</Text>
            <Text style={styles.brandLine}>Order {orderNumber}</Text>
            <Text style={styles.brandLine}>Invoice {invoiceNumber}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.brandName}>{snapshot.seller.businessName}</Text>
            {snapshot.seller.phone ? <Text style={styles.brandLine}>{snapshot.seller.phone}</Text> : null}
            <Text style={styles.brandLine}>{formatDate(issuedAt)}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <Text style={styles.infoName}>{maskedName}</Text>
            {snapshot.customer.phone ? <Text style={styles.infoText}>{snapshot.customer.phone}</Text> : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionLabel}>Delivery address</Text>
            {addressLines(snapshot).map((line) => (
              <Text key={line} style={styles.infoText}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.slipSection}>
          <Text style={styles.sectionLabel}>Items</Text>
          {snapshot.items.map((item, index) => (
            <View key={`${item.productId}-${index}`} style={styles.slipItem}>
              <Text style={styles.slipItemText}>
                {item.quantity} x {item.name}
                {item.options.length ? ` (${item.options.join(", ")})` : ""}
              </Text>
              <Text style={styles.slipItemValue}>{money(item.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.slipTotal}>
            <Text style={styles.slipTotalLabel}>Amount to collect</Text>
            <Text style={styles.slipTotalValue}>{money(amountToCollect)}</Text>
          </View>
        </View>

        <View style={[styles.infoRow, { marginTop: 18, alignItems: "flex-end" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Delivery confirmation</Text>
            <Text style={styles.infoText}>Ask the customer for the delivery code on their invoice, then scan the QR code.</Text>
            <View style={styles.signature}>
              <Text style={styles.signatureLine}>Delivered by</Text>
              <Text style={styles.signatureLine}>Received by</Text>
            </View>
          </View>
          {qr ? (
            <View style={{ width: 120, alignItems: "center" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt prop */}
              <Image src={qr} style={{ width: 92, height: 92 }} />
              <Text style={styles.qrCaption}>Scan on delivery</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>{snapshot.seller.businessName}</Text>
          <Text>{orderNumber}</Text>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
