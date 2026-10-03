import { whatsappLink } from "@/lib/contact";

export function CustomRequest({ brand }: { brand: string }) {
  return (
    <section className="custom-request shell" aria-labelledby="custom-request-title">
      <div>
        <h2 id="custom-request-title">Can&apos;t find what you&apos;re looking for?</h2>
        <p>No worries. Tell us what you have in mind and we&apos;ll help you find a way to make it yours.</p>
      </div>
      <a href={whatsappLink(`Hi UDESIGN, I'm looking for a custom ${brand} piece that isn't listed on your website.`)} target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp ↗</a>
    </section>
  );
}
