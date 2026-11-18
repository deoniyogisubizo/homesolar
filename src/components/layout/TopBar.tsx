"use client";

import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import type { ContactSettings } from "@/lib/admin/settings-defaults";
import { buildWhatsAppLink, normalizePhone } from "@/lib/whatsapp-core";

interface TopBarProps {
  contact: ContactSettings;
  brandName: string;
}

export function TopBar({ contact, brandName }: TopBarProps) {
  const whatsappNumber = normalizePhone(contact.whatsappNumber);
  const whatsappLink = whatsappNumber
    ? buildWhatsAppLink(whatsappNumber, `Hello ${brandName}, I have a question.`)
    : null;
  const secondaryDisplay = contact.secondaryPhone
    ? contact.secondaryPhone.replace(/^(\+250)(\d{3})(\d{3})(\d{3})$/, "+$1 $2 $3 $4")
    : "";

  return (
    <div className="sticky top-0 z-50 bg-[#222] py-2 text-white text-[13px]">
      <div className="container-page flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          {contact.supportEmail && (
            <a
              href={`mailto:${contact.supportEmail}`}
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              <span>{contact.supportEmail}</span>
            </a>
          )}
          {contact.address && (
            <span className="flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4" strokeWidth={2} />
              <span>{contact.address}</span>
            </span>
          )}
          {contact.primaryPhone && (
            <a
              href={whatsappLink ?? `tel:${contact.primaryPhone.replace(/\s/g, "")}`}
              target={whatsappLink ? "_blank" : undefined}
              rel={whatsappLink ? "noreferrer" : undefined}
              className="flex items-center gap-2 text-white"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
              <span>{contact.primaryPhone}</span>
            </a>
          )}
          {contact.secondaryPhone && (
            <span className="flex items-center gap-2 text-white">
              <span className="text-white/60">/</span>
              <Phone className="h-4 w-4" strokeWidth={2} />
              <span>{secondaryDisplay}</span>
            </span>
          )}
        </div>
        {contact.workingHours && (
          <span className="flex items-center gap-2 text-white shrink-0">
            <span className="hidden sm:inline">{contact.workingHours}</span>
          </span>
        )}
      </div>
    </div>
  );
}