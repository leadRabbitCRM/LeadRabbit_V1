"use client";
import React from "react";

export default function widget({ icon, count, name, color }) {
  return (
    <div>
      <div className="w-[20rem] h-[8rem] shadow-2xl rounded-xl md:p-10 p-7 flex gap-4 max-md:gap-2 md:mt-5 items-center bg-white max-md:w-full max-md:h-[4rem]">
        <div className="flex flex-col items-center">
          <div className="bg-primary rounded-full p-4 max-md:p-1">{icon}</div>
        </div>
        <div>
          <p className={`font-extrabold text-2xl max-md:text-base ${color}`}>
            {count}
          </p>
          <p className="text-xs text-slate-400 max-md:text-[0.6rem]">{name}</p>
        </div>
      </div>
    </div>
  );
}
