import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  DateRangePicker,
  Autocomplete,
  AutocompleteItem,
  Input,
  Select,
  SelectItem,
  Chip,
  Avatar,
} from "@heroui/react";
import {
  FunnelIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { I18nProvider } from "@react-aria/i18n";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import axios from "@/lib/axios";

const STATUS_OPTIONS = [
  { key: "all", label: "All Statuses" },
  { key: "New", label: "New" },
  { key: "Interested", label: "Interested" },
  { key: "Not Interested", label: "Not Interested" },
  { key: "Deal", label: "Deal" },
];

const TIME_FILTER_OPTIONS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

export default function AdminFilter({
  leads = [],
  onFiltersChange,
  currentFilters = {},
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Filter states
  const [nameSearch, setNameSearch] = useState(currentFilters.nameSearch || "");
  const [emailSearch, setEmailSearch] = useState(
    currentFilters.emailSearch || "",
  );
  const [phoneSearch, setPhoneSearch] = useState(
    currentFilters.phoneSearch || "",
  );
  const [assignedUserSearch, setAssignedUserSearch] = useState(
    currentFilters.assignedUserSearch || "",
  );
  const [statusFilter, setStatusFilter] = useState(
    currentFilters.statusFilter || "all",
  );
  const [timeFilter, setTimeFilter] = useState(
    currentFilters.timeFilter || "all",
  );
  const [dateRange, setDateRange] = useState(currentFilters.dateRange || null);
  const [sourcePlatform, setSourcePlatform] = useState(
    currentFilters.sourcePlatform || "",
  );

  // User data state
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await axios.get("admin/employees");
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Helper function to get user avatar
  const getUserAvatar = (user) => {
    if (user?.avatar && user.avatar.startsWith("data:image/")) {
      return user.avatar;
    }
    // Fallback to generated avatar
    const displayName = user?.name || user?.email?.split("@")[0] || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=ffffff&size=32&bold=true`;
  };

  // Extract unique options from leads data
  const nameOptions = useMemo(() => {
    const names = leads
      .map((lead) => lead.name)
      .filter((name) => name && typeof name === "string")
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .sort();
    return names.map((name) => ({ key: name, label: name }));
  }, [leads]);

  const emailOptions = useMemo(() => {
    const emails = leads
      .map((lead) => lead.email)
      .filter((email) => email && typeof email === "string")
      .filter((email, index, arr) => arr.indexOf(email) === index)
      .sort();
    return emails.map((email) => ({ key: email, label: email }));
  }, [leads]);

  const assignedUserOptions = useMemo(() => {
    // Create enhanced user options with name, email, and avatar
    return allUsers
      .map((user) => ({
        key: user.email, // Use email as key since that's what we filter by
        label: user.name || user.email, // Display name primarily, fallback to email
        email: user.email,
        name: user.name,
        avatar: getUserAvatar(user),
        searchText: `${user.name || ""} ${user.email || ""}`
          .toLowerCase()
          .trim(),
      }))
      .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  }, [allUsers]);

  const platformOptions = useMemo(() => {
    const platforms = leads
      .map((lead) => lead.sourcePlatform)
      .filter((platform) => platform && typeof platform === "string")
      .filter((platform, index, arr) => arr.indexOf(platform) === index)
      .sort();
    return [
      { key: "all", label: "All Platforms" },
      ...platforms.map((platform) => ({ key: platform, label: platform })),
    ];
  }, [leads]);

  const handleApplyFilters = () => {
    const filters = {
      nameSearch: nameSearch.trim(),
      emailSearch: emailSearch.trim(),
      phoneSearch: phoneSearch.trim(),
      assignedUserSearch: assignedUserSearch.trim(),
      statusFilter,
      timeFilter,
      dateRange,
      sourcePlatform,
    };

    if (onFiltersChange) {
      onFiltersChange(filters);
    }

    onOpenChange(false);
  };

  const handleClearFilters = () => {
    setNameSearch("");
    setEmailSearch("");
    setPhoneSearch("");
    setAssignedUserSearch("");
    setStatusFilter("all");
    setTimeFilter("all");
    setDateRange(null);
    setSourcePlatform("all");

    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      nameSearch.trim() ||
      emailSearch.trim() ||
      phoneSearch.trim() ||
      assignedUserSearch.trim() ||
      statusFilter !== "all" ||
      timeFilter !== "all" ||
      dateRange ||
      (sourcePlatform && sourcePlatform !== "all")
    );
  }, [
    nameSearch,
    emailSearch,
    phoneSearch,
    assignedUserSearch,
    statusFilter,
    timeFilter,
    dateRange,
    sourcePlatform,
  ]);

  return (
    <div className="flex">
      <div
        role="button"
        onClick={onOpen}
        className={`px-5 py-2 flex items-center justify-center rounded-lg relative ${
          hasActiveFilters
            ? "bg-primary-500 text-white shadow-lg"
            : "bg-[#c9d5e0] text-gray-800"
        } [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] cursor-pointer`}
      >
        <FunnelIcon className="w-5" />
        {hasActiveFilters && (
          <div className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            !
          </div>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="opaque"
        size="3xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-3 font-extrabold items-center">
                <UserGroupIcon className="w-8 text-primary" />
                Filter All Leads (Admin)
                {hasActiveFilters && (
                  <Chip color="primary" size="sm" variant="flat">
                    Active Filters
                  </Chip>
                )}
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search by Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Search by Name
                    </label>
                    <Autocomplete
                      placeholder="Type or select a name..."
                      value={nameSearch}
                      onInputChange={setNameSearch}
                      allowsCustomValue
                      size="sm"
                      variant="bordered"
                    >
                      {nameOptions.map((option) => (
                        <AutocompleteItem key={option.key} value={option.key}>
                          {option.label}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  </div>

                  {/* Search by Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Search by Email
                    </label>
                    <Autocomplete
                      placeholder="Type or select an email..."
                      value={emailSearch}
                      onInputChange={setEmailSearch}
                      allowsCustomValue
                      size="sm"
                      variant="bordered"
                    >
                      {emailOptions.map((option) => (
                        <AutocompleteItem key={option.key} value={option.key}>
                          {option.label}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  </div>

                  {/* Search by Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Search by Phone
                    </label>
                    <Input
                      placeholder="Enter phone number..."
                      value={phoneSearch}
                      onValueChange={setPhoneSearch}
                      size="sm"
                      variant="bordered"
                    />
                  </div>

                  {/* Search by Assigned User */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Assigned To
                    </label>
                    <Autocomplete
                      placeholder="Type user name or email..."
                      value={assignedUserSearch}
                      onInputChange={setAssignedUserSearch}
                      allowsCustomValue
                      size="sm"
                      variant="bordered"
                      isLoading={isLoadingUsers}
                      items={assignedUserOptions}
                      inputProps={{
                        classNames: {
                          input: "text-sm",
                          inputWrapper: "h-10",
                        },
                      }}
                      onSelectionChange={(key) => {
                        if (key) {
                          const selectedUser = assignedUserOptions.find(
                            (user) => user.key === key,
                          );
                          if (selectedUser) {
                            setAssignedUserSearch(
                              selectedUser.name || selectedUser.email,
                            );
                          }
                        }
                      }}
                    >
                      {(user) => (
                        <AutocompleteItem
                          key={user.key}
                          value={user.key}
                          textValue={user.searchText}
                          className="py-2"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={user.avatar}
                              name={user.name || user.email}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {user.name || "No Name"}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <Select
                      selectedKeys={[statusFilter]}
                      onSelectionChange={(keys) =>
                        setStatusFilter(Array.from(keys)[0])
                      }
                      size="sm"
                      variant="bordered"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Source Platform Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Source Platform
                    </label>
                    <Select
                      selectedKeys={sourcePlatform ? [sourcePlatform] : ["all"]}
                      onSelectionChange={(keys) =>
                        setSourcePlatform(Array.from(keys)[0])
                      }
                      size="sm"
                      variant="bordered"
                    >
                      {platformOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Time Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Time Period
                  </label>
                  <Select
                    selectedKeys={[timeFilter]}
                    onSelectionChange={(keys) =>
                      setTimeFilter(Array.from(keys)[0])
                    }
                    size="sm"
                    variant="bordered"
                  >
                    {TIME_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Custom Date Range */}
                {timeFilter === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Custom Date Range
                    </label>
                    <I18nProvider locale="en-GB">
                      <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        maxValue={today(getLocalTimeZone())}
                        size="sm"
                        variant="bordered"
                        visibleMonths={1}
                      />
                    </I18nProvider>
                  </div>
                )}

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Active Filters
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {nameSearch.trim() && (
                        <Chip color="primary" size="sm" variant="flat">
                          Name: {nameSearch}
                        </Chip>
                      )}
                      {emailSearch.trim() && (
                        <Chip color="primary" size="sm" variant="flat">
                          Email: {emailSearch}
                        </Chip>
                      )}
                      {phoneSearch.trim() && (
                        <Chip color="primary" size="sm" variant="flat">
                          Phone: {phoneSearch}
                        </Chip>
                      )}
                      {assignedUserSearch.trim() && (
                        <Chip color="primary" size="sm" variant="flat">
                          Assigned: {assignedUserSearch}
                        </Chip>
                      )}
                      {statusFilter !== "all" && (
                        <Chip color="secondary" size="sm" variant="flat">
                          Status:{" "}
                          {
                            STATUS_OPTIONS.find((s) => s.key === statusFilter)
                              ?.label
                          }
                        </Chip>
                      )}
                      {timeFilter !== "all" && (
                        <Chip color="warning" size="sm" variant="flat">
                          Time:{" "}
                          {
                            TIME_FILTER_OPTIONS.find(
                              (t) => t.key === timeFilter,
                            )?.label
                          }
                        </Chip>
                      )}
                      {sourcePlatform && sourcePlatform !== "all" && (
                        <Chip color="success" size="sm" variant="flat">
                          Platform: {sourcePlatform}
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={handleClearFilters}
                  startContent={<XMarkIcon className="w-4 h-4" />}
                >
                  Clear All
                </Button>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleApplyFilters}>
                  Apply Filters
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
