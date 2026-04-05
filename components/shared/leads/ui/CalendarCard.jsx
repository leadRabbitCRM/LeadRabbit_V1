export default function CalendarCard({ month, date }) {
  return (
    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-lg shadow border border-gray-200 flex-shrink-0">
      <div className="text-[10px] font-semibold text-white bg-blue-500 w-full text-center py-0.5 rounded-t-lg">
        {month}
      </div>
      <div className="text-sm font-bold text-gray-800 flex-1 flex items-center justify-center">
        {date}
      </div>
    </div>
  );
}
