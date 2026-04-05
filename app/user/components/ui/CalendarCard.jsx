// components/CalendarCard.tsx
export default function CalendarCard({ month, date }) {
  return (
    <div className="w-14 rounded-md shadow-md overflow-hidden text-center bg-white scale-80">
      {/* Header */}
      <div className="bg-red-500 text-white font-bold pt-1 relative">
        <span className="text-xs uppercase tracking-wide">{month}</span>
        {/* Top black tabs */}
        <div className="absolute top-0 left-[0.6rem] w-2 h-2 bg-gray-800 rounded-b-sm"></div>
        <div className="absolute top-0 right-[0.6rem] w-2 h-2 bg-gray-800 rounded-b-sm"></div>
      </div>

      {/* Date */}
      <div className=" text-gray-800">
        <span className="text-2xl font-extrabold">{date}</span>
      </div>
    </div>
  );
}
