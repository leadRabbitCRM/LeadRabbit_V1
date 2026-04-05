"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { ExclamationTriangleIcon, ArrowRightOnRectangleIcon, CheckIcon } from "@heroicons/react/24/solid";
import axios from "@/lib/axios";
import { INACTIVITY_TIME as DEFAULT_INACTIVITY_TIME, WARNING_BEFORE_LOGOUT as DEFAULT_WARNING_BEFORE } from "@/config/inactivity";

interface InactivityWarningProps {
  inactivityTime?: number;
  warningBefore?: number;
}

export function InactivityWarning({
  inactivityTime = DEFAULT_INACTIVITY_TIME,
  warningBefore = DEFAULT_WARNING_BEFORE,
}: InactivityWarningProps) {
  const router = useRouter();
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(10);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Function to handle logout
  const handleLogout = useCallback(async () => {
    try {
      console.log("⏱️ Inactivity timeout - Logging out user");
      await axios.post("logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      localStorage.removeItem("leadRabbit_favorites");
      router.push("/login");
    }
  }, [router]);

  // Function to reset the inactivity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear all timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);

    // Hide warning
    setIsWarningVisible(false);
    setRemainingSeconds(Math.round(warningBefore / 1000));

    const warningDelay = inactivityTime - warningBefore;
    const countdownSecs = Math.round(warningBefore / 1000);

    console.log(`⏱️ Inactivity timer set: ${inactivityTime / 1000}s total, warning at ${warningDelay / 1000}s, countdown ${countdownSecs}s`);

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      console.log("⚠️ Showing inactivity warning");
      setIsWarningVisible(true);
      
      // Start countdown
      let seconds = countdownSecs;
      countdownRef.current = setInterval(() => {
        seconds--;
        setRemainingSeconds(seconds);
        
        if (seconds <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, warningDelay);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      console.log("⏱️ Inactivity timer triggered");
      handleLogout();
    }, inactivityTime);
  }, [handleLogout, inactivityTime, warningBefore]);

  // Auto logout when timer reaches 0
  useEffect(() => {
    if (remainingSeconds === 0 && isWarningVisible) {
      console.log("⏱️ Timer reached 0 - auto closing modal and logging out");
      setIsWarningVisible(false); // Close the modal
      // Logout after a brief delay to allow modal to close
      setTimeout(() => {
        handleLogout();
      }, 300);
    }
  }, [remainingSeconds, isWarningVisible, handleLogout]);

  // Setup activity listeners
  useEffect(() => {
    const activityEvents = [
      "mousedown",
      "mouseup",
      "keydown",
      "keyup",
      "scroll",
      "touchstart",
      "touchend",
      "click",
    ];

    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity > 1000) {
        console.log("👤 User activity detected");
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimer();

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  const handleStayLoggedIn = () => {
    console.log("👤 User chose to stay logged in");
    setIsWarningVisible(false);
    resetTimer();
  };

  const handleLogoutNow = () => {
    console.log("👤 User chose to logout");
    handleLogout();
  };

  return (
    <Modal 
      isOpen={isWarningVisible} 
      onOpenChange={setIsWarningVisible} 
      isDismissable={false}
      size="md"
      backdrop="blur"
      classNames={{
        base: "bg-white",
      }}
    >
      <ModalContent className="py-0">
        {(onClose) => (
          <>
            {/* Header with gradient background */}
            <ModalHeader className="flex flex-col gap-0 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-t-lg p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Session Timeout</h2>
                  <p className="text-sm text-amber-100">You've been inactive</p>
                </div>
              </div>
            </ModalHeader>

            {/* Body */}
            <ModalBody className="p-8">
              <div className="space-y-6">
                {/* Main message */}
                <div className="text-center space-y-2">
                  <p className="text-gray-700 text-base font-medium">
                    Your session will expire soon
                  </p>
                  <p className="text-gray-600 text-sm">
                    Due to inactivity, you will be logged out in
                  </p>
                </div>

                {/* Countdown timer - Large and prominent */}
                <div className="flex justify-center">
                  <div className={`flex items-center justify-center w-24 h-24 rounded-full border-4 transition-all duration-300 ${
                    remainingSeconds > 5 
                      ? "border-amber-400 bg-amber-50" 
                      : "border-red-500 bg-red-50"
                  }`}>
                    <span className={`text-5xl font-bold transition-colors duration-300 ${
                      remainingSeconds > 5 
                        ? "text-amber-600" 
                        : "text-red-600"
                    }`}>
                      {remainingSeconds}
                    </span>
                  </div>
                </div>

                {/* Sub text */}
                <div className="text-center">
                  <p className="text-gray-500 text-sm">
                    {remainingSeconds === 1 ? "second" : "seconds"} remaining
                  </p>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <span className="font-medium">Tip:</span> Click "Stay Logged In" to continue using the app and reset your session.
                  </p>
                </div>
              </div>
            </ModalBody>

            {/* Footer */}
            <ModalFooter className="border-t border-gray-200 p-6 gap-3 bg-gray-50 rounded-b-lg">
              <Button
                fullWidth
                color="danger"
                variant="flat"
                className="font-semibold"
                startContent={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                onPress={handleLogoutNow}
              >
                Logout Now
              </Button>
              <Button
                fullWidth
                color="success"
                className="font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-shadow"
                startContent={<CheckIcon className="w-4 h-4" />}
                onPress={handleStayLoggedIn}
              >
                Stay Logged In
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
