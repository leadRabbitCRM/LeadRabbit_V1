"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Avatar,
  Divider,
  Spinner,
  Link,
} from "@heroui/react";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

function buildDataUrl(file) {
  if (!file?.type || !file?.data) return null;

  return `data:${file.type};base64,${file.data}`;
}

const parseBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
  }

  return false;
};

function openFileInNewTab(file) {
  if (!file?.data || !file?.type) return;

  const byteCharacters = window.atob(file.data);
  const byteArrays = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  const blob = new Blob(byteArrays, { type: file.type });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!newWindow) {
    URL.revokeObjectURL(url);
    return;
  }

  const revokeUrl = () => {
    URL.revokeObjectURL(url);
    newWindow.removeEventListener("beforeunload", revokeUrl);
  };

  newWindow.addEventListener("beforeunload", revokeUrl);
}

export default function EmployeeProfileModal({
  isOpen,
  onOpenChange,
  employee,
  isLoading,
  isVerifying,
  onVerify,
}) {
  const user = employee?.user ?? null;
  const profile = employee?.profile ?? null;
  const userVerified = parseBooleanFlag(user?.isVerified);
  const profileVerified = parseBooleanFlag(profile?.isVerified);

  const aadhaarUrl = buildDataUrl(profile?.aadhaarFile ?? null);
  const panUrl = buildDataUrl(profile?.panFile ?? null);

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="lg"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Employee Profile
              {userVerified && (
                <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
                  <CheckBadgeIcon className="h-4 w-4" /> Verified
                </span>
              )}
            </ModalHeader>
            <ModalBody className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner color="primary" label="Loading profile..." />
                </div>
              ) : !profile ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  This user has not submitted their profile details yet.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <div className="relative">
                      <Avatar
                        isBordered
                        radius="lg"
                        size="lg"
                        src={user?.avatar ?? undefined}
                      />
                      {userVerified && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 p-1 text-white shadow-lg">
                          <CheckBadgeIcon className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="w-full space-y-1">
                      <p className="text-lg font-semibold">
                        {profile.fullName || user?.name || "—"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user?.email ?? "—"}
                      </p>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-gray-600">
                            Mobile:
                          </span>{" "}
                          {profile.mobileNumber || "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            Gender:
                          </span>{" "}
                          {profile.gender || "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            DOB:
                          </span>{" "}
                          {profile.dateOfBirth || "—"}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            Qualification:
                          </span>{" "}
                          {profile.highestQualification || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-600">
                        Current Address
                      </p>
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        {profile.currentAddress || "Not provided"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-600">
                        Permanent Address
                      </p>
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        {profile.permanentAddress || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-600">
                        Aadhaar Details
                      </p>
                      <p className="text-sm text-gray-700">
                        Number: {profile.aadhaarNumber || "—"}
                      </p>
                      {aadhaarUrl && (
                        <Link
                          className="text-sm font-medium text-blue-600 underline"
                          onPress={() => openFileInNewTab(profile?.aadhaarFile)}
                        >
                          View Aadhaar file
                        </Link>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-600">
                        PAN Details
                      </p>
                      <p className="text-sm text-gray-700">
                        Number: {profile.panNumber || "—"}
                      </p>
                      {panUrl && (
                        <Link
                          className="text-sm font-medium text-blue-600 underline"
                          onPress={() => openFileInNewTab(profile?.panFile)}
                        >
                          View PAN file
                        </Link>
                      )}
                    </div>
                  </div>

                  {profile.verifiedAt && (
                    <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                      Verified on{" "}
                      {new Date(profile.verifiedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="flat" onPress={onClose}>
                Close
              </Button>
              {profile && !profileVerified && (
                <Button
                  color="primary"
                  isLoading={isVerifying}
                  isDisabled={!user?.id}
                  onPress={() => onVerify?.(user?.id)}
                >
                  Verify Profile
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
