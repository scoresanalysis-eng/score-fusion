import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

// Store active connections
const connections = new Map<
  string,
  {
    ws: WebSocket;
    userId?: string;
    channels: Set<string>;
    lastPing: number;
  }
>();

// Store channel subscribers
const channelSubscribers = new Map<string, Set<string>>();

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit.check(
      `realtime:ip:${ip}`,
      20,
      60000
    ); // 20 per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many connection attempts" },
        { status: 429 }
      );
    }

    // Get authenticated user (optional for some channels)
    const auth = await getAuthenticatedUser(request);

    // This is a placeholder for WebSocket upgrade
    // In a real implementation, you'd use a proper WebSocket server
    // For Next.js App Router, you might use a separate service or Server-Sent Events

    return NextResponse.json({
      success: true,
      message: "Real-time subscription endpoint",
      data: {
        userId: auth.user?.id,
        availableChannels: getAvailableChannels(auth.user),
      },
    });
  } catch (error) {
    console.error("Real-time subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get available channels for user
function getAvailableChannels(user?: {
  id: string;
  isAdmin?: boolean;
  displayName?: string;
}): string[] {
  const publicChannels = [
    "public:tips",
    "public:analytics",
    "public:live_stats",
  ];

  if (!user) {
    return publicChannels;
  }

  const userChannels = [
    `user:${user.id}:notifications`,
    `user:${user.id}:bets`,
    `user:${user.id}:updates`,
  ];

  const registeredChannels = ["public:featured", "public:announcements"];

  if (user.isAdmin) {
    return [
      ...publicChannels,
      ...userChannels,
      ...registeredChannels,
      "admin:alerts",
      "admin:analytics",
      "admin:users",
      "admin:tips_management",
    ];
  }

  return [...publicChannels, ...userChannels, ...registeredChannels];
}

// Server-Sent Events endpoint as an alternative to WebSockets
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { channels = [], message } = body;

    // Validate channels
    const availableChannels = getAvailableChannels(auth.user);
    const validChannels = channels.filter((channel: string) =>
      availableChannels.includes(channel)
    );

    if (validChannels.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid channels provided" },
        { status: 400 }
      );
    }

    // Broadcast message to channels
    const broadcastResult = await broadcastToChannels(validChannels, {
      type: "user_message",
      data: message,
      userId: auth.user.id,
      timestamp: new Date().toISOString(),
      user: {
        id: auth.user.id,
        displayName: auth.user.displayName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Message broadcasted successfully",
      data: {
        channels: validChannels,
        recipients: broadcastResult.recipients,
      },
    });
  } catch (error) {
    console.error("Real-time message error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to broadcast to channels
async function broadcastToChannels(
  channels: string[],
  message: Record<string, unknown>
): Promise<{ recipients: number }> {
  let totalRecipients = 0;

  for (const channel of channels) {
    const subscribers = channelSubscribers.get(channel) || new Set();

    for (const connectionId of subscribers) {
      const connection = connections.get(connectionId);

      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(
            JSON.stringify({
              channel,
              ...message,
            })
          );
          totalRecipients++;
        } catch (error) {
          console.error("Failed to send message to connection:", connectionId);
          // Remove dead connection
          removeConnection(connectionId);
        }
      }
    }
  }

  return { recipients: totalRecipients };
}

// Connection management functions
export function addConnection(
  ws: WebSocket,
  userId?: string,
  channels: string[] = []
): string {
  const connectionId = randomUUID();

  const connection = {
    ws,
    userId,
    channels: new Set(channels),
    lastPing: Date.now(),
  };

  connections.set(connectionId, connection);

  // Subscribe to channels
  for (const channel of channels) {
    if (!channelSubscribers.has(channel)) {
      channelSubscribers.set(channel, new Set());
    }
    channelSubscribers.get(channel)!.add(connectionId);
  }

  // Set up connection event handlers
  ws.on("close", () => removeConnection(connectionId));
  ws.on("error", () => removeConnection(connectionId));
  ws.on("pong", () => {
    const conn = connections.get(connectionId);
    if (conn) {
      conn.lastPing = Date.now();
    }
  });

  return connectionId;
}

export function removeConnection(connectionId: string): void {
  const connection = connections.get(connectionId);

  if (connection) {
    // Remove from channel subscriptions
    for (const channel of connection.channels) {
      const subscribers = channelSubscribers.get(channel);
      if (subscribers) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          channelSubscribers.delete(channel);
        }
      }
    }

    // Remove connection
    connections.delete(connectionId);
  }
}

export function subscribeToChannels(
  connectionId: string,
  channels: string[]
): boolean {
  const connection = connections.get(connectionId);

  if (!connection) {
    return false;
  }

  for (const channel of channels) {
    connection.channels.add(channel);

    if (!channelSubscribers.has(channel)) {
      channelSubscribers.set(channel, new Set());
    }
    channelSubscribers.get(channel)!.add(connectionId);
  }

  return true;
}

export function unsubscribeFromChannels(
  connectionId: string,
  channels: string[]
): boolean {
  const connection = connections.get(connectionId);

  if (!connection) {
    return false;
  }

  for (const channel of channels) {
    connection.channels.delete(channel);

    const subscribers = channelSubscribers.get(channel);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        channelSubscribers.delete(channel);
      }
    }
  }

  return true;
}

// Cleanup function for removing inactive connections
export function cleanupConnections(): void {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  for (const [connectionId, connection] of connections.entries()) {
    if (now - connection.lastPing > timeout) {
      connection.ws.terminate();
      removeConnection(connectionId);
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(cleanupConnections, 60000); // Check every minute
}

// Public functions for external broadcasting
export async function broadcastToChannel(
  channel: string,
  message: Record<string, unknown>
): Promise<number> {
  const result = await broadcastToChannels([channel], message);
  return result.recipients;
}

export function getConnectionStats(): {
  totalConnections: number;
  channelStats: Record<string, number>;
  authenticatedConnections: number;
} {
  const channelStats: Record<string, number> = {};

  for (const [channel, subscribers] of channelSubscribers.entries()) {
    channelStats[channel] = subscribers.size;
  }

  const authenticatedConnections = Array.from(connections.values()).filter(
    (conn) => conn.userId
  ).length;

  return {
    totalConnections: connections.size,
    channelStats,
    authenticatedConnections,
  };
}
