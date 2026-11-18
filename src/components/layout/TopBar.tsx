"use client";

import { Mail, MapPin } from "lucide-react";
import type { ContactSettings } from "@/lib/admin/settings-defaults";

interface TopBarProps {
  contact: ContactSettings;
  brandName: string;
}

export function TopBar({ contact, brandName }: TopBarProps) {
  const secondaryDisplay = contact.secondaryPhone
    ? contact.secondaryPhone.replace(/^(\+250)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")
    : "";

  return (
    <div className="sticky top-0 z-50 bg-[#222] py-2 text-white text-[13px]">
      <div className="container-page flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          {contact.supportEmail && (
            <a
              href={`mailto:${contact.supportEmail}`}
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{contact.supportEmail}</span>
            </a>
          )}
          {contact.address && (
            <span className="flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{contact.address}</span>
            </span>
          )}
        </div>

        {contact.workingHours && (
          <span className="flex items-center gap-2 text-white shrink-0">
            <span className="hidden sm:inline">{contact.workingHours}</span>
          </span>
        )}

        {contact.primaryPhone && (
          <span className="flex items-center gap-2 text-white shrink-0">
            <span>{contact.primaryPhone}</span>
            {contact.secondaryPhone ? <span> / {secondaryDisplay}</span> : null}
          </span>
        )}
      </div>
    </div>
  );
}
