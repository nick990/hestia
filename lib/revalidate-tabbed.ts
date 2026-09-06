import { revalidatePath } from "next/cache";

export function revalidateTabbedSections() {
  revalidatePath("/cashflow");
  revalidatePath("/cashflow/avanzato");
  revalidatePath("/notes");
  revalidatePath("/evidenza");
  revalidatePath("/saldi");
}
