"use client";

import { useRouter } from "next/navigation";
import { topperEventHref, topperEvents } from "@/lib/topper";

export function TopperEventPicker() {
  const router = useRouter();

  return (
    <div className="topper-event-picker">
      <label htmlFor="topper-event">Choose your event</label>
      <select id="topper-event" defaultValue="" onChange={(event) => {
        if (event.currentTarget.value) router.push(topperEventHref(event.currentTarget.value));
      }}>
        <option value="" disabled>Select an event</option>
        {topperEvents.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
      </select>
      <p>Selecting an event opens its page. Then customise one cake topper with your wording and size.</p>
    </div>
  );
}
