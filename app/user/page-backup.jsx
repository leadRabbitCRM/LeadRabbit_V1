"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import LeadManager from "../../components/shared/leads/LeadManager";
import { ModernWidget } from "../../components/ui/ModernWidget";
import Filter from "../../components/shared/leads/ui/Filter";
import UserProfilePage from "./profile/page";
import axios from "@/lib/axios";
import { useRouter } from "next/navigation";
import {
  HomeIcon,
  UserGroupIcon,
  FunnelIcon,
  StarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  FunnelIcon as FunnelIconSolid,
  StarIcon as StarIconSolid,
  UserIcon as UserIconSolid,
} from "@heroicons/react/24/solid";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
  Button,
  Divider,
} from "@heroui/react";
import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/solid";

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const filterButtonRef = useRef(null);
  const [stats, setStats] = useState({
    totalLeads: "0",
    newLeads: "0",
    interestedLeads: "0",
    notInterestedLeads: "0",
    dealClosedLeads: "0",
  });
  const [previousStats, setPreviousStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem("leadRabbit_favorites");
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (error) {
        console.error("Error parsing favorites:", error);
      }
    }
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("me");
        setUserProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Fetch leads and calculate stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);

        // Get current user's email
        const profileResponse = await axios.get("me");
        const userEmail = profileResponse.data?.email;

        if (!userEmail) {
          setIsLoadingStats(false);
          return;
        }

        // Fetch leads for this user
        const response = await axios.get(
          `/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
        );
        const leadsData = response.data || [];
        setLeads(leadsData);

        // Calculate current stats
        const totalLeads = leadsData.length;
        const newLeads = leadsData.filter(
          (lead) => lead.status === "New",
        ).length;
        const interestedLeads = leadsData.filter(
          (lead) => lead.status === "Interested",
        ).length;
        const notInterestedLeads = leadsData.filter(
          (lead) => lead.status === "Not Interested",
        ).length;
        const dealClosedLeads = leadsData.filter(
          (lead) => lead.status === "Deal",
        ).length;

        const currentStats = {
          totalLeads: totalLeads.toString(),
          newLeads: newLeads.toString(),
          interestedLeads: interestedLeads.toString(),
          notInterestedLeads: notInterestedLeads.toString(),
          dealClosedLeads: dealClosedLeads.toString(),
        };

        setStats(currentStats);

        // Store current stats for comparison next time
        const storedStats = localStorage.getItem("userDashboardStats");
        if (storedStats) {
          setPreviousStats(JSON.parse(storedStats));
        }
        localStorage.setItem(
          "userDashboardStats",
          JSON.stringify(currentStats),
        );
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Calculate trend
  const calculateTrend = useCallback((current, previous) => {
    if (!previous) return { percentage: 0, isPositive: true };

    const curr = parseInt(current) || 0;
    const prev = parseInt(previous) || 0;

    if (prev === 0) return { percentage: 0, isPositive: true };

    const percentage = Math.round(((curr - prev) / prev) * 100);
    return {
      percentage: Math.abs(percentage),
      isPositive: curr >= prev,
    };
  }, []);

  const totalLeadsTrend = previousStats
    ? calculateTrend(stats.totalLeads, previousStats.totalLeads)
    : null;

  const newLeadsTrend = previousStats
    ? calculateTrend(stats.newLeads, previousStats.newLeads)
    : null;

  const interestedLeadsTrend = previousStats
    ? calculateTrend(stats.interestedLeads, previousStats.interestedLeads)
    : null;

  const notInterestedLeadsTrend = previousStats
    ? calculateTrend(stats.notInterestedLeads, previousStats.notInterestedLeads)
    : null;

  const dealClosedLeadsTrend = previousStats
    ? calculateTrend(stats.dealClosedLeads, previousStats.dealClosedLeads)
    : null;

  // Toggle favorite
  const handleToggleFavorite = useCallback((leadId) => {
    setFavorites((prevFavorites) => {
      const newFavorites = prevFavorites.includes(leadId)
        ? prevFavorites.filter((id) => id !== leadId)
        : [...prevFavorites, leadId];
      localStorage.setItem(
        "leadRabbit_favorites",
        JSON.stringify(newFavorites),
      );
      return newFavorites;
    });
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  // Handle menu actions
  const handleMenuAction = useCallback((key) => {
    if (key === "profile" || key === "settings") {
      setActiveTab("profile");
      return;
    }
    if (key === "team_settings") {
      setActiveTab("leads");
      return;
    }
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.nameSearch?.trim()) count++;
    if (filters.emailSearch?.trim()) count++;
    if (filters.phoneSearch?.trim()) count++;
    if (filters.statusFilter && filters.statusFilter !== "all") count++;
    if (filters.timeFilter && filters.timeFilter !== "all") count++;
    if (filters.sourcePlatform && filters.sourcePlatform !== "all") count++;
    return count;
  }, [filters]);

  // Filter leads for favorites view
  const favoriteLeads = leads.filter((lead) => {
    const leadId = lead._id?.toString() || lead.id;
    return favorites.includes(leadId);
  });

  const tabs = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: HomeIcon,
      iconActive: HomeIconSolid,
    },
    {
      id: "leads",
      name: "Leads",
      icon: UserGroupIcon,
      iconActive: UserGroupIconSolid,
    },
    {
      id: "filter",
      name: "Filter",
      icon: FunnelIcon,
      iconActive: FunnelIconSolid,
      isModal: true, // This will trigger the filter button click
    },
    {
      id: "favorites",
      name: "Favorites",
      icon: StarIcon,
      iconActive: StarIconSolid,
    },
    {
      id: "profile",
      name: "Profile",
      icon: UserIcon,
      iconActive: UserIconSolid,
    },
  ];

  const handleTabClick = (tabId, isModal) => {
    if (isModal && filterButtonRef.current) {
      // Trigger the existing Filter component's modal
      filterButtonRef.current.openFilter();
    } else if (tabId === "leads") {
      // Navigate to dedicated leads page
      router.push("/user/allLeads");
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      {/* Hidden Filter Component - Only for triggering modal */}
      <div className="hidden">
        <Filter
          ref={filterButtonRef}
          leads={leads}
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
        />
      </div>

      {/* Tab Content - Scrollable */}
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
              <div className="px-4 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">
                      {getGreeting()} 👋
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      {userProfile?.name || "User"}
                    </h1>
                    <p className="text-blue-100 text-sm">
                      Here's your performance overview
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-white">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 py-5">
              <div className="grid grid-cols-2 gap-3">
                <ModernWidget
                  count={stats.totalLeads}
                  label="Total Leads"
                  trend={totalLeadsTrend}
                  color="blue"
                />
                <ModernWidget
                  count={stats.newLeads}
                  label="New Leads"
                  trend={newLeadsTrend}
                  color="green"
                />
                <ModernWidget
                  count={stats.interestedLeads}
                  label="Interested"
                  trend={interestedLeadsTrend}
                  color="purple"
                />
                <ModernWidget
                  count={stats.notInterestedLeads}
                  label="Not Interested"
                  trend={notInterestedLeadsTrend}
                  color="orange"
                />
                <div className="col-span-2">
                  <ModernWidget
                    count={stats.dealClosedLeads}
                    label="Deals Closed"
                    trend={dealClosedLeadsTrend}
                    color="pink"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600">
              <div className="px-4 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">
                      {getGreeting()} 👋
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      All Leads
                    </h1>
                    <p className="text-emerald-100 text-sm">
                      Manage and track your leads
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-white">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-1 my-2">
              <LeadManager
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                hideHeader={true}
                externalFilters={filters}
                onClearFilters={handleClearFilters}
                isAdmin={false}
              />
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-600">
              <div className="px-4 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">
                      {getGreeting()} 👋
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Favorites
                    </h1>
                    <p className="text-amber-100 text-sm">
                      Your starred leads ({favorites.length})
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-white">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-1 my-2">
              <LeadManager
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                showFavoritesOnly={true}
                hideHeader={true}
                externalFilters={filters}
                onClearFilters={handleClearFilters}
                isAdmin={false}
              />
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="h-full overflow-y-auto">
            <UserProfilePage />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-around px-2 py-1">
            {/* Dashboard Tab */}
            {tabs.slice(0, 1).map((tab) => {
              const isActive = activeTab === tab.id && !tab.isModal;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.isModal)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* Leads Tab */}
            {tabs.slice(1, 2).map((tab) => {
              const isActive = activeTab === tab.id && !tab.isModal;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.isModal)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* Profile Dropdown - Middle Position (Bigger) */}
            <Dropdown placement="top">
              <DropdownTrigger>
                <button className="flex flex-col items-center justify-center min-w-[70px] -mt-4 transition-all duration-200 active:scale-95">
                  <div className="relative">
                    <Badge
                      color={userProfile?.isOnline ? "success" : "default"}
                      content=""
                      placement="bottom-right"
                      shape="circle"
                      size="sm"
                    >
                      <Avatar
                        size="md"
                        isBordered
                        name={userProfile?.name}
                        src={
                          userProfile?.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.name || userProfile?.email || "User")}`
                        }
                        className="w-14 h-14"
                      />
                    </Badge>
                    {userProfile?.isVerified && (
                      <span className="absolute -top-0.5 -right-0.5 rounded-full bg-white p-[2px] text-blue-500 shadow-sm">
                        <CheckBadgeIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 mt-0.5">
                    Profile
                  </span>
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="User Actions"
                variant="flat"
                onAction={handleMenuAction}
              >
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-bold">Signed in as</p>
                  <p className="font-bold">
                    {userProfile?.email?.split("@")[0]
                      ? `@${userProfile.email.split("@")[0]}`
                      : (userProfile?.email ?? "Unknown")}
                  </p>
                </DropdownItem>
                <DropdownItem key="settings">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 text-slate-400" />
                    <p>My Profile</p>
                  </div>
                </DropdownItem>
                <DropdownItem key="team_settings">
                  <div className="flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-5 text-slate-400" />
                    <p>My Tasks</p>
                  </div>
                </DropdownItem>
                <DropdownItem key="logout" color="danger">
                  <Divider className="mb-2" orientation="horizontal" />
                  <Button
                    className="w-full text-left"
                    color="danger"
                    isDisabled={isLoggingOut}
                    variant="flat"
                    onClick={handleLogout}
                  >
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Filter Tab */}
            {tabs.slice(2, 3).map((tab) => {
              const isActive = activeTab === tab.id && !tab.isModal;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.isModal)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 relative ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                  {activeFilterCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {activeFilterCount}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Favorites Tab */}
            {tabs.slice(3, 4).map((tab) => {
              const isActive = activeTab === tab.id && !tab.isModal;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.isModal)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
