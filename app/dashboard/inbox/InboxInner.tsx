"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Calendar, User, Building, Reply, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";

type Email = {
  message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body: string;
  body_preview?: string;
  received_at: string;
  building_id?: string;
  building_name?: string;
  isUnread?: boolean;
  status?: string;
};

export default function InboxInner() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from("incoming_emails")
        .select(`
          *,
          buildings(name)
        `)
        .order("received_at", { ascending: false });

      if (error) {
        console.error("Error loading inbox:", error.message);
      } else {
        setEmails(data?.map(email => ({
          ...email,
          building_name: email.buildings?.name
        })) || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = (emailId: string) => {
    router.push(`/dashboard/inbox/${emailId}`);
  };

  const handleQuickReply = (email: Email) => {
    router.push(`/dashboard/inbox/${email.message_id}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Inbox</h1>
          <Badge variant="secondary" className="ml-2">
            {emails.length} emails
          </Badge>
        </div>
        <Button 
          onClick={fetchEmails}
          variant="outline"
          size="sm"
        >
          Refresh
        </Button>
      </div>

      {emails.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No emails found</h3>
          <p className="text-gray-500">Your inbox is empty or emails haven't been synced yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <Card 
              key={email.message_id} 
              className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                email.isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleEmailClick(email.message_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold truncate">
                      {email.subject || "(No subject)"}
                    </h3>
                    {email.isUnread && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        New
                      </Badge>
                    )}
                    {email.status && (
                      <Badge variant="outline" className="text-xs">
                        {email.status}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">
                        {email.from_name || email.from_email}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(email.received_at).toLocaleDateString()}
                      </span>
                    </div>
                    {email.building_name && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{email.building_name}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {email.body_preview || email.body.substring(0, 150) + "..."}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickReply(email);
                    }}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmailClick(email.message_id);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
