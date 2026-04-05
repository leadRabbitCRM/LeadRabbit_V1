"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Textarea,
  addToast,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  CameraIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
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
  dateOfBirth: "",
  gender: "",
  mobileNumber: "",
  email: "",
  currentAddress: "",
  permanentAddress: "",
  highestQualification: "",
  aadhaarNumber: "",
  aadhaarFile: null,
  panNumber: "",
  panFile: null,
  profilePhoto: null,
};

const parseBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function buildDataUrl(file) {
  if (!file?.type || !file?.data) return null;
  return `data:${file.type};base64,${file.data}`;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [panPreview, setPanPreview] = useState(null);
  const [isVerified, setIsVerified] = useState(true); // Admin is typically auto-verified
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isContactLocked, setIsContactLocked] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [userRole, setUserRole] = useState("admin");
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/user/profile", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        const profile = data.profile ?? null;

        setFormData({
          fullName: profile?.fullName ?? data.user?.name ?? "",
          dateOfBirth: profile?.dateOfBirth ?? "",
          gender: profile?.gender ?? "",
          mobileNumber: profile?.mobileNumber ?? "",
          email: data.user?.email ?? "",
          currentAddress: profile?.currentAddress ?? "",
          permanentAddress: profile?.permanentAddress ?? "",
          highestQualification: profile?.highestQualification ?? "",
          aadhaarNumber: profile?.aadhaarNumber ?? "",
          aadhaarFile: profile?.aadhaarFile ?? null,
          panNumber: profile?.panNumber ?? "",
          panFile: profile?.panFile ?? null,
          profilePhoto: data.user?.avatar ?? null,
        });

        setProfilePhotoPreview(data.user?.avatar ?? null);
        setAadhaarPreview(buildDataUrl(profile?.aadhaarFile ?? null));
        setPanPreview(buildDataUrl(profile?.panFile ?? null));
        setIsVerified(
          parseBooleanFlag(
            profile?.isVerified ?? data.user?.isVerified ?? true,
          ),
        );
        setUserRole(data.user?.role ?? "admin");
        setLastUpdatedAt(profile?.updatedAt ?? null);
        setIsContactLocked(Boolean(profile));
      } catch (error) {
        console.error("Failed to load profile", error);
        addToast({
          title: "Profile",
          description: "Unable to load profile details.",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (field) => (valueOrEvent) => {
    if (valueOrEvent?.target) {
      const { value } = valueOrEvent.target;
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: valueOrEvent }));
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToBase64(file);
      const [, base64Data] = dataUrl.split(",");

      if (type === "profilePhoto") {
        setFormData((prev) => ({ ...prev, profilePhoto: dataUrl }));
        setProfilePhotoPreview(dataUrl);
      }

      if (type === "aadhaarFile") {
        const filePayload = {
          name: file.name,
          type: file.type,
          data: base64Data,
        };
        setFormData((prev) => ({ ...prev, aadhaarFile: filePayload }));
        setAadhaarPreview(dataUrl);
      }

      if (type === "panFile") {
        const filePayload = {
          name: file.name,
          type: file.type,
          data: base64Data,
        };
        setFormData((prev) => ({ ...prev, panFile: filePayload }));
        setPanPreview(dataUrl);
      }
    } catch (error) {
      console.error("Failed to process file", error);
      addToast({
        title: "File upload",
        description: "Unable to process the selected file.",
        color: "danger",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      mobileNumber: formData.mobileNumber,
      currentAddress: formData.currentAddress,
      permanentAddress: formData.permanentAddress,
      highestQualification: formData.highestQualification,
      aadhaarNumber: formData.aadhaarNumber,
      aadhaarFile: formData.aadhaarFile,
      panNumber: formData.panNumber,
      panFile: formData.panFile,
      profilePhoto: formData.profilePhoto,
    };

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to update profile");
      }

      const verified = parseBooleanFlag(data?.isVerified ?? true);
      setIsVerified(verified);
      setIsContactLocked(true);
      setLastUpdatedAt(new Date().toISOString());
      addToast({
        title: "Profile updated",
        description: "Your admin profile has been updated successfully.",
        color: "success",
      });
    } catch (error) {
      console.error("Failed to update profile", error);
      addToast({
        title: "Profile",
        description: error.message ?? "Failed to update profile.",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verificationBadge = useMemo(() => {
    return (
      <span className="absolute -top-1 -right-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 p-1 shadow-lg">
        <ShieldCheckIcon className="h-4 w-4 text-white" />
      </span>
    );
  }, []);

  const handleViewDocument = (docData, docType) => {
    setViewingDocument({ data: docData, type: docType });
    onOpen();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Enhanced Professional Admin Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-4xl px-3 md:px-6 py-6 md:py-10">
          <div className="flex flex-col items-center text-center gap-4 md:gap-6">
            {/* Main Title Section */}
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <ShieldCheckIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-xl md:text-4xl font-bold text-white leading-tight">
                  Admin Profile
                </h1>
                <p className="text-green-100 text-sm md:text-lg mt-0.5 md:mt-1 max-w-xs md:max-w-none">
                  Manage your administrative information
                </p>
              </div>
            </div>

            {/* Status and Stats Row - Mobile Optimized */}
            <div className="w-full max-w-2xl">
              {/* Admin Status Indicator - Full Width on Mobile */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium backdrop-blur-sm border bg-emerald-500/20 text-emerald-100 border-emerald-400/30">
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Administrator Account</span>
                </div>
              </div>

              {/* Stats and Last Updated - Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 items-center">
                {/* Quick Stats */}
                <div className="flex justify-center md:justify-start">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-center">
                      <div className="text-lg md:text-2xl font-bold text-white">
                        {
                          [formData.aadhaarFile, formData.panFile].filter(
                            Boolean,
                          ).length
                        }
                      </div>
                      <div className="text-xs text-green-200">Documents</div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="text-center">
                      <div className="text-lg md:text-2xl font-bold text-white">
                        {Math.round(
                          (Object.values(formData).filter(
                            (val) => val && val !== "",
                          ).length /
                            Object.keys(formData).length) *
                            100,
                        )}
                        %
                      </div>
                      <div className="text-xs text-green-200">Complete</div>
                    </div>
                  </div>
                </div>

                {/* Spacer for desktop */}
                <div className="hidden md:block"></div>

                {/* Last Updated */}
                {lastUpdatedAt && (
                  <div className="flex justify-center md:justify-end">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-center md:text-right">
                      <div className="text-xs text-green-200 font-medium">
                        Last Updated
                      </div>
                      <div className="text-sm text-white font-semibold">
                        {new Date(lastUpdatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-3 md:px-6 py-4 md:py-8">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100/60 px-4 md:px-8 py-3 md:py-6">
            {/* Admin Profile Completion Progress */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-3 md:p-6 border border-emerald-100">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <ShieldCheckIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-xl font-bold text-gray-800">
                        Admin Profile Details
                      </h2>
                      <p className="text-xs md:text-sm text-gray-600">
                        Manage your administrative information
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg md:text-2xl font-bold text-emerald-600">
                      {Math.round(
                        (Object.values(formData).filter(
                          (val) => val && val !== "",
                        ).length /
                          Object.keys(formData).length) *
                          100,
                      )}
                      %
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Complete
                    </div>
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-medium text-gray-700">
                      {
                        Object.values(formData).filter(
                          (val) => val && val !== "",
                        ).length
                      }{" "}
                      of {Object.keys(formData).length} fields completed
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      {Object.keys(formData).length -
                        Object.values(formData).filter(
                          (val) => val && val !== "",
                        ).length}{" "}
                      remaining
                    </span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 h-3 rounded-full transition-all duration-700 shadow-sm"
                      style={{
                        width: `${(Object.values(formData).filter((val) => val && val !== "").length / Object.keys(formData).length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardBody className="px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Spinner size="lg" color="primary" />
                  <p className="text-gray-500 mt-4 font-medium">
                    Loading your profile...
                  </p>
                </div>
              </div>
            ) : (
              <form className="space-y-4 md:space-y-8" onSubmit={handleSubmit}>
                {/* Profile Photo & Basic Info Section */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-emerald-100">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-1.5 md:w-2 h-4 md:h-6 bg-emerald-600 rounded-full"></div>
                    Administrator Information
                  </h3>
                  <div className="flex flex-col items-center gap-4 md:gap-6 md:flex-row md:items-start">
                    <div className="relative group">
                      <Avatar
                        src={profilePhotoPreview ?? undefined}
                        name={formData.fullName || formData.email || "Admin"}
                        className="h-28 w-28 md:h-36 md:w-36 lg:h-40 lg:w-40 ring-4 md:ring-6 ring-white shadow-2xl"
                        isBordered={false}
                      />
                      {verificationBadge}
                      <label className="absolute bottom-1 right-1 flex h-10 w-10 md:h-12 md:w-12 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition-all duration-200 hover:bg-emerald-700 hover:scale-110 group-hover:shadow-2xl border-2 border-white">
                        <CameraIcon className="h-5 w-5 md:h-6 md:w-6" />
                        <input
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={(event) =>
                            handleFileUpload(event, "profilePhoto")
                          }
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-3 md:space-y-4 w-full">
                      <Input
                        label="Full Name"
                        placeholder="Enter your full name"
                        variant="bordered"
                        size="md"
                        required
                        value={formData.fullName}
                        onValueChange={handleInputChange("fullName")}
                        classNames={{
                          input: "text-gray-800",
                          inputWrapper:
                            "border-gray-200 hover:border-emerald-300",
                        }}
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <p className="text-emerald-700 text-sm font-medium">
                            {formData.email}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            Administrator email address
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Details Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-100">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-1.5 md:w-2 h-4 md:h-6 bg-blue-600 rounded-full"></div>
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                    <Input
                      label="Date of Birth"
                      placeholder="Select your birth date"
                      variant="bordered"
                      size="md"
                      required
                      type="date"
                      value={formData.dateOfBirth}
                      onValueChange={handleInputChange("dateOfBirth")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-blue-300",
                      }}
                    />
                    <Select
                      label="Gender"
                      placeholder="Select gender"
                      variant="bordered"
                      size="md"
                      selectedKeys={formData.gender ? [formData.gender] : []}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] ?? "";
                        handleInputChange("gender")(value);
                      }}
                      classNames={{
                        trigger: "border-gray-200 hover:border-blue-300",
                      }}
                    >
                      {genderOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                    <Input
                      label="Mobile Number"
                      placeholder="Enter your mobile number"
                      variant="bordered"
                      size="md"
                      value={formData.mobileNumber}
                      onValueChange={handleInputChange("mobileNumber")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-blue-300",
                      }}
                    />
                    <Select
                      label="Highest Qualification"
                      placeholder="Select qualification"
                      variant="bordered"
                      size="md"
                      selectedKeys={
                        formData.highestQualification
                          ? [formData.highestQualification]
                          : []
                      }
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] ?? "";
                        handleInputChange("highestQualification")(value);
                      }}
                      classNames={{
                        trigger: "border-gray-200 hover:border-blue-300",
                      }}
                    >
                      {qualificationOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-purple-100">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-1.5 md:w-2 h-4 md:h-6 bg-purple-600 rounded-full"></div>
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                    <Textarea
                      label="Current Address"
                      minRows={3}
                      placeholder="Enter your current residential address"
                      variant="bordered"
                      size="md"
                      value={formData.currentAddress}
                      onValueChange={handleInputChange("currentAddress")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-purple-300",
                      }}
                    />
                    <Textarea
                      label="Permanent Address"
                      minRows={3}
                      placeholder="Enter your permanent address"
                      variant="bordered"
                      size="md"
                      value={formData.permanentAddress}
                      onValueChange={handleInputChange("permanentAddress")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-purple-300",
                      }}
                    />
                  </div>
                </div>

                {/* Identity Documents Section */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-orange-100">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-1.5 md:w-2 h-4 md:h-6 bg-orange-600 rounded-full"></div>
                    Identity Documents
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                    <Input
                      label="Aadhaar Number"
                      placeholder="Enter 12-digit Aadhaar number"
                      variant="bordered"
                      size="md"
                      value={formData.aadhaarNumber}
                      onValueChange={handleInputChange("aadhaarNumber")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-orange-300",
                      }}
                    />
                    <Input
                      label="PAN Number"
                      placeholder="Enter 10-character PAN number"
                      variant="bordered"
                      size="md"
                      value={formData.panNumber}
                      onValueChange={handleInputChange("panNumber")}
                      classNames={{
                        input: "text-gray-800",
                        inputWrapper: "border-gray-200 hover:border-orange-300",
                      }}
                    />
                  </div>
                </div>

                {/* Document Management Section */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-200">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="w-1.5 md:w-2 h-4 md:h-6 bg-slate-600 rounded-full"></div>
                    Document Upload
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                    <div className="space-y-3 md:space-y-4">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        📄 Aadhaar Card
                      </label>
                      <div className="relative">
                        <input
                          accept=".pdf,image/*"
                          className="w-full rounded-lg md:rounded-xl border-2 border-dashed border-gray-300 px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm text-gray-600 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          type="file"
                          onChange={(event) =>
                            handleFileUpload(event, "aadhaarFile")
                          }
                        />
                      </div>
                      {aadhaarPreview && (
                        <div className="border rounded-lg p-2 md:p-3 bg-emerald-50 border-emerald-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100">
                                <svg
                                  className="w-4 h-4 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs md:text-sm font-medium text-emerald-800">
                                  Document Uploaded
                                </p>
                                <p className="text-xs text-emerald-600">
                                  Aadhaar card uploaded
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDocument(
                                  aadhaarPreview,
                                  "Aadhaar Card",
                                );
                              }}
                              className="text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              View
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        📄 PAN Card
                      </label>
                      <div className="relative">
                        <input
                          accept=".pdf,image/*"
                          className="w-full rounded-lg md:rounded-xl border-2 border-dashed border-gray-300 px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm text-gray-600 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          type="file"
                          onChange={(event) =>
                            handleFileUpload(event, "panFile")
                          }
                        />
                      </div>
                      {panPreview && (
                        <div className="border rounded-lg p-2 md:p-3 bg-emerald-50 border-emerald-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100">
                                <svg
                                  className="w-4 h-4 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs md:text-sm font-medium text-emerald-800">
                                  Document Uploaded
                                </p>
                                <p className="text-xs text-emerald-600">
                                  PAN card uploaded
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDocument(panPreview, "PAN Card");
                              }}
                              className="text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              View
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Status Information */}
                <div className="flex items-start gap-3 md:gap-4 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-5 border bg-emerald-50 border-emerald-200">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-emerald-100">
                    <ShieldCheckIcon className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm md:text-base text-emerald-800">
                      Administrator Account ✓
                    </h4>
                    <p className="text-xs md:text-sm mt-0.5 md:mt-1 text-emerald-700">
                      Your administrator privileges grant you full access to
                      manage the platform and verify user profiles.
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-100">
                  <Button
                    variant="bordered"
                    size="md"
                    className="px-4 md:px-8 py-2 md:py-3 font-medium text-sm md:text-base"
                    isDisabled={isSubmitting}
                    onPress={() => router.push("/admin")}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    size="md"
                    className="px-4 md:px-8 py-2 md:py-3 font-medium text-sm md:text-base bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    isLoading={isSubmitting}
                    type="submit"
                  >
                    Update Profile
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="full"
        classNames={{
          base: "mx-0 my-0 sm:mx-4 sm:my-6",
          wrapper: "p-0 sm:p-4",
        }}
        scrollBehavior="inside"
      >
        <ModalContent className="h-full sm:h-auto max-h-[95vh]">
          <ModalHeader className="flex flex-col gap-1 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">
              {viewingDocument?.type || "Document Viewer"}
            </h3>
            <p className="text-xs md:text-sm text-gray-500">
              {viewingDocument?.data?.includes("data:application/pdf")
                ? "PDF Document"
                : "Image Document"}
            </p>
          </ModalHeader>
          <ModalBody className="p-0 overflow-auto">
            {viewingDocument && (
              <div className="w-full h-full min-h-[60vh]">
                {viewingDocument.data.includes("data:application/pdf") ? (
                  <div className="w-full h-full min-h-[70vh]">
                    <iframe
                      src={`${viewingDocument.data}#toolbar=0&navpanes=0&scrollbar=1&page=1&view=FitH`}
                      className="w-full h-full min-h-[70vh] border-0"
                      title={`${viewingDocument.type} PDF Document`}
                    />
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center bg-gray-50 p-4">
                    <div className="relative max-w-full">
                      <img
                        src={viewingDocument.data}
                        alt={`${viewingDocument.type} Document`}
                        className="document-image max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg transition-transform duration-200"
                        style={{
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "70vh",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
            <Button
              variant="light"
              onPress={onClose}
              className="font-medium"
              size="sm"
            >
              Close
            </Button>
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onPress={() => {
                // Remove the document
                if (viewingDocument?.type === "Aadhaar Card") {
                  setFormData((prev) => ({ ...prev, aadhaarFile: null }));
                  setAadhaarPreview(null);
                } else if (viewingDocument?.type === "PAN Card") {
                  setFormData((prev) => ({ ...prev, panFile: null }));
                  setPanPreview(null);
                }
                onClose();
              }}
              className="font-medium"
            >
              Remove Document
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
