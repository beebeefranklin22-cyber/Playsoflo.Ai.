import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Friendly toast messages for each delivery status the customer cares about.
const STATUS_TOASTS = {
  driver_assigned: { title: "Driver Assigned!", description: "A driver is heading to pick up your order." },
  picked_up: { title: "Package Picked Up", description: "Your package is on the move." },
  in_transit: { title: "In Transit", description: "Your delivery is on the way." },
  out_for_delivery: { title: "Out For Delivery", description: "Your driver is almost there." },
  delivered: { title: "Order Delivered!", description: "Your package has arrived. Enjoy!" },
};

export default function DeliveryNotificationHandler({ currentUser }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = base44.entities.DeliveryOrder.subscribe((event) => {
      const order = event.data;
      if (!order) return;

      const isCustomer =
        order.sender_email === currentUser.email ||
        order.recipient_email === currentUser.email;
      const isDriver = order.driver_email === currentUser.email;

      if (isCustomer && event.type === "update") {
        const msg = STATUS_TOASTS[order.status];
        if (msg) {
          toast.success(msg.title, { description: msg.description, duration: 5000 });
          if ("vibrate" in navigator) navigator.vibrate([150, 80, 150]);
        }
        queryClient.invalidateQueries({ queryKey: ["delivery-tracking", order.id] });
      } else if (isDriver) {
        queryClient.invalidateQueries({ queryKey: ["my-active-deliveries"] });
        queryClient.invalidateQueries({ queryKey: ["available-deliveries"] });
      }
    });

    return () => unsubscribe();
  }, [currentUser?.email, queryClient]);

  return null;
}