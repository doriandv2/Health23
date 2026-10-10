import type { Metadata } from "next";
import { Mail, MapPin, Clock } from "lucide-react";
import { SITE } from "@/lib/config";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with the Red23 team — we aim to respond within 24–48 hours." };

export default function ContactPage() {
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-5xl">Get in touch</h1>
        <p className="mt-4 text-ink-soft">Please get in touch using the form, we aim to respond to all queries within 24–48 hours.</p>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3"><Mail className="h-5 w-5 text-sage-600" /><a href={`mailto:${SITE.email}`} className="hover:text-brand-600">{SITE.email}</a></li>
          <li className="flex gap-3"><Clock className="h-5 w-5 text-sage-600" />Replies within 24–48 hours</li>
          <li className="flex gap-3"><MapPin className="h-5 w-5 text-sage-600" />Returns: {SITE.returnsAddress}</li>
        </ul>
      </div>
      <ContactForm />
    </div>
  );
}
