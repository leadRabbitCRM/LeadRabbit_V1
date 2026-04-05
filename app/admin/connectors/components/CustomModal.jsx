import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export default function CustomModal({
  title = "Integration Updated",
  body,
  message,
  action = "Continue",
  isOpen,
  onOpenChange,
  onConfirm,
  confirmText,
  confirmColor = "primary",
}) {
  const isConfirmModal = !!onConfirm;
  
  // Determine icon and background color based on confirmColor
  const getIconConfig = () => {
    if (!isConfirmModal) {
      return { bgClass: 'bg-green-100', iconClass: 'text-green-600', Icon: CheckCircleIcon };
    }
    
    switch (confirmColor) {
      case 'danger':
        return { bgClass: 'bg-red-100', iconClass: 'text-red-600', Icon: ExclamationTriangleIcon };
      case 'warning':
        return { bgClass: 'bg-orange-100', iconClass: 'text-orange-600', Icon: ExclamationTriangleIcon };
      case 'success':
        return { bgClass: 'bg-green-100', iconClass: 'text-green-600', Icon: CheckCircleIcon };
      default:
        return { bgClass: 'bg-blue-100', iconClass: 'text-blue-600', Icon: CheckCircleIcon };
    }
  };

  const { bgClass, iconClass, Icon } = getIconConfig();

  const getButtonClassName = () => {
    switch (confirmColor) {
      case 'danger':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-500';
    }
  };
  
  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      radius="lg"
      classNames={{
        body: "py-6",
        backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
        base: "border-[#292f46] bg-white max-w-md",
        header: "border-b-[1px] border-[#292f46]/10",
        footer: "border-t-[1px] border-[#292f46]/10",
        closeButton: "hover:bg-white/5 active:bg-white/10",
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 items-center text-center">
              <div className={`${bgClass} rounded-full p-3 mb-2`}>
                <Icon className={`w-8 h-8 ${iconClass}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </ModalHeader>
            <ModalBody className="text-center">
              <p className="text-gray-600 leading-relaxed">
                {message || body ||
                  "Your Facebook integration settings have been successfully updated. The changes will take effect immediately."}
              </p>
            </ModalBody>
            <ModalFooter className="justify-center gap-3">
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                radius="lg"
              >
                {isConfirmModal ? "Cancel" : "Close"}
              </Button>
              {isConfirmModal ? (
                <Button
                  color={confirmColor}
                  onPress={() => {
                    onConfirm();
                    onClose();
                  }}
                  radius="lg"
                  className={getButtonClassName()}
                >
                  {confirmText || "Confirm"}
                </Button>
              ) : (
                <Button
                  color="primary"
                  onPress={onClose}
                  radius="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  {action}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
