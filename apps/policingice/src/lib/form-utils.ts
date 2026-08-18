// FormData.get returns string | File | null; our forms only carry text fields,
// so files and missing fields both decode to the empty string.
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return value === null || value instanceof File ? "" : value;
}
