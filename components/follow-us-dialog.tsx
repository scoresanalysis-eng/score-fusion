"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";

interface FollowUsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowUsDialog({ open, onOpenChange }: FollowUsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Follow Us
          </DialogTitle>
          <DialogDescription className="text-center">
            Stay connected and get instant updates on predictions, tips, and
            exclusive offers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <a
            href="https://api.whatsapp.com/send?phone=84867084414&text=Hello%2C%20I%20would%20like%20to%20get%20in%20touch%20with%20Score%20Fusion."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg
              className="h-6 w-6 text-[#25D366]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-foreground">WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                Contact us on Whatsapp
              </p>
            </div>
          </a>
          <a
            href="https://t.me/Donaldauthorr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg
              className="h-6 w-6 text-[#0088cc]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Telegram</p>
              <p className="text-sm text-muted-foreground">
                Contact us on Telegram
              </p>
            </div>
          </a>
          <a
            href="https://t.me/+QysfcefOapnhAbKA"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg
              className="h-6 w-6 text-[#0088cc]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Telegram</p>
              <p className="text-sm text-muted-foreground">
                Follow our Telegram channel
              </p>
            </div>
          </a>
          <a
            href="mailto:scorefusionn@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg
              className="h-6 w-6 text-[#ff9204]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 6C22 5.44772 21.5523 5 21 5H3C2.44772 5 2 5.44772 2 6V18C2 18.5523 2.44772 19 3 19H21C21.5523 19 22 18.5523 22 18V6ZM20 7L12 13L4 7H20ZM20 17H4V8.5L12 14.5L20 8.5V17Z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">Send us an email</p>
            </div>
          </a>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By following us, you&apos;ll never miss important updates and
          exclusive VIP predictions
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function FollowUsFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-linear-to-r from-green-500 to-blue-500 text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center z-40 animate-pulse hover:animate-none"
        aria-label="Follow us"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <FollowUsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
