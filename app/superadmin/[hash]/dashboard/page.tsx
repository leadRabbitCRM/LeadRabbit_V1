"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  useDisclosure,
  Spinner,
  addToast,
  Tooltip,
  Progress,
  Switch,
} from "@heroui/react";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  PlusIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightStartOnRectangleIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  ChartBarIcon,
  ServerStackIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { EyeIcon, EyeSlashIcon, KeyIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";
import axios from "@/lib/axios";

interface Customer {
  _id: string;
  customerId: string;
  customerName: string;
  databaseName: string;
  adminMfaEnabled?: boolean;
  userMfaEnabled?: boolean;
  adminEmail: string;
  adminId?: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  maxUsers?: number;
  maxAdmins?: number;
  metadata?: {
    companyName?: string;
    phone?: string;
    address?: string;
  };
}

interface CustomerStat {
  customerId: string;
  userCount: number;
  adminCount: number;
  leadCount: number;
  employeeCount: number;
}

interface Overview {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  suspendedCustomers: number;
  totalUsers: number;
  totalAdmins: number;
  totalLeads: number;
  totalEmployees: number;
}

function StatCard({ label, value, icon, gradient, glow }: { label: string; value: number; icon: React.ReactNode; gradient: string; glow: string }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-5 flex items-center gap-4 hover:bg-white/8 transition-all cursor-default">
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${glow} flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-purple-300 text-xs">{label}</p>
        <p className="text-3xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const hash = (params?.hash as string) || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStat>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; action: () => void; message: string } | null>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    adminEmail: "",
    adminPassword: "LeadRabbit@123",
    companyName: "",
    phone: "",
    address: "",
    maxUsers: 10,
    maxAdmins: 2,
    adminMfaEnabled: true,
    userMfaEnabled: true,
  });

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("superadmin/customers/list");
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      const response = await axios.get("superadmin/stats");
      setOverview(response.data.overview || null);
      setCustomerStats(response.data.customerStats || {});
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const showConfirmation = (message: string, onConfirm: () => void) => {
    setConfirmAction({ type: "action", action: onConfirm, message });
    onConfirmOpen();
  };

  const performConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      onConfirmClose();
      setConfirmAction(null);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      setIsSaving(true);
      const payload = {
        customerName: formData.customerName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        maxUsers: parseInt(String(formData.maxUsers), 10) || 10,
        maxAdmins: parseInt(String(formData.maxAdmins), 10) || 2,
        adminMfaEnabled: formData.adminMfaEnabled,
        userMfaEnabled: formData.userMfaEnabled,
        metadata: {
          companyName: formData.companyName || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        },
      };
      const response = await axios.post("superadmin/customers", payload);
      if (response.data.success) {
        addToast({ title: "Success!", description: `Customer created! ID: ${response.data.customerId}`, color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
        onClose();
        resetForm();
        fetchCustomers();
        fetchStats();
      }
    } catch (error: any) {
      addToast({ title: "Error", description: error.response?.data?.error || "Failed to create customer", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      setIsSaving(true);
      if (!selectedCustomer) return;
      const payload = {
        customerId: selectedCustomer.customerId,
        customerName: formData.customerName,
        adminEmail: formData.adminEmail,
        adminMfaEnabled: formData.adminMfaEnabled,
        userMfaEnabled: formData.userMfaEnabled,
        metadata: {
          companyName: formData.companyName || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        },
      };
      const response = await axios.put("superadmin/customers/list", payload);
      if (response.data.success) {
        addToast({ title: "Success!", description: "Customer updated successfully!", color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
        onClose();
        resetForm();
        fetchCustomers();
        fetchStats();
      }
    } catch (error: any) {
      addToast({ title: "Error", description: error.response?.data?.error || "Failed to update customer", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      if (!selectedCustomer) return;
      await axios.delete(`superadmin/customers/list?customerId=${selectedCustomer.customerId}`);
      addToast({ title: "Success!", description: "Customer and database deleted successfully", color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      onDeleteClose();
      setSelectedCustomer(null);
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      addToast({ title: "Error", description: error.response?.data?.error || "Failed to delete customer", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
    }
  };

  const openCreateModal = () => { setModalMode("create"); resetForm(); onOpen(); };

  const openEditModal = (customer: Customer) => {
    setModalMode("edit");
    setSelectedCustomer(customer);
    setFormData({
      customerName: customer.customerName,
      adminEmail: customer.adminEmail,
      adminPassword: "",
      companyName: customer.metadata?.companyName || "",
      phone: customer.metadata?.phone || "",
      address: customer.metadata?.address || "",
      maxUsers: customer.maxUsers || 0,
      maxAdmins: customer.maxAdmins || 0,
      adminMfaEnabled: customer.adminMfaEnabled !== false,
      userMfaEnabled: customer.userMfaEnabled !== false,
    });
    onOpen();
  };

  const openDeleteModal = (customer: Customer) => { setSelectedCustomer(customer); onDeleteOpen(); };

  const handleStatusChange = async (customerId: string, status: string) => {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    showConfirmation(`Are you sure you want to ${statusText.toLowerCase()} this customer?`, async () => {
      try {
        await axios.patch("superadmin/customers/list", { customerId, status });
        addToast({ title: "Success!", description: "Customer status updated", color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
        fetchCustomers();
        fetchStats();
      } catch (error) {
        addToast({ title: "Error", description: "Failed to update status", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      }
    });
  };

  const handleLogout = async () => {
    try { await axios.post("logout"); router.push("/login"); }
    catch (error) { console.error("Logout error:", error); }
  };

  const handleResetPassword = async (customer: Customer) => {
    showConfirmation(`Reset password for ${customer.adminEmail}? Will be set to LeadRabbit@123.`, async () => {
      try {
        const response = await axios.put(`superadmin/customer-admins/${customer.customerId}/${customer.adminId}`, { action: "resetPassword" });
        addToast({ title: "Success!", description: `Password reset. Temp: ${response.data.tempPassword}`, color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      } catch (error: any) {
        addToast({ title: "Error", description: error.response?.data?.error || "Failed to reset password", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      }
    });
  };

  const handleResetMfa = async (customer: Customer) => {
    showConfirmation(`Reset MFA for ${customer.adminEmail}? They will need to set up 2FA again.`, async () => {
      try {
        await axios.put(`superadmin/customer-admins/${customer.customerId}/${customer.adminId}`, { action: "resetMfa" });
        addToast({ title: "Success!", description: "Admin MFA reset successfully", color: "success", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      } catch (error: any) {
        addToast({ title: "Error", description: error.response?.data?.error || "Failed to reset MFA", color: "danger", classNames: { closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2" } });
      }
    });
  };

  const resetForm = () => {
    setFormData({ customerName: "", adminEmail: "", adminPassword: "LeadRabbit@123", companyName: "", phone: "", address: "", maxUsers: 10, maxAdmins: 2, adminMfaEnabled: true, userMfaEnabled: true });
    setShowPassword(false);
    setSelectedCustomer(null);
    setModalMode("create");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "inactive": return "warning";
      case "suspended": return "danger";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircleIcon className="w-4 h-4" />;
      case "inactive": return <ClockIcon className="w-4 h-4" />;
      case "suspended": return <XCircleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Navbar */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/40">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">LeadRabbit</h1>
              <p className="text-purple-300 text-xs">Super Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh" size="sm">
              <Button isIconOnly size="sm" variant="flat" onPress={() => { fetchCustomers(); fetchStats(); }} className="bg-white/10 text-purple-300 border border-white/10">
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Button size="sm" variant="flat" startContent={<ArrowRightStartOnRectangleIcon className="w-4 h-4" />} onPress={handleLogout} className="bg-red-500/20 text-red-300 border border-red-500/30">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Title */}
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-purple-300 mt-1">Platform-wide overview — customers, users, and activity</p>
        </div>

        {/* Stats */}
        {isStatsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : overview && (
          <>
            <div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Customers</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Customers" value={overview.totalCustomers} icon={<BuildingOfficeIcon className="w-5 h-5 text-white" />} gradient="from-violet-500 to-purple-600" glow="shadow-purple-500/30" />
                <StatCard label="Active" value={overview.activeCustomers} icon={<CheckCircleIcon className="w-5 h-5 text-white" />} gradient="from-emerald-500 to-green-600" glow="shadow-green-500/30" />
                <StatCard label="Inactive" value={overview.inactiveCustomers} icon={<ClockIcon className="w-5 h-5 text-white" />} gradient="from-amber-500 to-orange-600" glow="shadow-orange-500/30" />
                <StatCard label="Suspended" value={overview.suspendedCustomers} icon={<XCircleIcon className="w-5 h-5 text-white" />} gradient="from-red-500 to-rose-600" glow="shadow-red-500/30" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Platform Totals</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Admins" value={overview.totalAdmins} icon={<ShieldCheckIcon className="w-5 h-5 text-white" />} gradient="from-blue-500 to-cyan-500" glow="shadow-blue-500/30" />
                <StatCard label="Total Users" value={overview.totalUsers} icon={<UsersIcon className="w-5 h-5 text-white" />} gradient="from-indigo-500 to-blue-600" glow="shadow-indigo-500/30" />
                <StatCard label="Total Leads" value={overview.totalLeads} icon={<ChartBarIcon className="w-5 h-5 text-white" />} gradient="from-pink-500 to-rose-500" glow="shadow-pink-500/30" />
                <StatCard label="Total Databases" value={overview.totalCustomers} icon={<ServerStackIcon className="w-5 h-5 text-white" />} gradient="from-teal-500 to-cyan-600" glow="shadow-teal-500/30" />
              </div>
            </div>
            {(overview.suspendedCustomers > 0 || overview.inactiveCustomers > 0) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {overview.suspendedCustomers > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex-1">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300"><span className="font-bold text-red-200">{overview.suspendedCustomers}</span> customer{overview.suspendedCustomers > 1 ? "s are" : " is"} suspended</p>
                  </div>
                )}
                {overview.inactiveCustomers > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-1">
                    <ClockIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300"><span className="font-bold text-amber-200">{overview.inactiveCustomers}</span> customer{overview.inactiveCustomers > 1 ? "s are" : " is"} inactive</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Customers Table */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <BuildingOfficeIcon className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">All Customer Organizations</h3>
                <p className="text-xs text-purple-300 mt-0.5">{customers.length} organization{customers.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button color="primary" size="sm" startContent={<PlusIcon className="w-4 h-4" />} onPress={openCreateModal} className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-md shadow-purple-500/30 font-semibold">
              New Customer
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16">
              <Spinner size="lg" color="secondary" />
              <p className="mt-3 text-purple-300 text-sm">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-full bg-white/10 mb-4">
                <BuildingOfficeIcon className="w-10 h-10 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">No customers yet</h3>
              <p className="text-purple-300 text-sm mt-1 max-w-xs">Create your first customer organization to get started.</p>
              <Button color="primary" className="mt-5 bg-gradient-to-r from-purple-600 to-blue-600" onPress={openCreateModal} startContent={<PlusIcon className="w-4 h-4" />}>
                Create Customer
              </Button>
            </div>
          ) : (
            <Table aria-label="Customers table" removeWrapper>
              <TableHeader>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Customer</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Admin Email</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Status</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">MFA</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Admins / Users</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Leads</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">User Limit</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Created</TableColumn>
                <TableColumn className="bg-white/5 text-purple-300 text-xs font-semibold uppercase tracking-wider">Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const stat = customerStats[customer.customerId];
                  const userUsage = stat && customer.maxUsers ? Math.round((stat.userCount / customer.maxUsers) * 100) : 0;
                  return (
                    <TableRow key={customer.customerId} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                            {customer.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{customer.customerName}</p>
                            {customer.metadata?.companyName && <p className="text-xs text-purple-300">{customer.metadata.companyName}</p>}
                            <code className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono border border-purple-500/20 mt-0.5 inline-block">{customer.databaseName}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><p className="text-purple-200 text-sm">{customer.adminEmail}</p></TableCell>
                      <TableCell>
                        <Chip color={getStatusColor(customer.status)} variant="flat" size="sm" startContent={getStatusIcon(customer.status)} className="capitalize font-medium">
                          {customer.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Chip size="sm" variant="flat" color={customer.adminMfaEnabled !== false ? "success" : "default"} startContent={<ShieldCheckIcon className="w-3.5 h-3.5" />}>
                            Admin: {customer.adminMfaEnabled !== false ? "On" : "Off"}
                          </Chip>
                          <Chip size="sm" variant="flat" color={customer.userMfaEnabled !== false ? "success" : "default"} startContent={<ShieldCheckIcon className="w-3.5 h-3.5" />}>
                            User: {customer.userMfaEnabled !== false ? "On" : "Off"}
                          </Chip>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stat ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">{stat.adminCount} admin{stat.adminCount !== 1 ? "s" : ""}</span>
                            <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">{stat.userCount} user{stat.userCount !== 1 ? "s" : ""}</span>
                          </div>
                        ) : <span className="text-purple-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {stat ? <span className="text-sm font-semibold text-pink-300">{stat.leadCount.toLocaleString()}</span> : <span className="text-purple-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-xs text-purple-300">
                            <span>Users</span>
                            <span>{stat?.userCount ?? 0}/{customer.maxUsers ?? ""}</span>
                          </div>
                          <Progress size="sm" value={userUsage} color={userUsage >= 90 ? "danger" : userUsage >= 70 ? "warning" : "secondary"} className="max-w-full" />
                        </div>
                      </TableCell>
                      <TableCell><p className="text-sm text-purple-300">{new Date(customer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Tooltip content="Edit" size="sm" placement="top">
                            <Button isIconOnly size="sm" variant="light" onPress={() => openEditModal(customer)} className="text-purple-300 hover:text-blue-400 hover:bg-blue-500/20"><PencilSquareIcon className="w-4 h-4" /></Button>
                          </Tooltip>
                          <Tooltip content="Reset password" size="sm" placement="top">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleResetPassword(customer)} className="text-purple-300 hover:text-amber-400 hover:bg-amber-500/20"><KeyIcon className="w-4 h-4" /></Button>
                          </Tooltip>
                          <Tooltip content="Reset MFA" size="sm" placement="top">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleResetMfa(customer)} className="text-purple-300 hover:text-orange-400 hover:bg-orange-500/20"><ShieldExclamationIcon className="w-4 h-4" /></Button>
                          </Tooltip>
                          {customer.status !== "active" ? (
                            <Tooltip content="Activate" size="sm" placement="top">
                              <Button isIconOnly size="sm" variant="light" onPress={() => handleStatusChange(customer.customerId, "active")} className="text-purple-300 hover:text-green-400 hover:bg-green-500/20"><CheckCircleIcon className="w-4 h-4" /></Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Suspend" size="sm" placement="top">
                              <Button isIconOnly size="sm" variant="light" onPress={() => handleStatusChange(customer.customerId, "suspended")} className="text-purple-300 hover:text-orange-400 hover:bg-orange-500/20"><XCircleIcon className="w-4 h-4" /></Button>
                            </Tooltip>
                          )}
                          <Tooltip content="Delete" size="sm" placement="top">
                            <Button isIconOnly size="sm" variant="light" onPress={() => openDeleteModal(customer)} className="text-purple-300 hover:text-red-400 hover:bg-red-500/20"><TrashIcon className="w-4 h-4" /></Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Create/Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside" backdrop="blur">
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">{modalMode === "create" ? "Create New Customer" : "Edit Customer"}</h2>
              <p className="text-sm text-gray-500 font-normal">{modalMode === "create" ? "Set up a new customer organization with dedicated database" : "Update customer information"}</p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input label="Customer Name *" placeholder="Enter customer name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} variant="bordered" required />
                <Input label="Admin Email *" type="email" placeholder="admin@customer.com" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} variant="bordered" required />
                {modalMode === "create" && (
                  <Input
                    label="Admin Password *"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    variant="bordered"
                    required
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                      </button>
                    }
                  />
                )}
                {modalMode === "create" && (
                  <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-semibold text-gray-700">User & Admin Limits</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Max Users" type="number" value={String(formData.maxUsers)} onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 10 })} variant="bordered" min={1} />
                      <Input label="Max Admins" type="number" value={String(formData.maxAdmins)} onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) || 2 })} variant="bordered" min={1} />
                    </div>
                    <p className="text-xs text-gray-600">Controls how many users and admins can be created for this customer.</p>
                  </div>
                )}
                <div className="space-y-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><ShieldCheckIcon className="w-4 h-4 text-gray-500" /> Two-Factor Authentication (MFA)</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Admin MFA</p>
                      <p className="text-xs text-gray-500">{formData.adminMfaEnabled ? "Admins must set up TOTP" : "Admins can skip MFA"}</p>
                    </div>
                    <Switch isSelected={formData.adminMfaEnabled} onValueChange={(v) => setFormData({ ...formData, adminMfaEnabled: v })} color="success" size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">User MFA</p>
                      <p className="text-xs text-gray-500">{formData.userMfaEnabled ? "Users must set up TOTP" : "Users can skip MFA"}</p>
                    </div>
                    <Switch isSelected={formData.userMfaEnabled} onValueChange={(v) => setFormData({ ...formData, userMfaEnabled: v })} color="success" size="sm" />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Additional Information (Optional)</p>
                  <Input label="Company Name" placeholder="Official company name" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} variant="bordered" className="mb-3" />
                  <Input label="Phone" placeholder="Contact phone number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} variant="bordered" className="mb-3" />
                  <Textarea label="Address" placeholder="Company address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} variant="bordered" minRows={2} />
                </div>
                {modalMode === "create" && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800"><strong>Note:</strong> A dedicated database will be created with all required collections. The admin will have full access to manage their organization.</p>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>Cancel</Button>
              <Button
                color="primary"
                onPress={() => showConfirmation(modalMode === "create" ? `Create customer "${formData.customerName}"?` : `Update customer "${formData.customerName}"?`, modalMode === "create" ? handleCreateCustomer : handleUpdateCustomer)}
                isLoading={isSaving}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {modalMode === "create" ? "Create Customer" : "Update Customer"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Confirm Modal */}
        <Modal isOpen={isConfirmOpen} onClose={onConfirmClose} size="sm" backdrop="blur">
          <ModalContent>
            <ModalHeader><h2 className="text-xl font-bold">Confirm Action</h2></ModalHeader>
            <ModalBody><p className="text-gray-700">{confirmAction?.message}</p></ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => { onConfirmClose(); setConfirmAction(null); }}>Cancel</Button>
              <Button color="danger" onPress={performConfirmedAction}>Confirm</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="md">
          <ModalContent>
            <ModalHeader><h2 className="text-2xl font-bold text-danger">Delete Customer</h2></ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="p-4 bg-danger-50 rounded-lg border border-danger-200">
                  <p className="text-sm text-danger-800"><strong>Warning:</strong> This action cannot be undone!</p>
                </div>
                <p className="text-gray-700">Delete <strong>{selectedCustomer?.customerName}</strong>?</p>
                <p className="text-sm text-gray-600">This will permanently delete:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Database ({selectedCustomer?.databaseName})</li>
                  <li>All users and admins</li>
                  <li>All leads and meetings</li>
                  <li>All customer data</li>
                </ul>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onDeleteClose}>Cancel</Button>
              <Button color="danger" onPress={handleDeleteCustomer} startContent={<TrashIcon className="w-5 h-5" />}>Delete Permanently</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </div>
    </div>
  );
}
