import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { getSetting } from "@/lib/admin/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Solar Home System & Electronic collects, uses, shares and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

const LAST_UPDATED = "18 November 2026";

export default async function PrivacyPolicyPage() {
  const [general, contact] = await Promise.all([getSetting("general"), getSetting("contact")]);

  return (
    <LegalPage
      title="Privacy Policy"
      description={`How ${general.storeName} collects, uses and protects your personal information.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection title="1. Who we are">
        <p>
          {general.storeName} is responsible for the personal information described in this policy.
          Our contact details are shown in the footer of this website. This policy explains what we
          collect, why we collect it, how we use and share it, and the choices you have.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Account information:</strong> your name, email
            address, phone number, password (stored in hashed form) and account preferences.
          </li>
          <li>
            <strong className="font-medium text-ink">Order and delivery information:</strong> the
            recipient&apos;s name, phone number, delivery address, district, sector, order contents
            and delivery notes.
          </li>
          <li>
            <strong className="font-medium text-ink">Payment and transaction information:</strong>{" "}
            the payment method used, transaction references, amounts and payment status. We do not
            store full card numbers; card and mobile-money payments are handled by the relevant
            payment providers.
          </li>
          <li>
            <strong className="font-medium text-ink">Communications:</strong> messages you send us
            by email, phone, WhatsApp or through the website, including support requests, order
            notes and product reviews.
          </li>
          <li>
            <strong className="font-medium text-ink">Technical information:</strong> IP address,
            browser and device type, pages viewed, approximate location and cookie identifiers,
            collected for security, analytics and to keep the website working properly.
          </li>
          <li>
            <strong className="font-medium text-ink">Marketing preferences:</strong> whether you
            have chosen to receive promotional messages.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To process, confirm and deliver your orders, and to handle returns, refunds and warranty claims.</li>
          <li>To create and manage your account, and to provide customer support.</li>
          <li>To process payments, prevent fraud and protect the security of the website.</li>
          <li>To personalise your experience and improve our products, services and website.</li>
          <li>To send transactional messages about your orders, deliveries and account.</li>
          <li>To send promotional messages where you have consented or where the law otherwise permits, with an option to opt out.</li>
          <li>To analyse how the website is used and to measure the effectiveness of our marketing.</li>
          <li>To comply with legal, tax and regulatory obligations and to enforce our terms.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Legal bases for processing">
        <p>
          We process personal information where it is necessary to perform a contract with you
          (for example, to fulfil an order), where you have given consent (for example, for
          marketing), where we have a legal obligation, or where we have a legitimate interest such
          as securing the website, preventing fraud and improving our services.
        </p>
      </LegalSection>

      <LegalSection title="5. Sharing your information">
        <p>We may share personal information with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Delivery partners and couriers, so your order can be delivered.</li>
          <li>Payment providers and banks, to process payments and refunds.</li>
          <li>IT, hosting, email, messaging and analytics providers that support our operations.</li>
          <li>Installers or technicians where you ask us to arrange installation or after-sales support.</li>
          <li>Manufacturers or authorised service partners, where needed to process a warranty claim.</li>
          <li>Professional advisers, where necessary for legal, accounting or insurance purposes.</li>
          <li>Government authorities, courts or regulators where required by law or to protect our rights.</li>
          <li>A potential buyer or successor in connection with a sale or transfer of our business.</li>
        </ul>
        <p>
          We require service providers to protect personal information and use it only for the
          purposes for which it was shared. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies to keep the website working, remember your
          preferences, understand how the website is used and, where permitted, support marketing.
          Essential cookies are needed for core features such as your cart and account. You can
          control cookies through your browser settings; disabling some cookies may affect how the
          website works.
        </p>
      </LegalSection>

      <LegalSection title="7. How long we keep information">
        <p>
          We keep personal information only as long as necessary for the purposes described in this
          policy, including to complete orders, provide warranty support, resolve disputes, meet
          tax and accounting requirements, and comply with the law. When information is no longer
          needed, we delete it or anonymise it. Marketing preferences are kept until you opt out.
        </p>
      </LegalSection>

      <LegalSection title="8. How we protect information">
        <p>
          We use reasonable technical and organisational measures to protect personal information
          against unauthorised access, loss, misuse or alteration. These measures include access
          controls and appropriate safeguards for sensitive information. No method of transmission
          or storage is completely secure, so we cannot guarantee absolute security. If a breach
          affects your personal information, we will notify you and the relevant authorities where
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Subject to applicable law, you may have the right to access the personal information we
          hold about you, ask us to correct or delete it, restrict or object to certain processing,
          withdraw consent, or request a portable copy of your information.
        </p>
        <p>
          To exercise these rights, contact us using the details below. We may need to verify your
          identity before responding. You may also complain to Rwanda&apos;s data protection
          authority, the National Cyber Security Authority (NCSA), if you believe your personal
          information has not been handled lawfully.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          Our website and products are intended for adults. We do not knowingly collect personal
          information from children. If you believe a child has provided us with personal
          information, please contact us so we can remove it.
        </p>
      </LegalSection>

      <LegalSection title="11. International transfers">
        <p>
          Some of our service providers may process personal information outside Rwanda. Where this
          happens, we take reasonable steps to ensure the information receives an appropriate level
          of protection as required by applicable data protection law.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this policy from time to time. The updated version takes effect when it is
          published on this page, and the date at the top shows when it was last changed. Where a
          change is significant, we will take reasonable steps to bring it to your attention.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact us">
        <p>
          If you have questions about this policy or how your personal information is handled,
          contact us at{" "}
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
          . Our address is {contact.address}. You can also read our{" "}
          <Link href="/terms-and-conditions" className="text-brand-deep hover:underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
