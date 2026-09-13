import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { site } from "@/lib/site";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Liên hệ",
  description:
    "Liên hệ với Vipextoy để được tư vấn sản phẩm chăm sóc cá nhân riêng tư, hỗ trợ đơn hàng và giải đáp thắc mắc — bảo mật thông tin tuyệt đối.",
  alternates: { canonical: "/lien-he" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-wide text-gold">Liên hệ</p>
        <h1 className="mt-2 font-serif text-3xl text-ivory">
          Chúng tôi luôn sẵn sàng hỗ trợ
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Mọi thông tin liên hệ và trao đổi với Vipextoy đều được bảo mật
          tuyệt đối. Gửi câu hỏi cho chúng tôi hoặc liên hệ trực tiếp qua các
          kênh bên dưới.
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <ContactForm />

        <div className="flex flex-col gap-6">
          <div className="flex gap-4 border border-line bg-surface p-6">
            <Phone size={20} strokeWidth={1.4} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm text-ivory">Điện thoại &amp; Zalo</p>
              <a href={site.phoneHref} className="mt-1 block text-sm text-muted hover:text-ivory">
                {site.phone}
              </a>
            </div>
          </div>
          <div className="flex gap-4 border border-line bg-surface p-6">
            <Mail size={20} strokeWidth={1.4} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm text-ivory">Email</p>
              <a
                href={`mailto:${site.email}`}
                className="mt-1 block text-sm text-muted hover:text-ivory"
              >
                {site.email}
              </a>
            </div>
          </div>
          <div className="flex gap-4 border border-line bg-surface p-6">
            <MapPin size={20} strokeWidth={1.4} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm text-ivory">Địa chỉ</p>
              <p className="mt-1 text-sm text-muted">{site.address1}</p>
              <p className="mt-1 text-sm text-muted">{site.address2}</p>
            </div>
          </div>
          <div className="flex gap-4 border border-line bg-surface p-6">
            <Clock size={20} strokeWidth={1.4} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm text-ivory">Giờ làm việc</p>
              <p className="mt-1 text-sm text-muted">{site.hours}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
