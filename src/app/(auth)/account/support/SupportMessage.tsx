"use client";

import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    new: "bg-brand/10 text-brand border-brand/20",
    read: "bg-info/10 text-info border-info/20",
    replied: "bg-success/10 text-success border-success/20",
    archived: "bg-neutral/10 text-neutral border-neutral/20",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.new}`}>
      {label}
    </span>
  );
}

type SupportMessageData = {
  subject: string;
  body: string;
  status: string;
  replyBody: string;
  repliedAt?: string | null;
  createdAt: string;
};

export default function SupportMessage({ message }: { message: SupportMessageData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6 hover:bg-tile/50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h3 className="font-medium text-ink">{message.subject}</h3>
            {getStatusBadge(message.status)}
            <span className="text-sm text-muted">{formatDate(message.createdAt)}</span>
          </div>
          <p className="text-muted line-clamp-2">{message.body}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-[6px] text-muted hover:bg-tile hover:text-ink transition-colors flex-shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {expanded && (
        <div className="pt-4 border-t border-line space-y-4">
          {message.replyBody && (
            <div className="rounded-[8px] bg-brand/5 p-4 border border-brand/20">
              <div className="flex items-center gap-2 text-sm text-brand-deep mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Solar Home Team replied</span>
                {message.repliedAt && <span className="text-muted">on {formatDate(message.repliedAt)}</span>}
              </div>
              <p className="text-brand whitespace-pre-wrap">{message.replyBody}</p>
            </div>
          )}
          {message.status === "new" && !message.replyBody && (
            <p className="text-sm text-muted flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Our team will respond soon
            </p>
          )}
        </div>
      )}
    </div>
  );
}