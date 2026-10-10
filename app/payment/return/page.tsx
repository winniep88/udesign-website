"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { whatsappLink } from "@/lib/contact";

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed" | "refunding" | "refunded" | "error">("checking");
  const [orderId, setOrderId] = useState("");
  const [isTest, setIsTest] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order") || "";
    setOrderId(id);
    if (!/^[0-9a-f-]{36}$/.test(id)) { setStatus("error"); return; }
    fetch(`/api/orders/${id}/status/`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to check payment");
      const data = await response.json();
      setIsTest(data.test === true);
      setStatus(["paid", "pending", "failed", "refunding", "refunded"].includes(data.status) ? data.status : "error");
    }).catch(() => setStatus("error"));
  }, []);

  const headings = isTest
    ? { checking: "Checking test payment…", paid: "Test payment completed.", pending: "Test payment is still being confirmed.", failed: "Test payment did not complete.", refunding: "Test refund is being processed.", refunded: "Test payment was refunded.", error: "We couldn’t check the test payment." }
    : { checking: "Checking your payment…", paid: "Payment received.", pending: "Payment is still being confirmed.", failed: "Payment did not complete.", refunding: "Your refund is being processed.", refunded: "Your payment was refunded.", error: "We couldn’t check your payment." };

  return <div className="cart-page"><SiteHeader active="cart" /><main className="cart-content shell"><section className="cart-request">
    <p className="eyebrow">UDESIGN PROJECTS STUDIO</p>
    <h1>{headings[status]}</h1>
    {orderId && <p>Order reference: {orderId}</p>}
    {isTest ? <p>This is a CHIP test. No real money was collected and no customer order was placed.</p> : status === "paid" ? <p>Thank you. We&apos;ll contact you on WhatsApp about your order and design. If anything needs changing, we&apos;ll agree on a replacement or refund with you first.</p> : status === "refunding" || status === "refunded" ? <p>We&apos;ll confirm the refund details with you on WhatsApp.</p> : <p>Please do not pay again yet. Contact us on WhatsApp with your order reference and we&apos;ll check it for you.</p>}
    <div className="cart-request__actions"><a className="cart-request__whatsapp" href={whatsappLink(`Hi UDESIGN, please check my order ${orderId || ""} and payment status.`)} target="_blank" rel="noopener noreferrer">Contact us on WhatsApp ↗</a><Link href="/cart/">Back to cart</Link></div>
  </section></main><SiteFooter /></div>;
}
