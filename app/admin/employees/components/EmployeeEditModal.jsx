"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Spinner,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from "@heroui/react";
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";

const genderOptions = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

const qualificationOptions = [
  { key: "10th", label: "10th" },
  { key: "puc", label: "PUC" },
  { key: "degree", label: "Degree" },
  { key: "post graduation", label: "Post Graduation" },
];

const initialFormState = {
  fullName: "",
  email: "",
  mobileNumber: "",
  dateOfBirth: "",
  gender: "",
  currentAddress: "",
  permanentAddress: "",
  highestQualification: "",
  aadhaarNumber: "",
  panNumber: "",
};

export default function EmployeeEditModal({
  isOpen,
  onOpenChange,
  employee,
  isLoading,
  isSaving,
  onSave,
}) {
  const [formData, setFormData] = useState(initialFormState);

  const user = employee?.user ?? null;
  const profile = employee?.profile ?? null;

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormState);
      return;
    }

    if (!employee) return;

    setFormData({
      fullName: profile?.fullName ?? user?.name ?? "",
      email: user?.email ?? "",
      mobileNumber: profile?.mobileNumber ?? user?.mobileNumber ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      gender: profile?.gender ?? "",
      currentAddress: profile?.currentAddress ?? user?.currentAddress ?? "",
      permanentAddress:
        profile?.permanentAddress ?? user?.permanentAddress ?? "",
      highestQualification:
        profile?.highestQualification ?? user?.highestQualification ?? "",
      aadhaarNumber: profile?.aadhaarNumber ?? user?.aadhaarNumber ?? "",
      panNumber: profile?.panNumber ?? user?.panNumber ?? "",
    });
  }, [employee, isOpen, profile, user]);

  const genderSelection = useMemo(
    () => (formData.gender ? new Set([formData.gender]) : new Set()),
    [formData.gender],
  );

  const qualificationSelection = useMemo(
    () =>
      formData.highestQualification
        ? new Set([formData.highestQualification])
        : new Set(),
    [formData.highestQualification],
  );

  const handleInputChange = (field) => (valueOrEvent) => {
    if (valueOrEvent?.target) {
      const { value } = valueOrEvent.target;
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: valueOrEvent }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!employee?.user?.id) return;

    onSave?.({ ...formData });
  };

  const isSubmitDisabled =
    !formData.fullName?.trim() ||
    !formData.email?.trim() ||
    !formData.mobileNumber?.trim();

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="full"
      scrollBehavior="inside"
      hideCloseButton
      classNames={{
        base: "bg-transparent m-0",
        backdrop: "backdrop-blur-md",
        wrapper: "p-0",
      }}
    >
      <ModalContent className="bg-gray-50 h-screen max-h-screen rounded-none">
        {(onClose) => (
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            {/* Header - matching admin page style */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-600">
              <div className="px-4 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-xs font-medium mb-1">
                      Team Management 👨‍💼
                    </p>
                    <h1 className="text-xl font-bold text-white mb-1">
                      Update Employee Details
                    </h1>
                    {user?.name && (
                      <p className="text-indigo-100 text-xs">
                        Editing: {user.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-white">
                      <PencilIcon className="w-6 h-6" />
                    </div>
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={onClose}
                      className="text-white hover:bg-white/10 rounded-xl"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content - matching admin page style */}
            <div className="flex-1 px-3 pb-6 pt-3 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner
                    color="primary"
                    label="Loading employee..."
                    size="lg"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Personal Information Card */}
                  <Card className="bg-white/95 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Personal Information
                        </h3>
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="pt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Full name"
                          placeholder="Enter full name"
                          value={formData.fullName}
                          onValueChange={handleInputChange("fullName")}
                          required
                          startContent={
                            <IdentificationIcon className="w-4 h-4 text-gray-400" />
                          }
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                        <Input
                          label="Email"
                          placeholder="Enter email"
                          type="email"
                          value={formData.email}
                          onValueChange={handleInputChange("email")}
                          required
                          startContent={
                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                          }
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                        <Input
                          label="Mobile number"
                          placeholder="Enter mobile number"
                          value={formData.mobileNumber}
                          onValueChange={handleInputChange("mobileNumber")}
                          required
                          startContent={
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                          }
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                        <Input
                          label="Date of birth"
                          type="date"
                          value={formData.dateOfBirth}
                          onValueChange={handleInputChange("dateOfBirth")}
                          startContent={
                            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                          }
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                      </div>
                    </CardBody>
                  </Card>

                  {/* Demographics & Qualification Card */}
                  <Card className="bg-white/95 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Demographics & Qualification
                        </h3>
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="pt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select
                          label="Gender"
                          placeholder="Select gender"
                          selectedKeys={genderSelection}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] ?? "";
                            handleInputChange("gender")(value);
                          }}
                          variant="bordered"
                          classNames={{
                            trigger: "border-gray-300 hover:border-gray-400",
                            label: "font-medium",
                          }}
                        >
                          {genderOptions.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                        <Select
                          label="Highest qualification"
                          placeholder="Select qualification"
                          selectedKeys={qualificationSelection}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] ?? "";
                            handleInputChange("highestQualification")(value);
                          }}
                          variant="bordered"
                          classNames={{
                            trigger: "border-gray-300 hover:border-gray-400",
                            label: "font-medium",
                          }}
                        >
                          {qualificationOptions.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Address Information Card */}
                  <Card className="bg-white/95 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Address Information
                        </h3>
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="pt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Textarea
                          label="Current address"
                          minRows={3}
                          placeholder="Enter current address"
                          value={formData.currentAddress}
                          onValueChange={handleInputChange("currentAddress")}
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                        <Textarea
                          label="Permanent address"
                          minRows={3}
                          placeholder="Enter permanent address"
                          value={formData.permanentAddress}
                          onValueChange={handleInputChange("permanentAddress")}
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                      </div>
                    </CardBody>
                  </Card>

                  {/* Identity Documents Card */}
                  <Card className="bg-white/95 backdrop-blur-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <IdentificationIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Identity Documents
                        </h3>
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="pt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Aadhaar number"
                          placeholder="Enter Aadhaar number"
                          value={formData.aadhaarNumber}
                          onValueChange={handleInputChange("aadhaarNumber")}
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                        <Input
                          label="PAN number"
                          placeholder="Enter PAN number"
                          value={formData.panNumber}
                          onValueChange={handleInputChange("panNumber")}
                          variant="bordered"
                          classNames={{
                            input: "text-sm",
                            label: "font-medium",
                          }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )}
            </div>

            {/* Fixed bottom action bar - matching admin page style */}
            <div className="bg-white border-t border-gray-200 px-3 py-4 sticky bottom-0 z-10 shadow-lg">
              <div className="flex gap-3 w-full justify-center">
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="font-medium px-6 py-2 rounded-lg"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isDisabled={isLoading || isSubmitDisabled}
                  isLoading={isSaving}
                  className="bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-600 text-white font-medium shadow-sm px-6 py-2 rounded-lg"
                  size="md"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
