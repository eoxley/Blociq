'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  status: string;
  created_at: string;
  cancelled_at?: string;
  usage_remaining: number;
  stripe_subscription_id?: string;
  users: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface UsageStats {
  total_subscriptions: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  monthly_revenue: number;
  usage_this_month: number;
}

export default function OutlookSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [revokeReason, setRevokeReason] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [page, selectedStatus]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        action: 'list',
        page: page.toString(),
        limit: '50'
      });

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/admin/outlook-subscriptions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSubscriptions(data.subscriptions);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch subscriptions',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error fetching subscriptions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/outlook-subscriptions?action=usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRevoke = async (email: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/outlook-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          action: 'revoke',
          email,
          reason,
          effective_date: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Subscription revoked for ${email}`,
        });
        fetchSubscriptions();
        setRevokeReason('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to revoke subscription',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error revoking subscription',
        variant: 'destructive'
      });
    }
  };

  const handleSuspend = async (email: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/outlook-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          action: 'suspend',
          email,
          reason
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Subscription suspended for ${email}`,
        });
        fetchSubscriptions();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to suspend subscription',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error suspending subscription',
        variant: 'destructive'
      });
    }
  };

  const handleBulkRevoke = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one email address',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/outlook-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          action: 'bulk_revoke',
          emails,
          reason: revokeReason || 'Bulk administrative action'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Processed ${emails.length} subscriptions`,
        });
        fetchSubscriptions();
        setBulkEmails('');
        setRevokeReason('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to process bulk revocation',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error processing bulk revocation',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      'active': 'default',
      'cancelled': 'destructive',
      'suspended': 'secondary',
      'paused': 'outline',
      'payment_failed': 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground">Total Subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.active_subscriptions}</div>
              <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.cancelled_subscriptions}</div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.usage_this_month}</div>
              <p className="text-xs text-muted-foreground">Usage This Month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
              <option value="paused">Paused</option>
            </select>
            <Button onClick={fetchSubscriptions}>
              Refresh
            </Button>
          </div>

          {/* Bulk Actions */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Bulk Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Addresses (one per line)
                </label>
                <Textarea
                  placeholder="user1@example.com&#10;user2@example.com"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Revocation Reason
                </label>
                <Textarea
                  placeholder="Reason for revoking access..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    Bulk Revoke Subscriptions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Revocation</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately revoke access for all specified email addresses.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkRevoke}>
                      Revoke All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading subscriptions...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage Remaining</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {sub.users.first_name} {sub.users.last_name}
                      </TableCell>
                      <TableCell>{sub.users.email}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>{sub.usage_remaining}</TableCell>
                      <TableCell>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {sub.status === 'active' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Suspend
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Suspend Subscription</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Temporarily suspend access for {sub.users.email}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleSuspend(sub.users.email, 'Administrative suspension')}
                                    >
                                      Suspend
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Revoke
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke Subscription</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Permanently revoke access for {sub.users.email}?
                                      This will immediately cancel their subscription.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRevoke(sub.users.email, 'Administrative revocation')}
                                    >
                                      Revoke
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}