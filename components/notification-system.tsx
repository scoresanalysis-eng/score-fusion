"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  X,
  TrendingUp,
  Crown,
  Gift,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "promotion";
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: Date;
  read: boolean;
}

interface NotificationSystemProps {
  user: any;
  isVIP: boolean;
}

export function NotificationSystem({ user, isVIP }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Generate contextual notifications
    const contextualNotifications: Notification[] = [];

    // Welcome notification for new users
    if (user) {
      const joinedRecently = new Date().getTime() - new Date(user.createdAt || Date.now()).getTime() < 24 * 60 * 60 * 1000;
      if (joinedRecently) {
        contextualNotifications.push({
          id: "welcome",
          type: "info",
          title: "Welcome to ScoreFusion! 🎉",
          message: "Start exploring our tips to begin your winning journey",
          action: {
            label: "View Tips",
            href: "/tips"
          },
          timestamp: new Date(),
          read: false,
        });
      }
    }

    // VIP promotion for active non-VIP users only
    if (!isVIP && user) {
      contextualNotifications.push({
        id: "vip-promo",
        type: "promotion",
        title: "Limited Time: 50% OFF VIP! 🔥",
        message: "Upgrade now and get access to 85%+ win rate tips",
        action: {
          label: "Get VIP",
          href: "/subscriptions"
        },
        timestamp: new Date(),
        read: false,
      });
    }

    // Success notification for VIP users
    if (isVIP) {
      contextualNotifications.push({
        id: "vip-success",
        type: "success",
        title: "VIP Access Active ✅",
        message: "You have access to all premium features and tips",
        action: {
          label: "VIP Area",
          href: "/vip"
        },
        timestamp: new Date(),
        read: false,
      });
    }

    // Daily tips notification
    const now = new Date();
    const isAfternoon = now.getHours() >= 14 && now.getHours() < 18;
    if (isAfternoon) {
      contextualNotifications.push({
        id: "daily-tips",
        type: "info",
        title: "New Tips Available! ⚽",
        message: "Fresh predictions are ready for today's matches",
        action: {
          label: "View Tips",
          href: "/tips"
        },
        timestamp: new Date(),
        read: false,
      });
    }

    setNotifications(contextualNotifications);
  }, [user, isVIP]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "promotion":
        return <Crown className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "border-green-500";
      case "warning":
        return "border-yellow-500";
      case "promotion":
        return "border-primary";
      default:
        return "border-blue-500";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-background border border-border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-l-4 ${getBorderColor(notification.type)} ${
                  !notification.read ? "bg-accent/50" : ""
                } hover:bg-accent/30 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="h-6 w-6 p-0 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      {notification.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            markAsRead(notification.id);
                            window.location.href = notification.action!.href;
                          }}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
