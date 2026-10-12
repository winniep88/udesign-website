"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import fields from "@/data/site-content.json";
import "../admin.css";
import "./site-content.css";

type Values = Record<string, string>;
const defaults: Values = Object.fromEntries(fields.map((field) => [field.key, field.default]));
const groups = [...new Set(fields.map((field) => field.group))];
const pageLinks: Record<string, string> = {
  "Top banner": "/",
  Homepage: "/",
  "Projects page": "/projects/",
  "Moments page": "/moments/",
  "Winnie Cake Topper page": "/winnie-cake-topper/",
  "Cake topper events": "/winnie-cake-topper/",
  "Cake topper design photos": "/winnie-cake-topper/event/birthday/",
  "About us page": "/about/",
  Footer: "/",
};

export default function SiteContentEditorPage() {
  const { client, enabled, user, loading } = useAccount();
  const [values, setValues] = useState<Values>(defaults);
  const [saved, setSaved] = useState<Values>(defaults);
  const [access, setAccess] = useState<"checking" | "owner" | "denied">("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [group, setGroup] = useState(groups[1]);
  const visibleFields = useMemo(() => fields.filter((field) => field.group === group), [group]);
  const changed = fields.some((field) => values[field.key] !== saved[field.key]);

  const token = useCallback(async () => {
    if (!client) throw new Error("Please sign in first.");
    const session = await client.auth.getSession();
    if (!session.data.session?.access_token) throw new Error("Your sign-in has expired. Please sign in again.");
    return session.data.session.access_token;
  }, [client]);

  useEffect(() => {
    if (!enabled || !user) return;
    let active = true;
    token().then((accessToken) => fetch("/api/admin/site-content/", { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } }))
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Could not open the page editor.");
        return body;
      })
      .then((body) => {
        if (!active) return;
        const loaded = { ...defaults };
        for (const field of fields) if (typeof body.values?.[field.key] === "string") loaded[field.key] = body.values[field.key];
        setValues(loaded); setSaved(loaded); setAccess("owner");
      })
      .catch((error) => { if (active) { setAccess("denied"); setMessage((error as Error).message); } });
    return () => { active = false; };
  }, [enabled, user, token]);

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function upload(key: string, file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Choose a PNG, JPG or WebP photo under 5 MB."); return;
    }
    setBusy(true); setMessage("");
    try {
      const accessToken = await token();
      const response = await fetch("/api/admin/site-content/image/", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": file.type }, body: file });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.imageSrc) throw new Error(body.error || "Photo upload failed.");
      update(key, body.imageSrc);
      setMessage("Photo uploaded. Select Save changes to show it on the website.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/site-content/", { method: "POST", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The changes could not be saved.");
      setSaved({ ...values });
      window.dispatchEvent(new Event("udesign:site-content-changed"));
      setMessage("Saved. Open the page to see your changes.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="admin-page"><SiteHeader /><main className="shell admin-main">
    <div className="admin-heading"><div><p className="eyebrow">PRIVATE OWNER TOOLS</p><h1>Website editor<span>.</span></h1><p>Change the main page wording and photos yourself.</p></div><Link href="/admin/">← Back to dashboard</Link></div>
    {loading || enabled && user && access === "checking" ? <p role="status">Checking your access…</p> : !enabled ? <section className="admin-notice"><h2>Owner tools are being set up</h2></section> : !user ? <section className="admin-notice"><h2>Sign in first</h2><Link href="/account/">Go to sign in →</Link></section> : access !== "owner" ? <section className="admin-notice"><h2>Owner access required</h2><p>{message}</p></section> : <>
      <div className="site-editor__links"><Link href="/admin/products/">Edit products, product photos and prices</Link><Link href="/admin/topper-prices/">Edit custom cake topper prices</Link></div>
      <div className="site-editor"><nav className="site-editor__groups" aria-label="Website sections">{groups.map((name) => <button key={name} type="button" className={name === group ? "is-selected" : ""} onClick={() => setGroup(name)}>{name}{fields.some((field) => field.group === name && values[field.key] !== saved[field.key]) && <span aria-label="Unsaved changes"> ●</span>}</button>)}</nav>
        <form className="site-editor__form" onSubmit={save}><div className="admin-section-heading"><div><h2>{group}</h2><p>Changes appear on the website after you save.</p></div><Link href={pageLinks[group]} target="_blank" rel="noopener noreferrer">View page ↗</Link></div>
          <div className="site-editor__fields">{visibleFields.map((field) => <div className="site-editor__field" key={field.key}><div className="site-editor__field-heading"><label htmlFor={field.key}>{field.label}</label><button type="button" onClick={() => update(field.key, field.default)} disabled={busy || values[field.key] === field.default}>Use original</button></div>{field.type === "image" ? <><img src={values[field.key]} alt={`${field.label} preview`} /><input id={field.key} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(field.key, file); }} /><small>PNG, JPG or WebP. Maximum 5 MB.</small></> : (field.maxLength ?? 300) > 300 ? <textarea id={field.key} required rows={5} maxLength={field.maxLength} value={values[field.key]} onChange={(event) => update(field.key, event.target.value)} /> : <textarea id={field.key} required rows={(field.maxLength ?? 300) > 120 ? 3 : 2} maxLength={field.maxLength} value={values[field.key]} onChange={(event) => update(field.key, event.target.value)} />}</div>)}</div>
          <div className="site-editor__save"><span>{changed ? "You have unsaved changes." : "All changes saved."}</span><button type="submit" disabled={busy || !changed}>{busy ? "Saving…" : "Save changes"}</button></div>
        </form>
      </div>
    </>}
    {message && access === "owner" && <p className="admin-feedback" role="status">{message}</p>}
  </main><SiteFooter /></div>;
}
