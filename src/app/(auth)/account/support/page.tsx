import { getCustomerMessages } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";
import SupportMessage from "./SupportMessage";
import { MessageSquare } from "lucide-react";

export const instant = false;

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const messagesResponse = await getCustomerMessages();

  return (
    <AccountLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-ink">Support</h1>
            <p className="mt-1 text-muted">View your messages and our replies in one place</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep">
            <MessageSquare className="h-4 w-4" />
            New Message
          </button>
        </div>

        <div className="rounded-[12px] border border-line bg-white overflow-hidden">
          {messagesResponse.ok && messagesResponse.data.messages.length > 0 ? (
            <div className="divide-y divide-line">
              {messagesResponse.data.messages.map((message) => (
                <SupportMessage key={message.id} message={message} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted mb-4" />
              <h3 className="text-[18px] font-semibold text-ink mb-2">No messages yet</h3>
              <p className="text-muted mb-6">When you contact support, your conversation will appear here.</p>
              <button className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep">
                <MessageSquare className="h-4 w-4" />
                Contact Support
              </button>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}