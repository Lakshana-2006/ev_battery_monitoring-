import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { Telemetry } from '../types';
import { api } from '../services/api';

export const HistoricalDataPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<Telemetry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const sourceParam = sourceFilter === 'ALL' ? undefined : sourceFilter.toLowerCase();
      const res = await api.getTelemetryHistory({
        source: sourceParam,
        limit,
        offset
      });
      setHistoryItems(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit, offset, sourceFilter]);

  const handleExportCSV = () => {
    if (historyItems.length === 0) return;

    const headers = [
      'Timestamp',
      'Device ID',
      'Sequence',
      'Voltage (V)',
      'Current (A)',
      'Temperature (°C)',
      'SOC (%)',
      'SOH (%)',
      'Power (W)',
      'Origin Source',
      'Sensor Status',
      'Is Valid'
    ];

    const rows = historyItems.map(item => [
      `"${item.timestamp}"`,
      `"${item.device_id}"`,
      item.sequence ?? '',
      item.voltage_v ?? '',
      item.current_a ?? '',
      item.temperature_c ?? '',
      item.soc_pct ?? '',
      item.soh_pct ?? '',
      item.power_w ?? '',
      `"${item.source}"`,
      `"${item.sensor_status}"`,
      item.is_valid
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ev_battery_telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            HISTORICAL TELEMETRY LOGS & AUDIT TRAIL
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Database archival records with pagination, origin filtering, and CSV export.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-2 shadow-md shadow-cyan-600/20"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Pagination Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-slate-400 font-semibold">Filter Source:</span>
          {['ALL', 'HARDWARE', 'SIMULATION'].map((src) => (
            <button
              key={src}
              onClick={() => {
                setSourceFilter(src);
                setOffset(0);
              }}
              className={`px-3 py-1 rounded-xl font-mono text-xs transition ${
                sourceFilter === src
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {src}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-slate-400 font-mono">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setOffset(0);
            }}
            className="px-2 py-1 bg-navy-950 border border-slate-700 rounded-lg text-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">
            Showing {Math.min(total, offset + 1)} - {Math.min(total, offset + limit)} of {total} records
          </span>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-navy-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-3">Seq #</th>
                <th className="py-3 px-3">Voltage (V)</th>
                <th className="py-3 px-3">Current (A)</th>
                <th className="py-3 px-3">Temp (°C)</th>
                <th className="py-3 px-3">SOC (%)</th>
                <th className="py-3 px-3">SOH (%)</th>
                <th className="py-3 px-3">Power (W)</th>
                <th className="py-3 px-3">Origin</th>
                <th className="py-3 px-3">Sensor Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {historyItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 italic">
                    No historical telemetry records found.
                  </td>
                </tr>
              ) : (
                historyItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400">
                      {item.sequence ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {item.voltage_v !== null && item.voltage_v !== undefined ? item.voltage_v.toFixed(2) : '—'}
                    </td>
                    <td className={`py-2.5 px-3 font-semibold ${
                      item.current_a && item.current_a > 0 ? 'text-emerald-400' : 'text-cyan-300'
                    }`}>
                      {item.current_a !== null && item.current_a !== undefined ? item.current_a.toFixed(2) : '—'}
                    </td>
                    <td className={`py-2.5 px-3 ${
                      item.temperature_c && item.temperature_c > 45 ? 'text-rose-400 font-bold' : 'text-slate-300'
                    }`}>
                      {item.temperature_c !== null && item.temperature_c !== undefined ? item.temperature_c.toFixed(1) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-purple-300">
                      {item.soc_pct !== null && item.soc_pct !== undefined ? `${item.soc_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 italic">
                      {item.soh_pct !== null && item.soh_pct !== undefined ? `${item.soh_pct.toFixed(1)}%` : 'Not calib.'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {item.power_w !== null && item.power_w !== undefined ? item.power_w.toFixed(1) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.source === 'hardware'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {item.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] ${
                        item.sensor_status === 'OK' ? 'text-slate-400' : 'text-amber-400 font-bold'
                      }`}>
                        {item.sensor_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Footer */}
        <div className="p-4 bg-navy-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-bold text-white">{currentPage}</span> of{' '}
            <span className="font-bold text-white">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
