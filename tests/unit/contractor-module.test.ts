import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { role: 'manager' },
          error: null
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'contractor-1', name: 'Test Contractor' },
          error: null
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: { success: true },
        error: null
      }))
    })),
    rpc: vi.fn(() => ({
      data: 'WO-ASH-000123',
      error: null
    }))
  }))
};

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Contractor Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contractor Creation', () => {
    it('should create contractor with documents', async () => {
      const contractorData = {
        name: 'Test Contractor',
        email: 'test@contractor.com',
        phone: '01234567890',
        vat_number: 'GB123456789',
        categories: ['plumbing', 'electrical'],
        notes: 'Test contractor',
        documents: [
          {
            doc_type: 'insurance',
            file_url: 'https://example.com/insurance.pdf',
            valid_from: '2024-01-01',
            valid_to: '2025-01-01',
          }
        ]
      };

      const response = await fetch('/api/contractors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractorData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.contractor.name).toBe('Test Contractor');
      expect(data.contractor.email).toBe('test@contractor.com');
    });

    it('should create contractor without documents', async () => {
      const contractorData = {
        name: 'Simple Contractor',
        categories: ['general'],
      };

      const response = await fetch('/api/contractors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractorData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.contractor.name).toBe('Simple Contractor');
    });
  });

  describe('Document Upload', () => {
    it('should upload contractor document', async () => {
      const documentData = {
        contractor_id: 'contractor-1',
        doc_type: 'insurance',
        file_url: 'https://example.com/insurance.pdf',
        valid_from: '2024-01-01',
        valid_to: '2025-01-01',
      };

      const response = await fetch('/api/contractors/upload-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.document.doc_type).toBe('insurance');
    });
  });

  describe('Works Order Creation', () => {
    it('should create works order with lines', async () => {
      const worksOrderData = {
        building_id: 'building-1',
        contractor_id: 'contractor-1',
        title: 'Lift door operator repair',
        description: 'Repair lift door operator mechanism',
        priority: 'high',
        target_date: '2024-12-31',
        lines: [
          {
            account_id: 'account-1',
            description: 'Labour',
            quantity: 8,
            unit_cost: 50,
          },
          {
            account_id: 'account-2',
            description: 'Parts',
            quantity: 1,
            unit_cost: 200,
          }
        ]
      };

      const response = await fetch('/api/works-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(worksOrderData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.works_order.title).toBe('Lift door operator repair');
      expect(data.works_order.ref).toMatch(/^WO-ASH-\d{6}$/);
      expect(data.works_order.works_order_lines).toHaveLength(2);
    });

    it('should generate unique works order reference', async () => {
      // Mock existing works orders
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [
                  { ref: 'WO-ASH-000001' },
                  { ref: 'WO-ASH-000002' }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const worksOrderData = {
        building_id: 'building-1',
        contractor_id: 'contractor-1',
        title: 'Test WO',
        lines: [{ account_id: 'account-1', description: 'Test', quantity: 1, unit_cost: 100 }]
      };

      const response = await fetch('/api/works-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(worksOrderData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.works_order.ref).toBe('WO-ASH-000123'); // Generated by RPC
    });
  });

  describe('Works Order Approval', () => {
    it('should approve works order with valid insurance', async () => {
      // Mock contractor with valid insurance
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'wo-1',
                status: 'draft',
                contractor_id: 'contractor-1',
                contractors: { name: 'Test Contractor' },
                user_buildings: { role: 'manager' }
              },
              error: null
            }))
          }))
        }))
      });

      // Mock insurance check
      mockSupabase.from.mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: true, // Valid insurance
          error: null
        }))
      });

      const response = await fetch('/api/works-orders/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wo_id: 'wo-1' }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('approved and issued');
    });

    it('should reject works order with expired insurance', async () => {
      // Mock contractor with expired insurance
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'wo-1',
                status: 'draft',
                contractor_id: 'contractor-1',
                contractors: { name: 'Test Contractor' },
                user_buildings: { role: 'manager' }
              },
              error: null
            }))
          }))
        }))
      });

      // Mock insurance check - expired
      mockSupabase.from.mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: false, // Invalid/expired insurance
          error: null
        }))
      });

      const response = await fetch('/api/works-orders/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wo_id: 'wo-1' }),
      });

      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toContain('insurance is not valid');
    });
  });

  describe('Invoice OCR with Works Order Linkage', () => {
    it('should link invoice to works order', async () => {
      const invoiceData = {
        supplier_name: 'Test Contractor',
        invoice_number: 'INV-001',
        invoice_date: '2024-12-01',
        building_id: 'building-1',
        works_order_ref: 'WO-ASH-000123',
        lines: [
          {
            description: 'Lift repair work',
            net: 400,
            vat: 80,
          }
        ],
        gross_total: 480,
      };

      // Mock works order lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'wo-1',
                status: 'issued',
                title: 'Lift door operator repair',
                contractors: { name: 'Test Contractor' }
              },
              error: null
            }))
          }))
        }))
      });

      const response = await fetch('/api/accounting/invoices/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.invoice.works_order_id).toBe('wo-1');
      expect(data.invoice.works_order_warning).toBeNull();
    });

    it('should warn about invalid works order reference', async () => {
      const invoiceData = {
        supplier_name: 'Test Contractor',
        invoice_number: 'INV-002',
        invoice_date: '2024-12-01',
        building_id: 'building-1',
        works_order_ref: 'WO-ASH-999999', // Non-existent
        lines: [
          {
            description: 'Test work',
            net: 100,
            vat: 20,
          }
        ],
        gross_total: 120,
      };

      // Mock works order lookup - not found
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      });

      const response = await fetch('/api/accounting/invoices/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.invoice.works_order_id).toBeNull();
      expect(data.invoice.works_order_warning).toContain('not found');
    });
  });

  describe('Contractor Compliance API', () => {
    it('should return contractor compliance data', async () => {
      // Mock contractor compliance data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: 'contractor-1',
                    name: 'Test Contractor',
                    categories: ['plumbing'],
                    contractor_documents: [
                      {
                        doc_type: 'insurance',
                        status: 'valid',
                        valid_to: '2025-12-31'
                      }
                    ],
                    works_orders: [
                      {
                        id: 'wo-1',
                        created_at: '2024-01-01',
                        status: 'completed',
                        works_order_lines: [{ total: 1000 }]
                      }
                    ]
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/ai/contractor-compliance?building_id=building-1');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.contractors).toHaveLength(1);
      expect(data.data.contractors[0].insurance_status).toBe('valid');
      expect(data.data.contractors[0].total_spend).toBe(1000);
    });
  });

  describe('Works Orders API', () => {
    it('should return works orders with totals', async () => {
      // Mock works orders data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: 'wo-1',
                    ref: 'WO-ASH-000123',
                    title: 'Lift repair',
                    status: 'issued',
                    target_date: '2024-12-31',
                    contractors: { name: 'Test Contractor' },
                    works_order_lines: [
                      { description: 'Labour', quantity: 8, unit_cost: 50, total: 400 },
                      { description: 'Parts', quantity: 1, unit_cost: 200, total: 200 }
                    ]
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/ai/works-orders?building_id=building-1&status=open');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.works_orders).toHaveLength(1);
      expect(data.data.works_orders[0].total_estimated).toBe(600);
      expect(data.data.summary.total).toBe(1);
    });
  });

  describe('Reporting APIs', () => {
    it('should return spend by contractor report', async () => {
      // Mock spend data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                not: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    group: vi.fn(() => ({
                      order: vi.fn(() => ({
                        data: [
                          {
                            contractor_id: 'contractor-1',
                            contractors: { name: 'Test Contractor', categories: ['plumbing'] },
                            total_spend: '5000'
                          }
                        ],
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/reports/spend-by-contractor?building_id=building-1&year=2024');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.contractors).toHaveLength(1);
      expect(data.data.contractors[0].total_spend).toBe(5000);
    });

    it('should return spend by works order report', async () => {
      // Mock spend by works order data
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                not: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    group: vi.fn(() => ({
                      order: vi.fn(() => ({
                        data: [
                          {
                            works_order_id: 'wo-1',
                            works_orders: {
                              ref: 'WO-ASH-000123',
                              title: 'Lift repair',
                              status: 'completed',
                              target_date: '2024-12-31',
                              contractors: { name: 'Test Contractor' }
                            },
                            actual_spend: '600'
                          }
                        ],
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      const response = await fetch('/api/reports/spend-by-wo?building_id=building-1&year=2024');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.works_orders).toHaveLength(1);
      expect(data.data.works_orders[0].actual_spend).toBe(600);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full contractor workflow', async () => {
      // 1. Create contractor
      const contractorResponse = await fetch('/api/contractors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Interphone Ltd',
          categories: ['lifts'],
        }),
      });
      const contractorData = await contractorResponse.json();
      expect(contractorData.success).toBe(true);

      // 2. Upload insurance
      const docResponse = await fetch('/api/contractors/upload-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: contractorData.contractor.id,
          doc_type: 'insurance',
          file_url: 'https://example.com/insurance.pdf',
          valid_from: '2024-01-01',
          valid_to: '2025-01-01',
        }),
      });
      const docData = await docResponse.json();
      expect(docData.success).toBe(true);

      // 3. Create works order
      const woResponse = await fetch('/api/works-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: 'building-1',
          contractor_id: contractorData.contractor.id,
          title: 'Lift door operator repair',
          lines: [
            {
              account_id: 'account-1',
              description: 'Labour',
              quantity: 8,
              unit_cost: 50,
            }
          ],
        }),
      });
      const woData = await woResponse.json();
      expect(woData.success).toBe(true);

      // 4. Approve works order
      const approveResponse = await fetch('/api/works-orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wo_id: woData.works_order.id }),
      });
      const approveData = await approveResponse.json();
      expect(approveData.success).toBe(true);

      // 5. OCR invoice with works order reference
      const invoiceResponse = await fetch('/api/accounting/invoices/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: 'Interphone Ltd',
          invoice_number: 'INV-001',
          invoice_date: '2024-12-01',
          building_id: 'building-1',
          works_order_ref: woData.works_order.ref,
          lines: [
            {
              description: 'Lift repair work',
              net: 400,
              vat: 80,
            }
          ],
          gross_total: 480,
        }),
      });
      const invoiceData = await invoiceResponse.json();
      expect(invoiceData.success).toBe(true);
      expect(invoiceData.invoice.works_order_id).toBe(woData.works_order.id);

      // 6. Approve invoice (would post to GL with contractor and works order dimensions)
      const invoiceApproveResponse = await fetch('/api/accounting/invoices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceData.invoice.id }),
      });
      const invoiceApproveData = await invoiceApproveResponse.json();
      expect(invoiceApproveData.success).toBe(true);

      // 7. Complete works order
      const completeResponse = await fetch('/api/works-orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wo_id: woData.works_order.id }),
      });
      const completeData = await completeResponse.json();
      expect(completeData.success).toBe(true);
    });
  });
});


