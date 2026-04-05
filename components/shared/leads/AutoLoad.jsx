import { useState, useEffect, useRef } from "react";
import CustomCard from "./CustomCard";
import { Spinner } from "@heroui/react";
import axios from "@/lib/axios";

export default function LeadList({
  leads,
  favorites = [],
  onToggleFavorite,
  onStatusChange,
  onMeetingsChange,
  onEngagementsChange,
  isAdmin = false,
  navigateTo = "/admin/allLeads",
  users = [],
}) {
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setLoading(true); // start loader
          setTimeout(() => {
            setVisibleCount((prev) => prev + 5);
            setLoading(false); // stop loader
          }, 2000); // simulate API delay
        }
      },
      { threshold: 1 },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loading]);
  
  return (
    <div>
      <div className="flex flex-col gap-3">
        {leads.slice(0, visibleCount).map((lead, idx) => (
          <div key={lead._id || idx}>
            <CustomCard
              lead={lead}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              isAdmin={isAdmin}
              users={users}
              navigateTo={navigateTo}
            />
          </div>
        ))}
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center my-4">
          <Spinner />
        </div>
      )}

      {/* Trigger infinite scroll */}
      {visibleCount < leads.length && (
        <div ref={loaderRef} className="h-10"></div>
      )}
      <div className=" py-2"></div>
    </div>
  );
}
