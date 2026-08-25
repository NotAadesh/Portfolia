"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface Metrics {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  total_portfolios: number;
  total_simulated_capital: number;
  average_expected_return: number;
  popular_stocks: { ticker: string; count: number }[];
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  portfolio_count: number;
  created_at: string;
}

interface GlobalPortfolio {
  id: number;
  user_id: number;
  owner_email: string;
  name: string;
  initial_investment: number;
  horizon_years: number;
  expected_return: number | null;
  volatility: number | null;
  sharpe_ratio: number | null;
  tickers: string[];
  created_at: string;
}

export default function SuperadminPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"users" | "portfolios">("users");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [portfolios, setPortfolios] = useState<GlobalPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, u, p] = await Promise.all([
        apiFetch<Metrics>("/api/v1/admin/metrics"),
        apiFetch<AdminUser[]>("/api/v1/admin/users"),
        apiFetch<GlobalPortfolio[]>("/api/v1/admin/portfolios"),
      ]);
      setMetrics(m);
      setUsers(u);
      setPortfolios(p);
    } catch (err: any) {
      setError(err.message || "Failed to load superadmin metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "superadmin" || user.role === "admin")) {
      fetchData();
    }
  }, [user]);

  const handleUpdateStatus = async (userId: number, update: { role?: string; is_active?: boolean; is_verified?: boolean }) => {
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify(update),
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete user ${email}? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">Checking administrator privileges...</div>;
  }

  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md text-center space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Administrator Access Required</h1>
          <p className="text-xs text-slate-500">
            You must be logged in as an administrator or superadmin to access this terminal.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Superadmin Governance</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Platform monitoring, user governance & multi-tenant portfolio oversight
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">{metrics.total_users}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-green-600 font-medium">{metrics.verified_users} Verified</span>
              <span className="text-gray-300">•</span>
              <span className="text-yellow-600 font-medium">{metrics.unverified_users} Pending</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Simulated Capital</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              ₹{(metrics.total_simulated_capital / 1e5).toFixed(2)} L
            </h2>
            <p className="text-xs text-gray-400 mt-2">Across all user portfolios</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Portfolios</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">{metrics.total_portfolios}</h2>
            <p className="text-xs text-gray-400 mt-2">Saved cloud portfolios</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Expected Return</p>
            <h2 className="text-2xl font-bold text-blue-600 mt-1">
              {metrics.average_expected_return > 0 ? `+${metrics.average_expected_return}%` : "—"}
            </h2>
            <p className="text-xs text-gray-400 mt-2">Annualized return benchmark</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          User Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("portfolios")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "portfolios"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Global Portfolios ({portfolios.length})
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-black"
            />
            <span className="text-xs text-gray-400">Showing {filteredUsers.length} of {users.length} accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Portfolios</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{u.full_name || "—"}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold uppercase ${
                          u.role === "superadmin"
                            ? "bg-red-100 text-red-700"
                            : u.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.is_active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="text-xs text-gray-600">
                          {u.is_active ? (u.is_verified ? "Verified" : "Pending OTP") : "Suspended"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {u.portfolio_count}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {/* Toggle verification */}
                      {!u.is_verified && (
                        <button
                          onClick={() => handleUpdateStatus(u.id, { is_verified: true })}
                          disabled={actionLoading === u.id}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded hover:bg-green-100"
                        >
                          Verify
                        </button>
                      )}

                      {/* Toggle active / suspend */}
                      <button
                        onClick={() => handleUpdateStatus(u.id, { is_active: !u.is_active })}
                        disabled={actionLoading === u.id || u.id === user.id}
                        className={`text-xs px-2.5 py-1 rounded border ${
                          u.is_active
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                      >
                        {u.is_active ? "Suspend" : "Activate"}
                      </button>

                      {/* Toggle Admin role */}
                      {u.role !== "superadmin" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(u.id, {
                              role: u.role === "admin" ? "user" : "admin",
                            })
                          }
                          disabled={actionLoading === u.id}
                          className="text-xs bg-gray-100 text-gray-700 border px-2.5 py-1 rounded hover:bg-gray-200"
                        >
                          {u.role === "admin" ? "Make User" : "Make Admin"}
                        </button>
                      )}

                      {/* Delete */}
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={actionLoading === u.id}
                          className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL PORTFOLIOS */}
      {activeTab === "portfolios" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">All Registered User Portfolios</h2>

          {portfolios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No user portfolios saved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Portfolio Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Capital</th>
                    <th className="py-3 px-4">Horizon</th>
                    <th className="py-3 px-4">Assets</th>
                    <th className="py-3 px-4">Return / Vol</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {portfolios.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">{p.name}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">{p.owner_email}</td>
                      <td className="py-3.5 px-4 font-medium">₹{p.initial_investment.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-gray-600">{p.horizon_years} Yrs</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.tickers.map((t) => (
                            <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-green-600 font-medium">
                          {p.expected_return ? `${p.expected_return}%` : "—"}
                        </span>{" "}
                        /{" "}
                        <span className="text-yellow-600">
                          {p.volatility ? `${p.volatility}%` : "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
