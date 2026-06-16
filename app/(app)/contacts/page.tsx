import { createClient } from "@/lib/supabase/server";
import { ContactsView } from "@/components/contacts/contacts-view";
import type { Contact, ProfileOption } from "@/lib/types";

export const metadata = { title: "Contacts · StrategistHub CRM" };

export default async function ContactsPage() {
  const supabase = await createClient();

  // Contacts with their owner's name embedded via the owner_id FK.
  const [{ data: contacts }, { data: profiles }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, owner:owner_id(full_name, email)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <ContactsView
      contacts={(contacts as Contact[]) ?? []}
      owners={(profiles as ProfileOption[]) ?? []}
    />
  );
}
