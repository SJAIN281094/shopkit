import { Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { findState, formatIndianPhone, formatInr } from '@shopkit/commerce';
import { Order, OrderStatus, Shop } from '../../entities';
import { invoiceLines } from './order-pricing';

function esc(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const money = (paise: number) => esc(formatInr(paise));
const dateIn = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date);

/** Printable invoice, opened with the order's private access token. */
@Controller('orders')
export class InvoiceController {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
  ) {}

  @Get(':id/invoice')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src https: http: data:; script-src 'unsafe-inline'")
  async invoice(@Param('id', ParseUUIDPipe) id: string, @Query('token') token?: string): Promise<string> {
    const order = token ? await this.orders.findOne({ where: { id, accessToken: token } }) : null;
    if (!order || !order.invoiceNumber || order.status === OrderStatus.PENDING_PAYMENT) {
      throw new NotFoundException('Invoice not found');
    }
    const shop = await this.shops.findOneOrFail({ where: { id: order.shopId } });
    return renderInvoice(shop, order);
  }
}

function renderInvoice(shop: Shop, order: Order): string {
  // Whether GST applied is decided when the order is placed, not by today's settings.
  const lines = order.tax ? invoiceLines(shop, order) : null;
  const registered = !!lines;
  const sameState = order.shippingAddress.stateCode === shop.stateCode;
  const a = order.shippingAddress;
  const sellerState = findState(shop.stateCode);

  const taxHeaders = !registered
    ? ''
    : sameState
      ? '<th class="r">CGST</th><th class="r">SGST</th>'
      : '<th class="r">IGST</th>';

  const rows = registered
    ? lines
        .map(
          (l) => `<tr>
            <td>${esc(l.label)}</td><td>${esc(l.hsnCode ?? '')}</td><td class="r">${l.quantity}</td>
            <td class="r">${money(l.taxable)}</td><td class="r">${l.gstRate}%</td>
            ${sameState ? `<td class="r">${money(l.cgst)}</td><td class="r">${money(l.sgst)}</td>` : `<td class="r">${money(l.igst)}</td>`}
            <td class="r">${money(l.total)}</td></tr>`,
        )
        .join('')
    : [
        ...order.items.map(
          (i) => `<tr><td>${esc(i.variantTitle ? `${i.title} (${i.variantTitle})` : i.title)}</td>
            <td class="r">${i.quantity}</td><td class="r">${money(i.unitPrice)}</td><td class="r">${money(i.lineTotal)}</td></tr>`,
        ),
        order.shippingFee > 0
          ? `<tr><td>Shipping</td><td class="r">1</td><td class="r">${money(order.shippingFee)}</td><td class="r">${money(order.shippingFee)}</td></tr>`
          : '',
      ].join('');

  const head = registered
    ? `<tr><th>Item</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Taxable value</th><th class="r">GST</th>${taxHeaders}<th class="r">Total</th></tr>`
    : '<tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>';

  const tax = order.tax;
  const taxTotals =
    registered && tax
      ? `<tr><td>Taxable value</td><td class="r">${money(tax.taxable)}</td></tr>
         ${sameState
           ? `<tr><td>CGST</td><td class="r">${money(tax.cgst)}</td></tr><tr><td>SGST</td><td class="r">${money(tax.sgst)}</td></tr>`
           : `<tr><td>IGST</td><td class="r">${money(tax.igst)}</td></tr>`}`
      : '';

  const title = registered ? 'Tax invoice' : 'Invoice';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} ${esc(order.invoiceNumber)} — ${esc(shop.name)}</title>
<style>
  *{box-sizing:border-box} body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;margin:0;background:#f4f4f5}
  .page{max-width:820px;margin:24px auto;background:#fff;padding:40px;border-radius:8px}
  h1{font-size:22px;margin:0} .muted{color:#71717a} .r{text-align:right}
  .top{display:flex;justify-content:space-between;gap:24px;margin-bottom:28px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#71717a;margin-bottom:4px}
  table{width:100%;border-collapse:collapse} th,td{padding:8px 6px;border-bottom:1px solid #e4e4e7;vertical-align:top}
  th{font-size:12px;text-align:left;color:#52525b;background:#fafafa}
  .totals{margin-left:auto;width:300px;margin-top:16px} .totals td{border:none;padding:4px 6px}
  .grand td{font-weight:700;font-size:16px;border-top:2px solid #18181b}
  .print{position:fixed;right:24px;bottom:24px;background:#18181b;color:#fff;border:0;border-radius:6px;padding:10px 16px;font:inherit;cursor:pointer}
  @media print{body{background:#fff}.page{margin:0;padding:0}.print{display:none}}
</style></head><body>
<div class="page">
  <div class="top">
    <div>
      <h1>${esc(shop.legalName || shop.name)}</h1>
      ${shop.businessAddress ? `<div class="muted">${esc(shop.businessAddress)}</div>` : ''}
      ${sellerState ? `<div class="muted">State: ${esc(sellerState.name)} (${esc(sellerState.code)})</div>` : ''}
      ${shop.gstin ? `<div>GSTIN: <strong>${esc(shop.gstin)}</strong></div>` : ''}
    </div>
    <div class="r">
      <h1>${esc(title)}</h1>
      <div>No. <strong>${esc(order.invoiceNumber)}</strong></div>
      <div class="muted">Date: ${esc(dateIn(order.paidAt ?? order.createdAt))}</div>
      <div class="muted">Order #${order.number}</div>
    </div>
  </div>
  <div class="cols">
    <div>
      <div class="label">Bill and ship to</div>
      <div><strong>${esc(order.customer.name)}</strong></div>
      <div>${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}</div>
      <div>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</div>
      <div class="muted">${esc(formatIndianPhone(order.customer.phone))}</div>
    </div>
    <div>
      <div class="label">Place of supply</div>
      <div>${esc(a.state)} (${esc(a.stateCode)})</div>
      <div class="label" style="margin-top:12px">Payment</div>
      <div>${order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'}${order.gatewayPaymentId ? ` · ${esc(order.gatewayPaymentId)}` : ''}</div>
    </div>
  </div>
  <table><thead>${head}</thead><tbody>${rows}</tbody></table>
  <table class="totals"><tbody>
    ${taxTotals}
    <tr class="grand"><td>Total</td><td class="r">${money(order.total)}</td></tr>
  </tbody></table>
  <p class="muted" style="margin-top:32px;font-size:12px">${
    registered ? 'Prices include GST. ' : ''
  }This is a computer-generated invoice and does not need a signature.</p>
</div>
<button class="print" onclick="window.print()">Print or save as PDF</button>
</body></html>`;
}
