"use client";
import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";

const UserFiltersContext = createContext(null);

export function UserFiltersProvider({ children, leads = [] }) {
  const filterRef = useRef(null);
  const [filters, setFilters] = useState({});

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      nameSearch: "",
      emailSearch: "",
      phoneSearch: "",
      statusFilter: "all",
      timeFilter: "all",
      dateRange: null,
      sourceFilter: "all",
      _cleared: Date.now(),
    };
    setFilters(clearedFilters);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.nameSearch?.trim()) count++;
    if (filters.emailSearch?.trim()) count++;
    if (filters.phoneSearch?.trim()) count++;
    if (filters.statusFilter && filters.statusFilter !== "all") count++;
    if (filters.timeFilter && filters.timeFilter !== "all") count++;
    if (filters.sourceFilter && filters.sourceFilter !== "all") count++;
    return count;
  }, [filters]);

  const openFilter = useCallback(() => {
    if (filterRef.current) {
      filterRef.current.openFilter();
    }
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      handleFiltersChange,
      handleClearFilters,
      activeFilterCount,
      filterRef,
      openFilter,
      leads,
    }),
    [filters, handleFiltersChange, handleClearFilters, activeFilterCount, openFilter, leads],
  );

  return (
    <UserFiltersContext.Provider value={value}>
      {children}
    </UserFiltersContext.Provider>
  );
}

export function useUserFilters() {
  const context = useContext(UserFiltersContext);
  if (!context) {
    throw new Error("useUserFilters must be used within a UserFiltersProvider");
  }
  return context;
}

export default UserFiltersContext;
