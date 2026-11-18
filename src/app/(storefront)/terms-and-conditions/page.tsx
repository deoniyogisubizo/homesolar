import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { getSetting } from "@/lib/admin/settings";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms and conditions that apply when you browse or order from Solar Home System & Electronic.",
  alternates: { canonical: "/terms-and-conditions" },
};

const LAST_UPDATED = "18 November 2026";

export default async function TermsAndConditionsPage() {
  const [general, contact] = await Promise.all([getSetting("general"), getSetting("contact")]);

  return (
    <LegalPage
      title="Terms & Conditions"
      description={`These terms govern your use of the ${general.storeName} website and any order you place with us.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection title="1. About us">
        <p>
          {general.storeName} supplies solar panels, inverters, batteries, lighting, water-heating
          systems and related accessories in Rwanda. Our contact details are shown in the footer of
          this website.
        </p>
      </LegalSection>

      <LegalSection title="2. Using this website">
        <p>
          By browsing this website or placing an order, you agree to these Terms &amp; Conditions. If
          you do not agree, please do not use the website or place an order.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>You may use this website for lawful, personal shopping purposes.</li>
          <li>
            You must not attempt to gain unauthorised access to the website, interfere with its
            security, copy its content at scale, or use it in a way that could harm us or other
            users.
          </li>
          <li>
            We may update, suspend or withdraw parts of the website at any time. We try to keep
            product information accurate, but images, colours and packaging may differ slightly
            from the delivered product.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Products, specifications and availability">
        <p>
          All products are subject to availability and confirmation of your order. We may limit the
          quantity of products available to a single customer or order.
        </p>
        <p>
          We try to describe products, specifications and prices accurately. Manufacturer
          specifications, packaging and availability can change without notice. If we discover an
          error before accepting your order, we may correct it or cancel the order and refund any
          amount already paid.
        </p>
        <p>
          Solar and electrical products must be installed by a qualified, licensed electrician in
          accordance with the manufacturer&apos;s instructions and applicable Rwandan regulations.
        </p>
      </LegalSection>

      <LegalSection title="4. Prices and payment">
        <p>
          Prices are shown in the currency selected in the store. Payments are processed in Rwandan
          Francs (RWF) unless stated otherwise at checkout. Converted prices are indicative and may
          vary with exchange rates.
        </p>
        <p>
          We may change prices at any time, but the price shown at checkout applies when you place
          your order, subject to correction of obvious errors. We accept the payment methods shown
          at checkout. An order is not accepted until payment is authorised, where applicable, and
          we confirm the order.
        </p>
        <p>
          We may refuse or cancel an order if payment is not authorised, stock is unavailable, a
          price or product description contains an error, or we reasonably suspect fraud or misuse.
          If we cancel an order after payment, we will refund the amount paid.
        </p>
      </LegalSection>

      <LegalSection title="5. Orders and order confirmation">
        <p>
          Placing an order is an offer to buy the products in that order. We accept the order when
          we send an order confirmation or deliver the products, whichever happens first.
        </p>
        <p>
          Please provide accurate contact, delivery and payment details. We are not responsible for
          delays or failed deliveries caused by incorrect or incomplete information. Check your
          order summary carefully before submitting it.
        </p>
      </LegalSection>

      <LegalSection title="6. Delivery">
        <p>
          Delivery areas, estimated times and charges are shown at checkout or agreed with you by
          phone or WhatsApp. Delivery estimates depend on your location and product availability.
          We aim to meet these estimates but cannot guarantee them, and delays outside our
          reasonable control do not entitle you to compensation.
        </p>
        <p>
          Risk in the products passes to you when they are delivered. Please inspect your order on
          arrival and report any visible damage or missing items promptly. If you are unavailable to
          receive a delivery, the courier may contact you to arrange another attempt; an additional
          delivery fee may apply.
        </p>
      </LegalSection>

      <LegalSection title="7. Returns, refunds and warranty">
        <p>
          If a product is damaged, incorrect or not as described, contact us within 30 days of
          delivery. Products must be unused, in their original packaging and accompanied by proof
          of purchase. We will inspect the product and, where appropriate, arrange a replacement,
          repair or refund.
        </p>
        <p>
          Faulty products are covered by the manufacturer&apos;s warranty. We will help you submit a
          warranty claim. Warranty cover does not apply to damage caused by misuse, incorrect
          installation, unauthorised repair, normal wear and tear, or use contrary to the
          manufacturer&apos;s instructions.
        </p>
        <p>
          Refunds are issued through the original payment method or as store credit where
          appropriate, after the returned product has been inspected. Nothing in these terms limits
          any rights you have under Rwandan consumer protection law.
        </p>
      </LegalSection>

      <LegalSection title="8. Installation and safety">
        <p>
          Solar panels, inverters, batteries and electrical accessories must be installed and
          commissioned by a qualified, licensed professional in accordance with the
          manufacturer&apos;s instructions and local safety regulations. Do not attempt unsafe
          do-it-yourself installation.
        </p>
        <p>
          You are responsible for ensuring that your roof, mounting structure and electrical system
          are suitable for the products you purchase. To the extent permitted by law, we are not
          liable for injury, damage or loss caused by incorrect installation, modification, or use
          contrary to the product instructions.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual property">
        <p>
          The design, text, graphics, logos and photographs on this website are owned by or licensed
          to us and may not be copied, reproduced or used without our written permission. Product
          names and trademarks belong to their respective owners.
        </p>
      </LegalSection>

      <LegalSection title="10. Third-party links and services">
        <p>
          This website may link to third-party websites or use third-party services. We do not
          control those websites and are not responsible for their content, availability or privacy
          practices. Their terms and policies apply when you use them.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental or
          consequential losses, including loss of profit, data, goodwill or business opportunity,
          arising from your use of this website or our products.
        </p>
        <p>
          Nothing in these terms excludes or limits our liability for fraud, death or personal
          injury caused by our negligence, or any other liability that cannot be excluded or limited
          under the laws of Rwanda.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to these terms">
        <p>
          We may update these terms from time to time. The updated version takes effect when it is
          published on this page, and the date at the top shows when it was last changed. Your
          continued use of the website after an update means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law and disputes">
        <p>
          These terms are governed by the laws of the Republic of Rwanda. If you have a complaint,
          please contact us first so we can try to resolve it amicably. If we cannot resolve the
          matter together, the courts of Rwanda will have jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact us">
        <p>
          If you have questions about these terms or an order, contact us at{" "}
          <a href={`mailto:${contact.supportEmail}`} className="text-brand-deep hover:underline">
            {contact.supportEmail}
          </a>{" "}
          or{" "}
          <a
            href={`tel:${contact.primaryPhone.replace(/\s/g, "")}`}
            className="text-brand-deep hover:underline"
          >
            {contact.primaryPhone}
          </a>
          . Our address is {contact.address}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
