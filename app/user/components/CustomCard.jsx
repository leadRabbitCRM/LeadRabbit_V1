import React from "react";
import CustomButton from "./ui/CustomButton";
import StatusChip from "./ui/StatusChip";
import { StarIcon } from "@heroicons/react/24/solid";

export default function CustomCard({
  lead,
  favorites = [],
  onToggleFavorite,
  onOpen,
}) {
  // Resolve lead ID
  const resolveLeadId = (lead) => {
    if (!lead) return null;
    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }
    return lead?._id ?? lead?.id ?? null;
  };

  const leadId = resolveLeadId(lead);
  const isFavorite = leadId && favorites.includes(leadId);

  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent opening the drawer
    if (onToggleFavorite && leadId) {
      onToggleFavorite(leadId);
    }
  };
  // Sticker mapping by status
  const statusAliases = {
    InProgress: "Interested",
  };

  const statusStickers = {
    New: {
      src: "/img/stickers/plantAsset2.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    Interested: {
      src: "/img/stickers/plantAsset3.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    "Not Interested": {
      src: "/img/stickers/plantAsset2.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    Deal: {
      src: "/img/stickers/plantAsset4.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
  };

  const stickerKey = statusStickers[lead.status]
    ? lead.status
    : (statusAliases[lead.status] ?? null);

  const sticker = stickerKey ? (statusStickers[stickerKey] ?? null) : null;

  return (
    <div className="relative">
      {/* Main Card */}
      <div
        className="w-full rounded-2xl bg-white 
                   shadow-[0_1px_3px_rgba(0,0,0,0.1)]
                   hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]
                   transition-all duration-200
                   relative cursor-pointer overflow-visible"
        onClick={onOpen}
        role="button"
        tabIndex={0}
      >
        <div className="p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base font-bold text-gray-900 mb-2 truncate">
                {lead.name}
              </h3>
              <div className="inline-block">
                <StatusChip status={lead.status} />
              </div>
            </div>

            {/* Favorites Button */}
            <button
              onClick={handleFavoriteClick}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 
                ${
                  isFavorite
                    ? "bg-yellow-400 text-white shadow-md"
                    : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
                }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <StarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-3"></div>

          {/* Contact Details */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
              <span className="text-sm text-gray-700 truncate flex-1">
                {lead.email}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
              </svg>
              <span className="text-sm text-gray-700">{lead.phone}</span>
            </div>

            {lead.project && (
              <div className="flex items-start gap-2.5">
                <svg
                  className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-sm text-gray-700 truncate flex-1">
                  {lead.project}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Sticker - Outside card */}
      {sticker && (
        <div className="absolute -bottom-2 -right-2 pointer-events-none z-10">
          <img
            src={sticker.src}
            alt={`${lead.status} sticker`}
            className="w-16 h-16 object-contain drop-shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
