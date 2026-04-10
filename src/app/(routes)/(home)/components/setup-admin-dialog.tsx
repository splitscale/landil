"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SetupAdminDialog() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const claim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up admin access</DialogTitle>
          <DialogDescription>
            No admin account exists yet. As the first user, you can claim admin access now.
            This option disappears once an admin is assigned.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Skip
          </Button>
          <Button onClick={claim} disabled={loading}>
            {loading ? "Claiming…" : "Claim admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
