import { CRM_STATUSES } from "@/lib/config";
import { humanize } from "@/lib/admin/format";
import { ActionForm, FieldError } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/buttons";
import { PageHeader } from "@/components/admin/ui";
import { createCustomer } from "../actions";

export const metadata = { title: "Add contact" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader back={{ href: "/admin/customers", label: "Customers" }} title="Add contact" description="Manually add a lead or customer, e.g. from a phone enquiry or trade show." />
      <div className="card max-w-2xl p-5 sm:p-6">
        <ActionForm action={createCustomer} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="off" className="input" />
            <FieldError name="email" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input id="name" name="name" autoComplete="off" className="input" />
              <FieldError name="name" />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input id="phone" name="phone" type="tel" autoComplete="off" className="input" />
              <FieldError name="phone" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="crmStatus" className="label">
                Status
              </label>
              <select id="crmStatus" name="crmStatus" defaultValue="LEAD" className="input">
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "VIP" ? "VIP" : humanize(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="label">
                Tags
              </label>
              <input id="tags" name="tags" placeholder="wholesale, athlete" className="input" />
              <p className="mt-1 text-xs text-ink-muted">Comma separated</p>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="marketingOptIn" className="h-4 w-4 rounded border-line accent-brand-500" />
            Has consented to marketing emails
          </label>
          <div>
            <label htmlFor="note" className="label">
              First note (optional)
            </label>
            <textarea id="note" name="note" rows={3} className="input" placeholder="Where did this lead come from?" />
          </div>
          <SubmitButton className="btn-primary" pendingLabel="Adding…">
            Add contact
          </SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
