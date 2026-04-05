"use client";
import React from "react";

export default function Home() {
  return (
    <div className="relative flex flex-col h-screen">
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold">Welcome to the Ticketing App</h1>
          <p className="mt-4 text-lg">
            Your one-stop solution for managing tickets.
          </p>
        </div>
      </main>
    </div>
  );
}
