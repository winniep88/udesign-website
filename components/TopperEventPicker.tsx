"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { topperEventHref, topperEvents } from "@/lib/topper";

export function TopperEventPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected) router.push(topperEventHref(selected));
  }

  return (
    <form className="topper-event-picker" onSubmit={submit}>
      <label htmlFor="topper-event">Choose your event</label>
      <select id="topper-event" value={selected} onChange={(event) => setSelected(event.target.value)} required>
        <option value="" disabled>Select an event</option>
        {topperEvents.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
      </select>
      <button type="submit" disabled={!selected}>See cake toppers <span aria-hidden="true">→</span></button>
      <p>Next, choose a one, two or three line topper.</p>
    </form>
  );
}

