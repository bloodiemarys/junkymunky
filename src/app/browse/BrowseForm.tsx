"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrowseForm({ zip }: { zip?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(zip ?? "");

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("zip", value.trim());
    } else {
      params.delete("zip");
    }
    router.push(`/browse?${params.toString()}`);
  }, [value, router, searchParams]);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label htmlFor="browse-zip" className="sr-only">
        Filter by ZIP
      </label>
      <Input
        id="browse-zip"
        type="text"
        placeholder="ZIP code"
        className="w-28"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={10}
      />
      <Button type="submit" variant="secondary" size="sm">
        Filter
      </Button>
      {zip?.trim() ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setValue("");
            router.push("/browse");
          }}
        >
          Clear
        </Button>
      ) : null}
    </form>
  );
}
