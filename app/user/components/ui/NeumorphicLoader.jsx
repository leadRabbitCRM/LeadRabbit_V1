"use client";

export default function NeumorphicLoader({ icon, name, count }) {
  return (
    <div className="flex items-center justify-center ">
      {/* Outer box (circle + text inside) */}
      <div className="relative flex items-center gap-2 w-full h-[60px] px-3 rounded-[12px] bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)]">
        {/* Circle */}
        <div className="relative w-[50px] h-[50px]">
          <div className="absolute inset-0 rounded-full bg-[#acbaca] shadow-[2px_2px_4px_0_#152b4a66,inset_2px_2px_2px_rgba(255,255,255,0.55),-3px_-3px_5px_rgba(255,255,255,1)]">
            {/* Animated Gradient */}
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-tr from-[#2196f3] to-[#e91e63] mix-blend-color-burn animate-[spin_2s_linear_infinite]"></div>

            {/* Inner Circle */}
            <div className="absolute inset-[8px] rounded-full bg-[#acbaca] blur-[0.5px] z-[1000] flex items-center justify-center">
              {icon}
            </div>
          </div>
        </div>

        {/* Text inside same box */}
        {/* <span className="text-base font-semibold text-gray-700">Loading...</span> */}
        <div>
          <p className="text-black font-black text-lg ">{count}</p>
          <p className="text-gray-700 text-[0.7rem]">{name}</p>
        </div>
      </div>
    </div>
  );
}
