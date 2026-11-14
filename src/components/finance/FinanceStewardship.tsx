import React, { useState } from 'react';
import {
  CircleDollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Heart,
  Filter,
  CheckCircle2,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const FinanceStewardship: React.FC = () => {
  const { currentUser, visibleFinance } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [filterCategory, setFilterCategory] = useState('all');

  // Derive KPIs from context-filtered records
  const totalOffering = visibleFinance.reduce((sum, r) => sum + r.amount, 0);
  const tithesTotal = visibleFinance
    .filter((r) => r.category === 'Tithe')
    .reduce((sum, r) => sum + r.amount, 0);
  const buildingTotal = visibleFinance
    .filter((r) => r.category === 'Cathedral Building Fund')
    .reduce((sum, r) => sum + r.amount, 0);
  const cellOfferingTotal = visibleFinance
    .filter((r) => r.category === 'Cell Fellowship Offering')
    .reduce((sum, r) => sum + r.amount, 0);

  // Filtered transactions for the table
  const filteredTransactions = visibleFinance.filter(
    (t) => filterCategory === 'all' || t.category === filterCategory
  );

  // Unique categories for the filter dropdown
  const categories = Array.from(new Set(visibleFinance.map((r) => r.category)));

  const fmt = (n: number) =>
    'GH₵ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const statusColors: Record<string, string> = {
    Approved: 'text-emerald-400',
    'Paid/Posted': 'text-blue-400',
    Submitted: 'text-amber-400',
    Pending: 'text-[#a6c4eb]'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">
          {isPastor ? 'Kingdom Stewardship' : 'Cell Offering Records'}
        </h2>
        <p className="text-xs text-[#a6c4eb] mt-0.5">
          {isPastor
            ? 'Financial stewardship & offering ledger'
            : `${currentUser.assignedCell} fellowship offerings`}
        </p>
      </div>

      {/* KPI Cards */}
      {isPastor ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Collections',
              value: fmt(totalOffering),
              sub: 'All giving streams combined',
              icon: CircleDollarSign,
              color: 'purple'
            },
            {
              label: 'Tithes & First Fruits',
              value: fmt(tithesTotal),
              sub: 'Primary ministerial support',
              icon: CreditCard,
              color: 'indigo'
            },
            {
              label: 'Building Fund',
              value: fmt(buildingTotal),
              sub: 'Sanctuary Phase 2 pledge',
              icon: Building,
              color: 'amber'
            },
            {
              label: 'Cell Offerings',
              value: fmt(cellOfferingTotal),
              sub: 'All cells combined',
              icon: Heart,
              color: 'emerald'
            }
          ].map((kpi) => {
            const Icon = kpi.icon;
            const colorMap: Record<string, string> = {
              purple: 'bg-[#072e54]  text-[#00f0ff]',
              indigo: 'bg-[#1e3a5f]  text-[#60a5fa]',
              amber: 'bg-[#3b2b10]  text-amber-400',
              emerald: 'bg-[#043621]  text-[#00ff9d]'
            };
            return (
              <div
                key={kpi.label}
                className="bg-[#0a122e] p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div
                    className={`w-8 h-8  flex items-center justify-center  ${colorMap[kpi.color]}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-white">{kpi.value}</div>
                <p className="text-[10px] text-[#7b9dc7] pt-2">
                  {kpi.sub}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* Shepherd: single cell offering summary card */
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a122e] p-4 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-amber-900/20 text-amber-400">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">Total Submitted</p>
              <p className="text-xl font-bold text-white">{fmt(totalOffering)}</p>
            </div>
          </div>
          <div className="bg-[#0a122e] p-4 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-[#072e54] text-[#00f0ff]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">Submissions</p>
              <p className="text-xl font-bold text-white">{visibleFinance.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Shepherd info box */}
      {!isPastor && (
        <div className="flex items-start gap-2 bg-indigo-900/20 px-4 py-3 text-xs text-indigo-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
          <span>
            You can only see cell fellowship offering records for <strong>{currentUser.assignedCell}</strong>.
            To submit an offering, record a cell meeting from the <strong>Cell Meetings</strong> screen.
          </span>
        </div>
      )}

      {/* Ledger table */}
      <div className="bg-[#0a122e] overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
          <BookOpen className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-sm font-semibold text-white">
            {isPastor ? 'Financial Ledger' : 'Cell Offering Ledger'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#7b9dc7]" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="py-1 px-2 bg-[#070c1e] text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#7b9dc7]">
            <CircleDollarSign className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#7b9dc7] bg-[#070c1e]">
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Giver / Channel</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method</th>
                  {isPastor && <th className="py-3 px-4">Cell Group</th>}
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16285a] text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#111d44] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#00f0ff]">{tx.ref}</td>
                    <td className="py-3 px-4 text-[#a6c4eb]">{tx.date}</td>
                    <td className="py-3 px-4 text-white font-medium">{tx.giver}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#a6c4eb]">{tx.method}</td>
                    {isPastor && (
                      <td className="py-3 px-4 text-[#a6c4eb]">{tx.cellGroup || '—'}</td>
                    )}
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {fmt(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          statusColors[tx.status] || 'text-[#a6c4eb]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceStewardship;


