"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Calendar, User, Building, Reply, Eye, CheckCircle, FolderOpen, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  is_handled?: boolean;
  handled_at?: string;
  folder?: string;
};

export default function InboxInner() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [syncStatus, setSyncStatus] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    fetchEmails();
  }, [filter]);

  const fetchEmails = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      let query = supabase
        .from("incoming_emails")
        .select(`
          *,
          buildings(name)
        `)
        .order("received_at", { ascending: false });

      // Apply filters
      switch (filter) {
        case "unread":
          query = query.eq("isUnread", true);
          break;
        case "handled":
          query = query.eq("is_handled", true);
          break;
        case "unhandled":
          query = query.eq("is_handled", false);
          break;
        case "inbox":
          query = query.eq("folder", "inbox");
          break;
        default:
          // Show all emails
          break;
      }

      const { data, error } = await query;

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

  const handleManualSync = async () => {
    setSyncStatus("syncing");
    try {
      const response = await fetch("/api/sync-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceSync: true })
      });

      const data = await response.json();
      if (data.success) {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus(""), 3000);
        fetchEmails(); // Refresh the list
      } else {
        setSyncStatus("error");
        setTimeout(() => setSyncStatus(""), 3000);
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(""), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const unhandledCount = emails.filter(e => !e.is_handled).length;
  const handledCount = emails.filter(e => e.is_handled).length;

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Emails</p>
                <p className="text-2xl font-bold text-gray-900">{emails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Eye className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unhandled</p>
                <p className="text-2xl font-bold text-gray-900">{unhandledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Handled</p>
                <p className="text-2xl font-bold text-gray-900">{handledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Sync</p>
                <p className="text-2xl font-bold text-gray-900">2m ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Emails</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="unhandled">Unhandled</SelectItem>
              <SelectItem value="handled">Handled</SelectItem>
              <SelectItem value="inbox">Inbox Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleManualSync}
          variant="outline"
          size="sm"
          disabled={syncStatus === "syncing"}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
          {syncStatus === "syncing" ? "Syncing..." : 
           syncStatus === "success" ? "✓ Synced" :
           syncStatus === "error" ? "✗ Error" : "Sync"}
        </Button>
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No emails found</h3>
          <p className="text-gray-500">
            {filter === "all" ? "Your inbox is empty or emails haven't been synced yet." :
             filter === "unhandled" ? "All emails have been handled!" :
             filter === "handled" ? "No handled emails found." :
             `No ${filter} emails found.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <Card 
              key={email.message_id} 
              className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                email.isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
              }`}
              onClick={() => handleEmailClick(email.message_id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold truncate ${email.isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                        {email.subject || '(No Subject)'}
                      </h3>
                      {email.isUnread && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                      {email.is_handled && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          Handled
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span className="truncate">
                          {email.from_name || email.from_email}
                        </span>
                      </div>
                      {email.building_name && (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{email.building_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(email.received_at)}</span>
                      </div>
                    </div>
                    
                    {email.body_preview && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {email.body_preview}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickReply(email);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
