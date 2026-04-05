"use client";
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Tooltip,
} from "@heroui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import AdminLeadDetailsContent from "./AdminLeadDetailsContent";

export default function AdminLeadDetailModal({
  isOpen,
  onOpenChange,
  lead,
  onStatusChange,
  onMeetingsChange,
  onEngagementsChange,
}) {
  if (!lead) return null;

  // Resolve lead ID
  const resolveLeadId = (lead) => {
    if (!lead) return null;
    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }
    return lead?._id ?? lead?.id ?? null;
  };

  const leadId = resolveLeadId(lead);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="full"
      backdrop="opaque"
      scrollBehavior="inside"
      classNames={{
        base: "bg-transparent",
        backdrop: "bg-black/50",
      }}
    >
      <ModalContent className="bg-transparent shadow-none">
        {(onClose) => (
          <>
            {/* Simple close button in top-left corner */}
            {/* <Button
              isIconOnly
              className="absolute top-4 left-4 z-50 text-white bg-black/50 hover:bg-black/70"
              size="sm"
              variant="solid"
              onPress={onClose}
            >
              <XMarkIcon className="w-5 h-5" />
            </Button> */}

            <ModalBody className="p-0">
              {/* Use admin-specific lead details component without drawer wrapper */}
              <div className="min-h-screen bg-gray-50">
                <AdminLeadDetailsContent
                  lead={lead}
                  onStatusChange={onStatusChange}
                  onMeetingsChange={onMeetingsChange}
                  onEngagementsChange={onEngagementsChange}
                />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
