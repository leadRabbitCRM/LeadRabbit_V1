import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Autocomplete,
  AutocompleteItem,
  Avatar,
  Chip,
  useDisclosure,
  Card,
  CardBody,
} from "@heroui/react";
import { UserIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import axios from "@/lib/axios";

export default function LeadAssignment({ lead, onAssignmentChange, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const confirmModal = useDisclosure();
  const removeModal = useDisclosure();

  // Fetch users on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("admin/employees");

      setUsers(response.data.users || []);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarSrc = (user) => {
    if (user?.avatar && user.avatar.startsWith("data:image/")) {
      return user.avatar;
    }
    const name =
      user?.name || user?.assignedToName || user?.assignedTo || "Unknown";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ade80&color=ffffff&size=128&bold=true`;
  };

  const getAssignedUserAvatar = (lead) => {
    // Try to find the user in our users array first
    const assignedUser = users.find((user) => user.email === lead.assignedTo);
    if (assignedUser?.avatar && assignedUser.avatar.startsWith("data:image/")) {
      return assignedUser.avatar;
    }
    // Fallback to generated avatar
    const name = lead.assignedToName || lead.assignedTo;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ade80&color=ffffff&size=128&bold=true`;
  };

  const handleUserSelect = (key) => {
    const user = users.find((usr) => usr.email === key);
    setSelectedUser(user);
    if (user) {
      confirmModal.onOpen();
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedUser) return;

    try {
      setIsAssigning(true);
      const response = await axios.patch(`leads/${lead._id}/assign`, {
        assignedTo: selectedUser.email,
      });

      if (response.data.success) {
        onAssignmentChange &&
          onAssignmentChange({
            ...lead,
            assignedTo: selectedUser.email,
            assignedToName: selectedUser.name,
          });
      }

      confirmModal.onClose();
      setSelectedUser(null);
    } catch (error) {
      console.error("Error assigning lead:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async () => {
    try {
      setIsAssigning(true);
      const response = await axios.patch(`leads/${lead._id}/assign`, {
        assignedTo: null,
      });

      if (response.data.success) {
        onAssignmentChange &&
          onAssignmentChange({
            ...lead,
            assignedTo: null,
            assignedToName: null,
          });
      }
      removeModal.onClose();
    } catch (error) {
      console.error("Error removing assignment:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveClick = () => {
    removeModal.onOpen();
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              Lead Assignment
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage lead ownership and responsibility
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Warning about round robin */}
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-800 font-medium">
                  Round Robin Assignment Notice
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  There is a round robin logic which assigns lead tickets
                  automatically. Use this manual assignment to override the
                  automatic assignment when needed.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Current Assignment Status */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-500 mb-3 block">
            Current Assignment:
          </span>
          {lead.assignedTo ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 sm:p-4 relative">
              {/* Remove Button - Top Right */}
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="flat"
                onPress={handleRemoveClick}
                className="absolute top-2 right-2 min-w-8 h-8 z-10"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>

              <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row pr-10">
                <div className="relative flex-shrink-0 self-start">
                  <img
                    src={getAssignedUserAvatar(lead)}
                    alt={lead.assignedToName || lead.assignedTo}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-green-200"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg
                      className="w-2 h-2 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {lead.assignedToName || lead.assignedTo}
                    </h4>
                    <Chip
                      size="sm"
                      color="success"
                      variant="flat"
                      className="text-xs"
                    >
                      Assigned
                    </Chip>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 break-all">
                    {lead.assignedTo}
                  </p>
                  {lead.assignedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned on{" "}
                      {new Date(lead.assignedAt).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
                <div className="w-12 h-12 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-gray-600 text-sm sm:text-base">
                      Unassigned
                    </h4>
                    <Chip
                      size="sm"
                      color="default"
                      variant="flat"
                      className="text-xs"
                    >
                      Available
                    </Chip>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    This lead is not assigned to any user
                  </p>
                </div>
                <div className="text-gray-400 self-start sm:self-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignment Control */}
        {!lead.assignedTo ? (
          <Autocomplete
            label="Assign to User"
            placeholder="Search and select a user..."
            isLoading={isLoading}
            onSelectionChange={handleUserSelect}
            className="w-full"
            variant="bordered"
            startContent={<UserIcon className="w-4 h-4 text-gray-400" />}
          >
            {users.map((user) => {
              const avatarSrc =
                user.avatar && user.avatar.startsWith("data:image/")
                  ? user.avatar
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff&size=64&bold=true`;

              return (
                <AutocompleteItem
                  key={user.email}
                  value={user.email}
                  textValue={user.name}
                  startContent={
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatarSrc}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                    </div>
                  }
                >
                  <div className="flex flex-col py-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {user.name}
                      </span>
                      <Chip
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="capitalize text-xs flex-shrink-0"
                      >
                        {user.role}
                      </Chip>
                    </div>
                    <span className="text-xs text-gray-500 truncate">
                      {user.email}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs text-gray-400">Available</span>
                    </div>
                  </div>
                </AutocompleteItem>
              );
            })}
          </Autocomplete>
        ) : (
          <div className="space-y-3">
            <Autocomplete
              label="Reassign to User"
              placeholder="Search and select a user..."
              isLoading={isLoading}
              onSelectionChange={handleUserSelect}
              className="w-full"
              variant="bordered"
              startContent={<UserIcon className="w-4 h-4 text-gray-400" />}
            >
              {users.map((user) => {
                const avatarSrc =
                  user.avatar && user.avatar.startsWith("data:image/")
                    ? user.avatar
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff&size=64&bold=true`;

                return (
                  <AutocompleteItem
                    key={user.email}
                    value={user.email}
                    textValue={user.name}
                    startContent={
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarSrc}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                      </div>
                    }
                  >
                    <div className="flex flex-col py-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {user.name}
                        </span>
                        <Chip
                          size="sm"
                          color="primary"
                          variant="flat"
                          className="capitalize text-xs flex-shrink-0"
                        >
                          {user.role}
                        </Chip>
                      </div>
                      <span className="text-xs text-gray-500 truncate">
                        {user.email}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="text-xs text-gray-400">Available</span>
                      </div>
                    </div>
                  </AutocompleteItem>
                );
              })}
            </Autocomplete>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onOpenChange={confirmModal.onOpenChange}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  {lead.assignedTo
                    ? "Confirm Lead Reassignment"
                    : "Confirm Lead Assignment"}
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    {lead.assignedTo
                      ? "You are about to reassign this lead to:"
                      : "You are about to assign this lead to:"}
                  </p>
                  {selectedUser && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={
                              selectedUser.avatar &&
                              selectedUser.avatar.startsWith("data:image/")
                                ? selectedUser.avatar
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=3b82f6&color=ffffff&size=128&bold=true`
                            }
                            alt={selectedUser.name}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-200"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {selectedUser.name}
                            </h3>
                            <Chip
                              size="sm"
                              color="primary"
                              variant="flat"
                              className="capitalize"
                            >
                              {selectedUser.role}
                            </Chip>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {selectedUser.email}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        <strong>Currently assigned to:</strong>{" "}
                        {lead.assignedToName || lead.assignedTo}
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Lead Details:</strong> {lead.name} ({lead.email})
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmAssignment}
                  isLoading={isAssigning}
                >
                  {lead.assignedTo
                    ? "Confirm Reassignment"
                    : "Confirm Assignment"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Remove Assignment Confirmation Modal */}
      <Modal
        isOpen={removeModal.isOpen}
        onOpenChange={removeModal.onOpenChange}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 13.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Remove Lead Assignment
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Are you sure you want to remove the assignment for this
                    lead?
                  </p>

                  {/* Current Assignment Display */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAssignedUserAvatar(lead)}
                        alt={lead.assignedToName || lead.assignedTo}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-red-200"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {lead.assignedToName || lead.assignedTo}
                        </p>
                        <p className="text-sm text-gray-500">
                          {lead.assignedTo}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Lead:</strong> {lead.name} ({lead.email})
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      <strong>Note:</strong> This lead will become unassigned
                      and available for the round robin system.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleRemoveAssignment}
                  isLoading={isAssigning}
                >
                  Remove Assignment
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
