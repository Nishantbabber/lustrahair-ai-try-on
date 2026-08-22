import type { Look, Product } from "@/types/tryon";

export const LOOKS: Look[] = [
  {
    id: "signature-waves",
    name: "Signature Waves",
    category: "Long · Wavy",
    length: '22"',
    description: "Soft, effortless waves with natural movement.",
    previewImage: "/images/looks/signature-waves.jpg",
    demoResultImage: "/images/demo-results/signature-waves.jpg",
    aiInstruction:
      "Transform the hair into long 22-inch soft loose waves with natural movement and body. The waves should be effortless and flowing, with subtle volume throughout.",
    stylistRecommendation:
      "This look adds soft movement and volume while keeping the overall silhouette natural. Perfect for everyday elegance.",
    productId: "product-signature-waves",
  },
  {
    id: "silk-straight",
    name: "Silk Straight",
    category: "Long · Straight",
    length: '24"',
    description: "Sleek, polished length with a smooth finish.",
    previewImage: "/images/looks/silk-straight.jpg",
    demoResultImage: "/images/demo-results/silk-straight.jpg",
    aiInstruction:
      "Transform the hair into long 24-inch sleek straight hair with a polished, smooth finish. The hair should fall smoothly with a glossy, salon-quality appearance.",
    stylistRecommendation:
      "Silk straight creates a refined, polished look that frames the face beautifully. Ideal for a sophisticated, timeless style.",
    productId: "product-silk-straight",
  },
  {
    id: "soft-layers",
    name: "Soft Layers",
    category: "Layered",
    length: '20"',
    description: "Face-framing layers for natural-looking volume.",
    previewImage: "/images/looks/soft-layers.jpg",
    demoResultImage: "/images/demo-results/soft-layers.jpg",
    aiInstruction:
      "Transform the hair into 20-inch layered cut with face-framing layers and natural-looking volume. The layers should be soft and blended for a lived-in feel.",
    stylistRecommendation:
      "Soft layers add dimension and movement without overwhelming your features. A versatile choice that works for most face shapes.",
    productId: "product-soft-layers",
  },
  {
    id: "modern-bob",
    name: "Modern Bob",
    category: "Short · Straight",
    length: '12"',
    description: "A clean, contemporary bob with effortless shape.",
    previewImage: "/images/looks/modern-bob.jpg",
    demoResultImage: "/images/demo-results/modern-bob.jpg",
    aiInstruction:
      "Transform the hair into a clean 12-inch contemporary bob with a blunt or slightly angled cut. The bob should have effortless shape and a modern, polished finish.",
    stylistRecommendation:
      "The modern bob is bold yet refined. It draws attention to your jawline and neck, creating a striking, confident silhouette.",
    productId: "product-modern-bob",
  },
  {
    id: "defined-curls",
    name: "Defined Curls",
    category: "Long · Curly",
    length: '20"',
    description: "Full, defined curls with soft natural volume.",
    previewImage: "/images/looks/defined-curls.jpg",
    demoResultImage: "/images/demo-results/defined-curls.jpg",
    aiInstruction:
      "Transform the hair into long 20-inch defined curls with soft natural volume. The curls should be bouncy, well-formed, and have realistic texture and shine.",
    stylistRecommendation:
      "Defined curls bring warmth and personality to your look. This style celebrates natural texture with premium definition and bounce.",
    productId: "product-defined-curls",
  },
  {
    id: "rich-brunette",
    name: "Rich Brunette",
    category: "Color",
    length: '22"',
    description: "A dimensional espresso-brunette finish.",
    previewImage: "/images/looks/rich-brunette.jpg",
    demoResultImage: "/images/demo-results/rich-brunette.jpg",
    aiInstruction:
      "Transform the hair color to a rich dimensional espresso-brunette with subtle highlights and lowlights. Maintain the existing hairstyle but enhance with a luxurious multi-tonal brunette finish.",
    stylistRecommendation:
      "Rich brunette adds depth and dimension to any style. The espresso tones create a warm, sophisticated look that complements most skin tones.",
    productId: "product-rich-brunette",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "product-signature-waves",
    name: "LustraHair Signature Waves",
    description: "Premium Human Hair Collection",
    price: 12999,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/signature-waves.jpg",
    lookId: "signature-waves",
  },
  {
    id: "product-silk-straight",
    name: "LustraHair Silk Straight",
    description: "Premium Human Hair Collection",
    price: 13999,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/silk-straight.jpg",
    lookId: "silk-straight",
  },
  {
    id: "product-soft-layers",
    name: "LustraHair Soft Layers",
    description: "Premium Human Hair Collection",
    price: 11999,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/soft-layers.jpg",
    lookId: "soft-layers",
  },
  {
    id: "product-modern-bob",
    name: "LustraHair Modern Bob",
    description: "Premium Human Hair Collection",
    price: 9999,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/modern-bob.jpg",
    lookId: "modern-bob",
  },
  {
    id: "product-defined-curls",
    name: "LustraHair Defined Curls",
    description: "Premium Human Hair Collection",
    price: 13499,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/defined-curls.jpg",
    lookId: "defined-curls",
  },
  {
    id: "product-rich-brunette",
    name: "LustraHair Rich Brunette",
    description: "Premium Human Hair Collection",
    price: 12499,
    currency: "₹",
    shades: ["Natural Black", "Espresso", "Chestnut", "Honey Blonde"],
    image: "/images/products/rich-brunette.jpg",
    lookId: "rich-brunette",
  },
];

export function getLookById(id: string): Look | undefined {
  return LOOKS.find((look) => look.id === id);
}

export function getProductByLookId(lookId: string): Product | undefined {
  return PRODUCTS.find((product) => product.lookId === lookId);
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
