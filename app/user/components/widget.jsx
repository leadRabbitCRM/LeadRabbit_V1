"use client";
import React from "react";
import NeumorphicLoader from "./ui/NeumorphicLoader";

export default function widget({ icon, count, name }) {
  return (
    <div>
      <NeumorphicLoader icon={icon} name={name} count={count} />
    </div>
  );
}
