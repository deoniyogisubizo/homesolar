# WhatsApp templates

The storefront queues WhatsApp messages in the `messageoutboxes` collection and
sends them from `GET /api/cron/outbox`. Credentials are read only from
environment variables; nothing in this document is stored in the database.

## Required environment

| Variable | Purpose |
| --- | --- |
| `WHATSAPP_ENABLED` | `true` turns the outbox on. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number id that sends the messages. |
| `WHATSAPP_ACCESS_TOKEN` | Permanent access token for the phone number. |
| `WHATSAPP_GRAPH_VERSION` | Graph API version, for example `v18.0`. |
| `WHATSAPP_APP_SECRET` | Verifies `X-Hub-Signature-256` on the webhook. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Echoed during Meta webhook verification. |
| `CRON_SECRET` | Bearer token for `GET /api/cron/outbox`. |
| `INVOICE_SIGNING_SECRET` | HMAC key for delivery codes. Falls back to `APP_SECRET`. |

## Approval

Create and approve these templates in Meta Business Manager. Template names,
language codes and body variable positions are configured under
**Admin → Settings → Invoices and delivery → Message templates**.

All templates use a body component only. The storefront sends body parameters in
ascending position order. Empty positions are sent as a single space because
Meta rejects empty text parameters.

## `order_invoice_customer`

Suggested body:

```
Hello {{1}}, your order {{2}} from {{3}} is saved. Total {{4}}.
View the invoice: {{5}}
Questions? Call {{6}}.
```

Suggested mapping:

| Position | Variable |
| --- | --- |
| 1 | `customerName` |
| 2 | `orderNumber` |
| 3 | `storeName` |
| 4 | `total` |
| 5 | `invoiceUrl` |
| 6 | `primaryNumber` |

## `order_invoice_staff`

Suggested body:

```
New order {{1}} from {{2}} for {{3}}.
Invoice: {{4}}
```

Suggested mapping:

| Position | Variable |
| --- | --- |
| 1 | `orderNumber` |
| 2 | `customerName` |
| 3 | `total` |
| 4 | `invoiceUrl` |

## `order_delivered_customer`

Suggested body:

```
Hello {{1}}, order {{2}} from {{3}} was delivered.
Thank you for shopping with us.
```

Suggested mapping:

| Position | Variable |
| --- | --- |
| 1 | `customerName` |
| 2 | `orderNumber` |
| 3 | `storeName` |

## Delivery flow

1. Checkout saves the order and queues a customer template when the customer
   opted in and `autoSend.onPlacement` is on.
2. Staff recipients whose events include `new_order` get the staff template.
3. The checkout request processes the outbox with `after()`. A failed send is
   retried with exponential backoff by the cron route.
4. On delivery confirmation the customer receives the delivered template when
   `autoSend.onDelivery` is on.
5. Meta status callbacks update `deliveryStatus` on the outbox row through
   `POST /api/webhooks/whatsapp`.

## Cron

Call the route from a scheduler, for example every minute:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/outbox
```

The response contains `processed`, `sent` and `failed` counts. When credentials
are missing the route returns `skipped: true` and leaves queued rows untouched.

## Webhook

Meta calls `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...`
during setup and `POST /api/webhooks/whatsapp` for delivery statuses. Requests
with an invalid `X-Hub-Signature-256` are rejected.
