import React, { useCallback, useEffect, useState, useMemo } from "react";
import axios from "@/lib/axios";
import Filter from "./ui/filter";
import AutoLoad from "./AutoLoad";
import {
  StarIcon,
  SparklesIcon,
  FireIcon,
  XCircleIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  FunnelIcon,
} from "@heroicons/react/24/solid";
import {
  getLocalTimeZone,
  today,
  startOfWeek,
  startOfMonth,
  startOfYear,
  parseDate,
} from "@internationalized/date";
import { Tabs, Tab } from "@heroui/react";

export default function Leads({
  favorites: externalFavorites,
  onToggleFavorite: externalToggleFavorite,
  showFavoritesOnly: initialShowFavoritesOnly = false,
  hideHeader = false,
  externalFilters = {},
  onClearFilters,
}) {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filters, setFilters] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(
    initialShowFavoritesOnly,
  );
  const [quickFilter, setQuickFilter] = useState("all");

  // Check if using external filters
  const hasExternalFilters = useMemo(() => {
    return externalFilters && Object.keys(externalFilters).length > 0;
  }, [externalFilters]);

  const resolveLeadId = useCallback((lead) => {
    if (!lead) return null;

    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }

    return lead?._id ?? lead?.id ?? null;
  }, []);

  // Sync external favorites if provided
  useEffect(() => {
    if (externalFavorites) {
      setFavorites(externalFavorites);
    }
  }, [externalFavorites]);

  // Sync showFavoritesOnly from prop
  useEffect(() => {
    setShowFavoritesOnly(initialShowFavoritesOnly);
  }, [initialShowFavoritesOnly]);

  // Sync external filters
  useEffect(() => {
    if (externalFilters && Object.keys(externalFilters).length > 0) {
      setFilters(externalFilters);
    }
  }, [externalFilters]);

  // Load favorites from localStorage (only if not using external favorites)
  useEffect(() => {
    if (!externalFavorites) {
      const savedFavorites = localStorage.getItem("leadRabbit_favorites");
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (error) {
          console.error("Error loading favorites:", error);
          setFavorites([]);
        }
      }
    }
  }, [externalFavorites]);

  // Save favorites to localStorage whenever favorites change (only if not using external)
  useEffect(() => {
    if (!externalFavorites) {
      localStorage.setItem("leadRabbit_favorites", JSON.stringify(favorites));
    }
  }, [favorites, externalFavorites]);

  // Apply filters whenever leads or filters change
  useEffect(() => {
    let filtered = [...leads];

    // Apply quick filter first
    if (quickFilter && quickFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === quickFilter);
    }

    // Apply favorites filter if enabled
    if (showFavoritesOnly) {
      filtered = filtered.filter((lead) => {
        const leadId = resolveLeadId(lead);
        return favorites.includes(leadId);
      });
    }

    // Apply name filter
    if (filters.nameSearch?.trim()) {
      const searchTerm = filters.nameSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.name?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply email filter
    if (filters.emailSearch?.trim()) {
      const searchTerm = filters.emailSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.email?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply phone filter
    if (filters.phoneSearch?.trim()) {
      const searchTerm = filters.phoneSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.phone?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== "all") {
      filtered = filtered.filter(
        (lead) => lead.status === filters.statusFilter,
      );
    }

    // Apply source platform filter
    if (filters.sourcePlatform && filters.sourcePlatform !== "all") {
      filtered = filtered.filter(
        (lead) => lead.sourcePlatform === filters.sourcePlatform,
      );
    }

    // Apply time filter
    if (filters.timeFilter && filters.timeFilter !== "all") {
      const now = new Date();
      const timezone = getLocalTimeZone();

      let startDate;

      switch (filters.timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          const startOfCurrentWeek = startOfWeek(today(timezone), "en-US");
          startDate = new Date(
            startOfCurrentWeek.year,
            startOfCurrentWeek.month - 1,
            startOfCurrentWeek.day,
          );
          break;
        case "month":
          const startOfCurrentMonth = startOfMonth(today(timezone));
          startDate = new Date(
            startOfCurrentMonth.year,
            startOfCurrentMonth.month - 1,
            startOfCurrentMonth.day,
          );
          break;
        case "quarter":
          const currentMonth = now.getMonth();
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          break;
        case "year":
          const startOfCurrentYear = startOfYear(today(timezone));
          startDate = new Date(startOfCurrentYear.year, 0, 1);
          break;
        case "custom":
          if (filters.dateRange?.start && filters.dateRange?.end) {
            const startCalDate = filters.dateRange.start;
            const endCalDate = filters.dateRange.end;

            const customStartDate = new Date(
              startCalDate.year,
              startCalDate.month - 1,
              startCalDate.day,
            );
            const customEndDate = new Date(
              endCalDate.year,
              endCalDate.month - 1,
              endCalDate.day + 1,
            ); // Include end date

            filtered = filtered.filter((lead) => {
              const leadDate = new Date(lead.createdAt || lead.timestamp);
              return leadDate >= customStartDate && leadDate < customEndDate;
            });
          }
          break;
        default:
          break;
      }

      if (startDate && filters.timeFilter !== "custom") {
        filtered = filtered.filter((lead) => {
          const leadDate = new Date(lead.createdAt || lead.timestamp);
          return leadDate >= startDate;
        });
      }
    }

    setFilteredLeads(filtered);
  }, [
    leads,
    filters,
    favorites,
    showFavoritesOnly,
    quickFilter,
    resolveLeadId,
  ]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const toggleFavorite = useCallback(
    (leadId) => {
      if (!leadId) return;

      // Use external toggle function if provided
      if (externalToggleFavorite) {
        externalToggleFavorite(leadId);
        return;
      }

      setFavorites((prev) => {
        if (prev.includes(leadId)) {
          // Remove from favorites
          return prev.filter((id) => id !== leadId);
        } else {
          // Add to favorites
          return [...prev, leadId];
        }
      });
    },
    [externalToggleFavorite],
  );

  const toggleFavoritesView = useCallback(() => {
    setShowFavoritesOnly((prev) => !prev);
  }, []);

  useEffect(() => {
    const fetchLeadsForUser = async () => {
      try {
        setIsLoading(true);
        setFetchError("");

        const profileResponse = await axios.get("me");
        const profileEmail = profileResponse.data?.email ?? "";
        const profileName = profileResponse.data?.name ?? "";

        setEmail(profileEmail);
        setUserName(profileName);

        if (!profileEmail) {
          setLeads([]);
          setIsLoading(false);
          return;
        }

        const leadsResponse = await axios.get(
          `leads/getLeads?email=${encodeURIComponent(profileEmail)}`,
        );

        setLeads(leadsResponse.data ?? []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching leads:", error);
        setLeads([]);
        setFetchError("Unable to load leads right now.");
        setIsLoading(false);
      }
    };

    fetchLeadsForUser();
  }, []);

  const handleLeadStatusChange = useCallback(
    async (leadId, nextStatus) => {
      if (!leadId) return;

      let previousStatus = null;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            previousStatus = lead.status ?? null;

            return { ...lead, status: nextStatus };
          }

          return lead;
        }),
      );

      try {
        await axios.patch("leads/updateStatus", {
          leadId,
          status: nextStatus,
        });
      } catch (error) {
        console.error("Failed to update lead status:", error);

        if (previousStatus) {
          setLeads((prev) =>
            prev.map((lead) => {
              const currentId = resolveLeadId(lead);

              return currentId === leadId
                ? { ...lead, status: previousStatus }
                : lead;
            }),
          );
        }
      }
    },
    [resolveLeadId],
  );

  const handleLeadMeetingsChange = useCallback(
    (leadId, nextMeetings) => {
      if (!leadId) return;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            return {
              ...lead,
              meetings: Array.isArray(nextMeetings) ? nextMeetings : [],
            };
          }

          return lead;
        }),
      );
    },
    [resolveLeadId],
  );

  const handleLeadEngagementsChange = useCallback(
    (leadId, nextEngagements) => {
      if (!leadId) return;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            return {
              ...lead,
              engagements: Array.isArray(nextEngagements)
                ? nextEngagements
                : [],
            };
          }

          return lead;
        }),
      );
    },
    [resolveLeadId],
  );

  const renderEmptyState = () => (
    <div className="mt-20 text-center">
      <img
        src="/img/stickers/noLeads.svg"
        alt="No leads"
        className="mx-auto mb-4 w-[20rem]"
      />
      <p className="text-lg">
        {showFavoritesOnly ? "No Favorite Leads Yet!" : "No Leads Available !!"}
      </p>
      {email && (
        <p className="text-sm text-gray-500">Assigned email: {email}</p>
      )}
      {fetchError && <p className="mt-2 text-sm text-red-500">{fetchError}</p>}
      {showFavoritesOnly && (
        <p className="mt-2 text-sm text-gray-600">
          Click the star icon next to leads to add them to favorites
        </p>
      )}
    </div>
  );

  // Count stats for display
  const totalLeads = leads.length;
  const favoriteLeads = favorites.length;
  const filteredCount = filteredLeads.length;

  return (
    <div>
      {!hideHeader && (
        <>
          <div className="relative h-[5rem] ">
            <div className="bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] w-full h-full rounded-2xl flex items-center pl-5">
              <div>
                <div className="">
                  {userName ? `Hi, ${userName}` : "Welcome"}
                </div>
                <div className="font-black upp">Your Tasks</div>
              </div>
            </div>

            <div className="absolute bottom-0 -right-1">
              <img
                src="/img/stickers/bunnyChar.png"
                alt=""
                className="w-[10rem]"
              />
            </div>
          </div>
          <div className="flex justify-between py-3">
            {/* Only show internal filter if not using external filters */}
            {!hasExternalFilters && (
              <Filter
                leads={leads}
                onFiltersChange={handleFiltersChange}
                currentFilters={filters}
              />
            )}
            <div
              className={`flex gap-2 ${hasExternalFilters ? "ml-auto" : ""}`}
            >
              {/* Favorites count indicator */}
              {favoriteLeads > 0 && (
                <div className="flex items-center text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded-lg">
                  <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
                  {favoriteLeads} favorites
                </div>
              )}

              {/* Filter results count */}
              {(Object.keys(filters).length > 0 || showFavoritesOnly) && (
                <div className="flex items-center text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
                  {filteredCount} of {totalLeads} leads
                </div>
              )}

              {/* Favorites toggle button */}
              <div
                role="button"
                onClick={toggleFavoritesView}
                className={`flex cursor-pointer items-center justify-center rounded-lg px-5 py-2 [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] ${
                  showFavoritesOnly ? "" : "bg-[#c9d5e0] text-gray-800"
                }`}
                title={
                  showFavoritesOnly ? "Show all leads" : "Show favorites only"
                }
              >
                <StarIcon
                  className={`w-5 ${showFavoritesOnly ? "text-yellow-900" : "text-gray-800"}`}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Filter Tabs - Only show when not using external filters */}
      {!hasExternalFilters ? (
        <div className="mb-4 ">
          <Tabs
            aria-label="Quick filter tabs"
            selectedKey={quickFilter}
            onSelectionChange={setQuickFilter}
            variant="solid"
            className="w-full flex justify-center items-center"
          >
            <Tab
              key="all"
              title={
                <div className="flex items-center gap-1">
                  <Squares2X2Icon className="w-4 h-4" />
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {leads.length}
                  </span>
                </div>
              }
            />
            <Tab
              key="New"
              title={
                <div className="flex items-center gap-1">
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {leads.filter((l) => l.status === "New").length}
                  </span>
                </div>
              }
            />
            <Tab
              key="Interested"
              title={
                <div className="flex items-center gap-1">
                  <FireIcon className="w-4 h-4" />
                  <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {leads.filter((l) => l.status === "Interested").length}
                  </span>
                </div>
              }
            />
            <Tab
              key="Not Interested"
              title={
                <div className="flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" />
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {leads.filter((l) => l.status === "Not Interested").length}
                  </span>
                </div>
              }
            />
            <Tab
              key="Deal"
              title={
                <div className="flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {leads.filter((l) => l.status === "Deal").length}
                  </span>
                </div>
              }
            />
          </Tabs>
        </div>
      ) : (
        <div className="mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <FunnelIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Filters Applied
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {filteredCount} {filteredCount === 1 ? "lead" : "leads"}{" "}
                    found
                  </p>
                </div>
              </div>
              <button
                onClick={onClearFilters}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-200 active:scale-95"
              >
                <XCircleIcon className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="">
        {isLoading ? (
          <div className="flex w-full justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : filteredLeads.length > 0 ? (
          <AutoLoad
            leads={filteredLeads}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onStatusChange={handleLeadStatusChange}
            onMeetingsChange={handleLeadMeetingsChange}
            onEngagementsChange={handleLeadEngagementsChange}
          />
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
}
