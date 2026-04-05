import { useState, useCallback } from "react";
import { SiHomebridge } from "react-icons/si";
import {
  CheckIcon,
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import StatusChip from "./StatusChip";
import SourceBadge from "./SourceBadge";
import axios from "@/lib/axios";

const STATUS_STICKER_ALIAS = {
  InProgress: "Interested",
};

const BASE_STICKER = {
  size: "w-12 max-w-[3rem]",
  left: "right-1 -bottom-[0.25rem]",
};

const STATUS_STICKERS = {
  New: { src: "/img/stickers/plantAsset2.svg", ...BASE_STICKER },
  Interested: { src: "/img/stickers/plantAsset3.svg", ...BASE_STICKER },
  "Not Interested": { src: "/img/stickers/plantAsset2.svg", ...BASE_STICKER },
  Deal: { src: "/img/stickers/plantAsset4.svg", ...BASE_STICKER },
};

function resolveSticker(status) {
  if (!status) return null;

  const normalized = STATUS_STICKERS[status];

  if (normalized) return normalized;

  const aliasKey = STATUS_STICKER_ALIAS[status];

  return aliasKey ? (STATUS_STICKERS[aliasKey] ?? null) : null;
}

export default function LeadDetailNameCard({ lead, onLeadUpdate }) {
  const sticker = resolveSticker(lead?.status);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(lead?.name || "");
  const [editEmail, setEditEmail] = useState(lead?.email || "");
  const [editPhone, setEditPhone] = useState(lead?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleStartEdit = useCallback(() => {
    setEditName(lead?.name || "");
    setEditEmail(lead?.email || "");
    setEditPhone(lead?.phone || "");
    setSaveError(null);
    setIsEditing(true);
  }, [lead]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    const leadId =
      typeof lead?._id === "string"
        ? lead._id
        : lead?._id?.toString?.() || lead?.id;

    if (!leadId) {
      setSaveError("Lead ID not found");
      return;
    }

    // Basic validation
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName) {
      setSaveError("Name is required");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const updateData = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      };

      const response = await axios.patch(
        `leads/${encodeURIComponent(leadId)}`,
        updateData,
      );

      // Update the parent with the new lead data
      if (onLeadUpdate) {
        onLeadUpdate(response.data);
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating lead:", err);
      setSaveError(err?.response?.data?.error || "Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  }, [lead, editName, editEmail, editPhone, onLeadUpdate]);

  return (
    <div className="relative">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-lg sm:text-xl">
                {lead.name?.charAt(0)?.toUpperCase() || "L"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-medium text-gray-900 break-words tracking-tight">
                {lead.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">
                {lead.email}
              </p>
              {lead.phone && (
                <p className="text-xs text-gray-400 mt-0.5 break-words">
                  {lead.phone}
                </p>
              )}
            </div>
            {/* Source Badge and Edit Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {lead?.source && <SourceBadge source={lead.source} size="sm" />}
              {!isEditing && (
                <div
                  onClick={handleStartEdit}
                  className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-white border border-gray-300 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 active:scale-95"
                  title="Edit lead details"
                >
                  <PencilSquareIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Contact Info Panel */}
        {isEditing && (
          <div className="border-b border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <PencilSquareIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Edit Contact Information</span>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-white">
              {/* Name Field */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  <UserIcon className="w-3 h-3" />
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter lead name"
                  autoFocus
                  className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
              {/* Email Field */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  <EnvelopeIcon className="w-3 h-3" />
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
              {/* Phone Field */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  <PhoneIcon className="w-3 h-3" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                />
              </div>

              {/* Error Message */}
              {saveError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <XMarkIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{saveError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-4 ">
              {/* Phone Number Card */}
              {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">Primary phone number</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>
                                            <p className="text-base sm:text-lg font-semibold text-gray-900 break-all">{lead.phone || 'Not provided'}</p>
                                        </div>
                                        <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200" onClick={() => window.location.href = `tel:${lead.phone}`}>
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div> */}

              {/* Current Status Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">
                        Lead Status
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current lead stage and progress
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Current Status
                        </p>
                        <p className="text-sm font-medium text-gray-600">
                          Lead Progress
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusChip status={lead?.status} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Details Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <SiHomebridge className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">
                      Project Information
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lead project details and location
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <SiHomebridge className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Project Type
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {lead?.project || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3.5 h-3.5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Project Location
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {lead.projectLocation || "Not specified"}
                    </p>
                  </div>
                </div>

                {lead.budget && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3.5 h-3.5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Budget Range
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.budget}
                      </p>
                    </div>
                  </div>
                )}

                {lead.metaData?.formName && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3.5 h-3.5 text-purple-600"
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
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Lead Source Form
                      </p>
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {lead.metaData.formName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plant Sticker */}
      {sticker && (
        <div className={`absolute ${sticker.left} cursor-pointer`}>
          <img
            src={sticker.src}
            alt={`${lead?.status} sticker`}
            className={sticker.size}
          />
        </div>
      )}
    </div>
  );
}
