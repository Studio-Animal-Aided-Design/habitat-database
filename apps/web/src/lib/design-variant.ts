// Next config fixes this public, non-secret constant alongside the selected stylesheet.
// A running production image cannot change markup independently of its built CSS.
export const designVariant = process.env.NEXT_PUBLIC_APP_DESIGN === "classic" ? "classic" : "studio";
export const isStudioDesign = designVariant === "studio";
