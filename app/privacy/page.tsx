import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { whatsappLink } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How UDESIGN PROJECTS STUDIO uses customer details for orders, accounts and optional promotions.",
};

export default function PrivacyPage() {
  const contact = whatsappLink("Hi UDESIGN, I have a question about my personal information.");
  return (
    <div>
      <SiteHeader />
      <main className="shell py-16 md:py-24">
        <p className="eyebrow">CUSTOMER INFORMATION</p>
        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">Privacy notice<span className="text-orange-500">.</span></h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">UDESIGN PROJECTS STUDIO uses your details to make and deliver your order. Promotional messages are always a separate choice.</p>

        <div className="mt-12 grid gap-12 border-t border-slate-300 pt-10 lg:grid-cols-2">
          <section aria-labelledby="privacy-en" className="space-y-7 leading-7">
            <h2 id="privacy-en" className="text-2xl font-bold">English</h2>
            <div><h3 className="font-bold">What we collect</h3><p>Your name, email, WhatsApp or phone number, delivery addresses, order and design details, reference images you upload, and your choices about promotional messages. If you create an account, we also keep its saved addresses, voucher and points history.</p></div>
            <div><h3 className="font-bold">How we use it</h3><p>We use this information to sign you in, answer enquiries, prepare and confirm designs, process and deliver orders, handle changes or refunds, and manage vouchers and points. We use your email or WhatsApp number for future offers only if you choose that channel separately.</p></div>
            <div><h3 className="font-bold">Who helps us</h3><p>Our website and account providers store the information needed to run the shop. We give CHIP the details needed to process an online payment and couriers the details needed for delivery. WhatsApp handles messages you send to us. We do not store your payment card details.</p></div>
            <div><h3 className="font-bold">Your choices</h3><p>You can edit saved addresses and promotional choices in your account when account features are available. You can also ask us to access, correct or remove your information, or stop promotional messages, by <a className="underline" href={contact} target="_blank" rel="noopener noreferrer">contacting UDESIGN on WhatsApp</a>. We may keep order information where needed for accounting or legal obligations.</p></div>
          </section>
          <section aria-labelledby="privacy-ms" className="space-y-7 leading-7">
            <h2 id="privacy-ms" className="text-2xl font-bold">Bahasa Malaysia</h2>
            <div><h3 className="font-bold">Maklumat yang kami kumpulkan</h3><p>Nama, e-mel, nombor WhatsApp atau telefon, alamat penghantaran, butiran pesanan dan reka bentuk, imej rujukan yang anda muat naik, serta pilihan anda mengenai mesej promosi. Jika anda membuat akaun, kami juga menyimpan alamat, baucar dan sejarah mata ganjaran.</p></div>
            <div><h3 className="font-bold">Cara kami menggunakannya</h3><p>Kami menggunakan maklumat ini untuk log masuk, menjawab pertanyaan, menyediakan dan mengesahkan reka bentuk, memproses dan menghantar pesanan, mengurus perubahan atau bayaran balik, serta mengurus baucar dan mata ganjaran. Kami menghantar tawaran melalui e-mel atau WhatsApp hanya jika anda memilih saluran tersebut secara berasingan.</p></div>
            <div><h3 className="font-bold">Pihak yang membantu kami</h3><p>Penyedia laman web dan akaun kami menyimpan maklumat yang diperlukan untuk menjalankan kedai. Kami memberikan maklumat yang diperlukan kepada CHIP untuk memproses bayaran dalam talian dan kepada kurier untuk penghantaran. WhatsApp mengendalikan mesej yang anda hantar kepada kami. Kami tidak menyimpan butiran kad pembayaran anda.</p></div>
            <div><h3 className="font-bold">Pilihan anda</h3><p>Anda boleh mengubah alamat tersimpan dan pilihan promosi dalam akaun apabila ciri akaun tersedia. Anda juga boleh meminta akses, pembetulan atau pemadaman maklumat, atau menghentikan mesej promosi, dengan <a className="underline" href={contact} target="_blank" rel="noopener noreferrer">menghubungi UDESIGN melalui WhatsApp</a>. Kami mungkin menyimpan maklumat pesanan jika diperlukan untuk perakaunan atau kewajipan undang-undang.</p></div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
