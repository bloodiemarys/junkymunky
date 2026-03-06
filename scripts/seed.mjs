import { createClient } from "@supabase/supabase-js";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const SUPABASE_URL = must("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = must("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser({ email, password, full_name }) {
  // Try create; if exists, fetch by email.
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (created.data?.user) return created.data.user;

  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.data?.users?.find((u) => u.email === email);
  if (!existing) throw new Error(`Failed to create/find user: ${email}`);
  return existing;
}

async function setRole(userId, role) {
  const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

async function main() {
  const admin = await ensureUser({
    email: "admin@junkymunky.local",
    password: "Password123!",
    full_name: "Admin",
  });
  const poster = await ensureUser({
    email: "poster@junkymunky.local",
    password: "Password123!",
    full_name: "Poster",
  });
  const remover = await ensureUser({
    email: "remover@junkymunky.local",
    password: "Password123!",
    full_name: "Remover",
  });

  await setRole(admin.id, "admin");
  await setRole(poster.id, "poster");
  await setRole(remover.id, "remover");

  await supabase.from("remover_profiles").upsert({
    remover_id: remover.id,
    company_name: "Junky Munky Hauling",
    service_radius_miles: 25,
    vehicle_type: "Pickup truck",
    bio: "Fast, friendly, and careful pickups.",
  });

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      poster_id: poster.id,
      title: "Old couch + broken chair",
      description: "One couch and one chair on the driveway. Easy access.",
      category: "Furniture",
      size: "medium",
      reusable_ok: true,
      policy_accepted_at: new Date().toISOString(),
      address_line1: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    })
    .select("id")
    .single();
  if (jobErr) throw jobErr;

  const { error: bidErr } = await supabase.from("bids").insert({
    job_id: job.id,
    remover_id: remover.id,
    amount_cents: 14900,
    message: "Can pick up today. I can keep reusables if allowed.",
    eta_timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    can_keep_reusables_ack: true,
  });
  if (bidErr) throw bidErr;

  console.log("Seed complete.");
  console.log("Admin:", admin.email, "Password123!");
  console.log("Poster:", poster.email, "Password123!");
  console.log("Remover:", remover.email, "Password123!");
  console.log("Sample job id:", job.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

