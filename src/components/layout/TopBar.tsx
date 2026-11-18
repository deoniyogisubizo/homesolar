"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin } from "lucide-react";
import type { ContactSettings } from "@/lib/admin/settings-defaults";

interface TopBarProps {
  contact: ContactSettings;
  brandName: string;
}

export function TopBar({ contact, brandName }: TopBarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStage, setMobileStage] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mq.addEventListener("change", listener);

    const stageTimers = [
      window.setTimeout(() => setMobileStage(1), 60_000),
      window.setTimeout(() => setMobileStage(2), 120_000),
    ];
    return () => {
      mq.removeEventListener("change", listener);
      stageTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const mobileMessages = [
    {
      key: "tel",
      text: contact.primaryPhone
        ? `${contact.primaryPhone}${contact.secondaryPhone ? ` / ${contact.secondaryPhone.replace(/^(\+250)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")}` : ""}`
        : "",
    },
    { key: "email", text: contact.supportEmail ?? "" },
    { key: "address", text: contact.address ?? "" },
  ];
  const mobileMessage = mobileMessages[Math.min(mobileStage, mobileMessages.length - 1)];

  const showMobileMessage = isMobile && mobileMessage.text;

  return (
    <div className="sticky top-0 z-50 bg-[#222] py-2 text-white text-[13px]">
      {showMobileMessage ? (
        <div className="container-page flex items-center justify-center">
          <span className="text-center text-[13px] text-white">{mobileMessage.text}</span>
        </div>
      ) : (
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
              {contact.secondaryPhone ? <span> / {contact.secondaryPhone.replace(/^(\+250)(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")}</span> : null}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
