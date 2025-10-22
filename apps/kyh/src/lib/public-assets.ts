const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const getPublicAssetUrl = (path: string) => {
  return `${supabaseUrl}/storage/v1/object/public/projects/${path}`;
};
