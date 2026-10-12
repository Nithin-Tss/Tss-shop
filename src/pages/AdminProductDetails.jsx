import { useParams } from "react-router-dom";
import { ProductForm } from "@/pages/AdminAddProduct";

// Editing a product uses the same form as adding one, filled with its saved data
export default function AdminProductDetails() {
  const { productId } = useParams();
  return <ProductForm key={productId} productId={productId} />;
}
