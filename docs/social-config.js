// Optional Axiovo hosted account backend.
// To enable native researcher sign-in, comments and votes:
// 1. Create a Supabase project and run supabase/schema.sql.
// 2. Set up the GitHub OAuth provider and allow your GitHub Pages URL as redirect.
// 3. Fill in the PUBLIC project URL and PUBLISHABLE/ANON key here.
// NEVER put a Supabase service_role or secret API key in public HTML.
// With empty values the site retains the functional GitHub Issues discussion mode.
window.AxiovoSocialConfig = Object.freeze({
  url: "",
  anonKey: ""
});
