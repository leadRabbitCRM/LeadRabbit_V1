import { useState, useEffect, useRef } from "react";
import CustomCard from "./CustomCard";
import { Spinner } from "@heroui/react";

import LeadDrawerCard from "./LeadDrawerCard";

export default function LeadList({
  leads,
  favorites = [],
  onToggleFavorite,
  onStatusChange,
  onMeetingsChange,
  onEngagementsChange,
}) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setLoading(true); // start loader
          setTimeout(() => {
            setVisibleCount((prev) => prev + 1);
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
  const [openLeadId, setOpenLeadId] = useState(null);

  return (
    <div>
      <div className="flex flex-col gap-3">
        {leads.slice(0, visibleCount).map((lead, idx) => (
          <div key={lead._id || idx}>
            <LeadDrawerCard
              isOpen={openLeadId === lead._id}
              onOpen={() => setOpenLeadId(lead._id)}
              onOpenChange={(open) => setOpenLeadId(open ? lead._id : null)}
              lead={lead}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onStatusChange={onStatusChange}
              onMeetingsChange={onMeetingsChange}
              onEngagementsChange={onEngagementsChange}
            />
            <CustomCard
              lead={lead}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onOpen={() => setOpenLeadId(lead._id)}
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
