import { redirect } from "next/navigation";

// The basket lives in the slide-out drawer; the full checkout page doubles as the cart page.
export default function CartPage() {
  redirect("/checkout");
}
