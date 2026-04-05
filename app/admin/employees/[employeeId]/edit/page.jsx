"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Spinner,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import {
  UserIcon,
  ArrowLeftIcon,
  PencilIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";
import axios from "@/lib/axios";

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

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.employeeId;

  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!employeeId) {
        setError("Employee ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(`admin/employees/${employeeId}`);
        const employeeData = response.data;
        setEmployee(employeeData);

        // Populate form data
        const user = employeeData?.user ?? null;
        const profile = employeeData?.profile ?? null;

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

        setError(null);
      } catch (err) {
        console.error("Failed to fetch employee", err);
        setError("Failed to load employee details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  const handleInputChange = (field) => (valueOrEvent) => {
    if (valueOrEvent?.target) {
      const { value } = valueOrEvent.target;
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: valueOrEvent }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!employeeId) return;

    setIsSaving(true);
    try {
      const response = await axios.put(`admin/employees/${employeeId}`, {
        action: "update",
        payload: formData,
      });

      // Show success and redirect back to profile
      router.push(`/admin/employees/${employeeId}`);
    } catch (error) {
      console.error("Failed to update employee", error);
      setError("Failed to update employee details");
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitDisabled =
    !formData.fullName?.trim() ||
    !formData.email?.trim() ||
    !formData.mobileNumber?.trim();

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
                <div>
                  <div className="w-32 h-4 bg-white/20 rounded mb-2 animate-pulse"></div>
                  <div className="w-48 h-5 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="px-3 pb-6">
          <div className="space-y-3 mt-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-sm animate-pulse"
              >
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-3"></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-10 bg-gray-300 rounded"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-pink-600">
          <div className="px-4 py-6">
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                variant="light"
                className="text-white"
                onPress={() => router.back()}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-red-100 text-xs font-medium mb-1">
                  Error 🚫
                </p>
                <h1 className="text-xl font-bold text-white mb-1">
                  Failed to Load Employee
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-sm text-center mt-3">
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="flat"
                size="sm"
                className="flex-1"
                onPress={() => router.back()}
              >
                Go Back
              </Button>
              <Button
                color="primary"
                size="sm"
                className="flex-1"
                onPress={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = employee?.user;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                variant="light"
                className="text-white"
                onPress={() => router.back()}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-purple-100 text-xs font-medium mb-1">
                  Edit Employee 📝
                </p>
                <h1 className="text-xl font-bold text-white mb-1">
                  {user?.name || "Edit Profile"}
                </h1>
                <p className="text-purple-100 text-xs">
                  Update employee profile information
                </p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-white">
              <PencilIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit}>
        <div className="px-3 pb-6">
          <div className="space-y-3 mt-3">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4 text-blue-500" />
                  Personal Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Input
                  label="Full Name"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onValueChange={handleInputChange("fullName")}
                  startContent={
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />
                  }
                  isRequired
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Email"
                    placeholder="Enter email"
                    type="email"
                    value={formData.email}
                    onValueChange={handleInputChange("email")}
                    startContent={
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    }
                    isRequired
                  />
                  <Input
                    label="Mobile Number"
                    placeholder="Enter mobile number"
                    value={formData.mobileNumber}
                    onValueChange={handleInputChange("mobileNumber")}
                    startContent={
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                    }
                    isRequired
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={formData.dateOfBirth}
                    onValueChange={handleInputChange("dateOfBirth")}
                    startContent={
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                    }
                  />
                  <Select
                    label="Gender"
                    placeholder="Select gender"
                    selectedKeys={
                      formData.gender ? new Set([formData.gender]) : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] ?? "";
                      handleInputChange("gender")(value);
                    }}
                  >
                    {genderOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </CardBody>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-green-500" />
                  Address Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Textarea
                  label="Current Address"
                  minRows={3}
                  placeholder="Enter current address"
                  value={formData.currentAddress}
                  onValueChange={handleInputChange("currentAddress")}
                />
                <Textarea
                  label="Permanent Address"
                  minRows={3}
                  placeholder="Enter permanent address"
                  value={formData.permanentAddress}
                  onValueChange={handleInputChange("permanentAddress")}
                />
              </CardBody>
            </Card>

            {/* Education & Documents */}
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <AcademicCapIcon className="w-4 h-4 text-purple-500" />
                  Education & Documents
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Select
                  label="Highest Qualification"
                  placeholder="Select qualification"
                  selectedKeys={
                    formData.highestQualification
                      ? new Set([formData.highestQualification])
                      : new Set()
                  }
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] ?? "";
                    handleInputChange("highestQualification")(value);
                  }}
                >
                  {qualificationOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Aadhaar Number"
                    placeholder="Enter Aadhaar number"
                    value={formData.aadhaarNumber}
                    onValueChange={handleInputChange("aadhaarNumber")}
                    startContent={
                      <IdentificationIcon className="w-4 h-4 text-gray-400" />
                    }
                  />
                  <Input
                    label="PAN Number"
                    placeholder="Enter PAN number"
                    value={formData.panNumber}
                    onValueChange={handleInputChange("panNumber")}
                    startContent={
                      <IdentificationIcon className="w-4 h-4 text-gray-400" />
                    }
                  />
                </div>
              </CardBody>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                variant="flat"
                className="flex-1"
                onPress={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                className="flex-1"
                isDisabled={isSubmitDisabled}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
