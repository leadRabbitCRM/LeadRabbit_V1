import React from "react";
import { Chip } from "@heroui/react";
import {
  CheckBadgeIcon,
  FireIcon,
  HandThumbDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";

const STATUS_MAP = {
  new: {
    label: "New",
    color: "secondary",
    Icon: FireIcon,
  },
  interested: {
    label: "Interested",
    color: "warning",
    Icon: SparklesIcon,
  },
  "not interested": {
    label: "Not Interested",
    color: "danger",
    Icon: HandThumbDownIcon,
  },
  deal: {
    label: "Deal",
    color: "success",
    Icon: CheckBadgeIcon,
  },
};

const STATUS_ALIASES = {
  inprogress: "interested",
};

export default function Status({ status }) {
  if (!status) return null;

  const key = status.toString().trim().toLowerCase();
  const normalizedKey = STATUS_MAP[key] ? key : (STATUS_ALIASES[key] ?? null);

  if (!normalizedKey) return null;

  const { label, color, Icon } = STATUS_MAP[normalizedKey];

  return (
    <Chip
      className="text-xs"
      color={color}
      size="sm"
      startContent={<Icon className="w-4" />}
      variant="solid"
    >
      {label}
    </Chip>
  );
}
