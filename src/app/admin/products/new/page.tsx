import { FUNCTIONS, GOALS } from "@/lib/taxonomy";
import { productFormOptions } from "@/lib/admin/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { categories, brands } = await productFormOptions();
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="New product" />
      <ProductForm
        categories={categories}
        brands={brands}
        goals={GOALS}
        functions={FUNCTIONS}
        initial={{
          title: "",
          slug: "",
          brand: "",
          categoryId: "",
          tags: [],
          status: "DRAFT",
          featured: false,
          subscribable: true,
          subscriptionDiscountPct: 10,
          seoTitle: "",
          seoDescription: "",
          descriptionHtml: "",
          images: [],
          variants: [{ title: "Default", sku: "", price: "", compareAt: "", stock: "0" }],
        }}
      />
    </>
  );
}
