/**
 * Finance, Invoices & Project Profitability (P/L) Service
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.7, §20.2 AC-12, §20.1 T-22, T-23)
 */

import { store } from './store.js';

export const FinanceService = {
  // 1. List Invoices with Authoritative Outstanding Balances (§7.7)
  listInvoices() {
    return store.invoices.map(inv => {
      const verifiedPaid = store.payments
        .filter(p => p.order_id === inv.order_id && p.status === 'VERIFIED')
        .reduce((sum, p) => sum + p.amount_paise, 0);

      const outstanding = inv.total_paise - verifiedPaid;
      const isOverpaid = outstanding < 0;

      return {
        ...inv,
        verified_paid_paise: verifiedPaid,
        outstanding_paise: isOverpaid ? 0 : outstanding,
        overpaid_paise: isOverpaid ? Math.abs(outstanding) : 0,
        is_overpaid: isOverpaid,
        balance_label: isOverpaid ? 'Overpaid — review required' : `₹${(outstanding / 100).toLocaleString('en-IN')}`
      };
    });
  },

  // 2. Direct Project Expenses Management
  listExpenses(projectId) {
    if (projectId) {
      return store.expenses.filter(e => e.project_id === projectId);
    }
    return [...store.expenses];
  },

  createExpense({ project_id, category = 'Consumables', amount_paise, description }) {
    if (!amount_paise || Number(amount_paise) <= 0) {
      const err = new Error('Valid expense amount is required');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const expense = {
      id: `exp-${Date.now()}`,
      project_id: project_id || 'prj-101',
      category,
      amount_paise: Number(amount_paise),
      description: description || 'Site installation expense',
      status: 'Pending',
      approved_by: null,
      incurred_at: new Date().toISOString()
    };

    store.expenses.push(expense);
    return expense;
  },

  approveExpense(expenseId, approverId = 'usr-admin-01') {
    const expense = store.expenses.find(e => e.id === expenseId);
    if (!expense) {
      const err = new Error('Expense not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    expense.status = 'Approved';
    expense.approved_by = approverId;
    return expense;
  },

  // 3. Technician Timesheet Pay Records
  listTechnicianPay() {
    return [...store.technicianPayRecords];
  },

  // 4. Subsidy Application Document Tracking (§7.7, §4.3 X-03)
  getSubsidyStatus(projectId = 'prj-101') {
    const app = store.subsidyApplications.find(s => s.project_id === projectId);
    if (!app) {
      return store.subsidyApplications[0];
    }
    return app;
  },

  updateSubsidyChecklist(projectId, { checklist, status, notes }) {
    let app = store.subsidyApplications.find(s => s.project_id === projectId);
    if (!app) {
      app = {
        id: `sub-${Date.now()}`,
        project_id: projectId,
        customer_id: 'cus-001',
        receivable_paise: 7800000,
        status: status || 'Documents Pending',
        submitted_at: null,
        disbursed_at: null,
        notes: notes || '',
        checklist: checklist || {}
      };
      store.subsidyApplications.push(app);
      return app;
    }

    if (checklist) app.checklist = { ...app.checklist, ...checklist };
    if (status) app.status = status;
    if (notes) app.notes = notes;
    if (status === 'Submitted' && !app.submitted_at) app.submitted_at = new Date().toISOString();
    if (status === 'Disbursed' && !app.disbursed_at) app.disbursed_at = new Date().toISOString();

    return app;
  },

  // 5. Project-Wise Profitability Calculation (§7.7, §20.2 AC-12, §20.1 T-23)
  getProjectProfitability(projectId = 'prj-101') {
    const invoice = store.invoices.find(inv => inv.order_id === 'ord-101') || store.invoices[0];
    const contractRevenuePaise = invoice ? invoice.total_paise : 30000000; // 300,000 INR

    // 1. Material Cost: Sum of unit costs of dispatched components
    // For 3 kW demo On-Grid system: 6 panels @ 12k + 1 inverter @ 48k + mounting/cables = 145,000 INR
    const materialCostPaise = 14500000;

    // 2. Labor Cost: Sum of approved technician hours * rate
    const laborCostPaise = store.technicianPayRecords
      .filter(tp => tp.status === 'Approved')
      .reduce((sum, tp) => sum + tp.gross_paise, 0); // ~40,700 INR

    // 3. Other Direct Costs: Approved expenses for this project
    const otherDirectCostPaise = store.expenses
      .filter(e => e.project_id === projectId && e.status === 'Approved')
      .reduce((sum, e) => sum + e.amount_paise, 0); // 6,000 INR

    // 4. Unbilled Service / Warranty Costs: Parts & labor on covered warranty repairs
    const unbilledServiceCostPaise = 250000; // 2,500 INR IGBT driver board replacement

    // Total Costs
    const totalCostPaise = materialCostPaise + laborCostPaise + otherDirectCostPaise + unbilledServiceCostPaise;

    // Project Profit = Contract Revenue - Total Costs
    const profitPaise = contractRevenuePaise - totalCostPaise;
    const marginPercent = Number(((profitPaise / contractRevenuePaise) * 100).toFixed(2));

    // Cash View: Verified payments received vs actual costs paid
    const verifiedPaymentsPaise = store.payments
      .filter(p => p.order_id === 'ord-101' && p.status === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount_paise, 0);

    const netCashPositionPaise = verifiedPaymentsPaise - totalCostPaise;

    return {
      projectId,
      contract_revenue: {
        amount_paise: contractRevenuePaise,
        type: 'ACTUAL',
        label: 'Accepted Contract Revenue'
      },
      costs: {
        material: {
          amount_paise: materialCostPaise,
          type: 'ACTUAL',
          description: 'Dispatched components at serialized receipt cost'
        },
        labor: {
          amount_paise: laborCostPaise,
          type: 'ACTUAL',
          description: 'Approved technician clock-in timesheet hours'
        },
        other_direct: {
          amount_paise: otherDirectCostPaise,
          type: 'ACTUAL',
          description: 'Approved project transport, DISCOM permits and consumables'
        },
        service_warranty: {
          amount_paise: unbilledServiceCostPaise,
          type: 'ACTUAL',
          description: 'Company-covered warranty repair parts & visit costs'
        },
        total_costs_paise: totalCostPaise
      },
      profitability: {
        net_profit_paise: profitPaise,
        margin_percent: marginPercent,
        status: profitPaise > 0 ? 'PROFITABLE' : 'DEFICIT'
      },
      cash_flow: {
        verified_payments_received_paise: verifiedPaymentsPaise,
        net_cash_position_paise: netCashPositionPaise
      }
    };
  }
};
