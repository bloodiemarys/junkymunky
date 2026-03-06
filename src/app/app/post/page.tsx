"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createJobAction, addJobPhotosAction } from "@/app/app/post/actions";

const bannedItems = [
  "Hazardous waste (hazmat), chemicals, pesticides",
  "Asbestos",
  "Medical waste / needles",
  "Explosives / ammunition",
  "Radioactive materials",
  "Anything illegal or unsafe to transport",
];

export default function PostJobPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const files = (formData.getAll("photos") as File[]).filter((f) => f?.size);
    if (files.length < 1) {
      toast.error("Please add at least one photo.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        category: String(formData.get("category") ?? ""),
        size: String(formData.get("size") ?? ""),
        estimated_cubic_yards: formData.get("estimated_cubic_yards")
          ? Number(formData.get("estimated_cubic_yards"))
          : undefined,
        reusable_ok: Boolean(formData.get("reusable_ok")),
        address_line1: String(formData.get("address_line1") ?? ""),
        address_line2: String(formData.get("address_line2") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        zip: String(formData.get("zip") ?? ""),
        location_instructions: String(formData.get("location_instructions") ?? ""),
        preferred_window_start: String(formData.get("preferred_window_start") ?? ""),
        preferred_window_end: String(formData.get("preferred_window_end") ?? ""),
        policy_accepted: formData.get("policy_accepted") === "on",
      };

      const created = await createJobAction(payload);
      if (!created.ok) throw new Error(created.error);
      const jobId = created.jobId;

      const paths: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
        const objectName = `${jobId}/${crypto.randomUUID()}.${safeExt}`;

        const { error } = await supabase.storage.from("job-photos").upload(objectName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        paths.push(objectName);
      }

      const added = await addJobPhotosAction({ jobId, storagePaths: paths });
      if (!added.ok) throw new Error(added.error);

      toast.success("Job posted");
      router.push(`/app/jobs/${jobId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Post a pickup job</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Add photos and details. Removers will bid. No payment until you accept a bid.
      </p>

      <form action={onSubmit} className="mt-8 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Job details</CardTitle>
            <CardDescription>Be specific—better photos and details get better bids.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Old couch + bags of trash" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What needs to go? Any stairs? Access notes?"
                required
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Furniture / Yard waste / Construction" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size">Size</Label>
                <select
                  id="size"
                  name="size"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  required
                  defaultValue="small"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="cubic_yards">Cubic yards</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="estimated_cubic_yards">Estimated cubic yards (optional)</Label>
                <Input id="estimated_cubic_yards" name="estimated_cubic_yards" type="number" step="0.25" min="0" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="reusable_ok" className="h-4 w-4" />
                Items may be reusable/keepable
              </label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photos">Photos (1+)</Label>
              <Input id="photos" name="photos" type="file" accept="image/*" multiple required />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tip: include one wide photo and a close-up of the biggest item.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="address_line1">Address</Label>
              <Input id="address_line1" name="address_line1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_line2">Apt / Unit (optional)</Label>
              <Input id="address_line2" name="address_line2" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" name="zip" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location_instructions">Location instructions (optional)</Label>
              <Textarea
                id="location_instructions"
                name="location_instructions"
                placeholder="Gate code, where items are, parking tips, etc."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="preferred_window_start">Preferred window start (optional)</Label>
                <Input id="preferred_window_start" name="preferred_window_start" type="datetime-local" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferred_window_end">Preferred window end (optional)</Label>
                <Input id="preferred_window_end" name="preferred_window_end" type="datetime-local" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety checklist</CardTitle>
            <CardDescription>This marketplace is for lawful, non-hazardous items only.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
              {bannedItems.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="policy_accepted" className="mt-1 h-4 w-4" required />
              <span>
                I confirm this job does not contain hazardous, illegal, medical, or restricted
                materials, and is within the law.
              </span>
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? "Posting…" : "Post job"}
          </Button>
        </div>
      </form>
    </div>
  );
}

