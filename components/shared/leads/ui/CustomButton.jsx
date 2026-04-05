"use client";
import { StarIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

export default function CustomButton() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex items-center justify-center">
      <label className="relative flex items-center justify-center w-7 h-7 cursor-pointer">
        {/* Hidden Checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={() => setChecked(!checked)}
          className="peer absolute w-full h-full opacity-0 cursor-pointer"
        />

        {/* Button (neumorphic effect) */}
        <span
          className={`absolute w-7 h-7 rounded-full transition-all duration-300 bg-white 
          ${
            checked
              ? "shadow-[0_10px_25px_-4px_rgba(0,0,0,0.4),inset_0_-8px_25px_-1px_rgba(255,255,255,0.9),0_-10px_15px_-1px_rgba(255,255,255,0.6),inset_0_8px_20px_0_rgba(0,0,0,0.2),inset_0_0_5px_1px_rgba(255,255,255,0.6)]"
              : "shadow-[0_15px_25px_-4px_rgba(0,0,0,0.5),inset_0_-3px_4px_-1px_rgba(0,0,0,0.2),0_-10px_15px_-1px_rgba(255,255,255,0.6),inset_0_3px_4px_-1px_rgba(255,255,255,0.2),inset_0_0_5px_1px_rgba(255,255,255,0.8),inset_0_20px_30px_0_rgba(255,255,255,0.2)]"
          }
          `}
        ></span>

        {/* Icon / Label */}
        <span
          className={`relative z-10 text-lg font-bold transition-all duration-300 
          ${checked ? "text-gray-800" : "text-gray-900"}`}
        >
          <StarIcon
            className={`w-4  ${checked ? "text-yellow-500" : "text-slate-400"}`}
          />
        </span>
      </label>
    </div>
  );
}
