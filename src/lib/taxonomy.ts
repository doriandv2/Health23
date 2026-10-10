/** Navigation groupings carried over from the original site. */
export const GOALS = ["Detox", "Energy & Exercise", "Keto", "Kids", "Sleep", "Vegan", "Weight Management"];
export const FUNCTIONS = ["Brain", "Digestion", "Heart", "Joints", "Liver", "Thyroid", "Dental"];

export function tagSlug(tag: string) {
  return tag.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-");
}
