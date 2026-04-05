"use client";
import React, { Suspense } from "react";
import AllLeadsContent from "./AllLeadsContent";

export const dynamic = "force-dynamic";

export default function AllLeadsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AllLeadsContent />
    </Suspense>
  );
}
