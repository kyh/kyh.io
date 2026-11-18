export const formString = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return value === null || value instanceof File ? "" : value;
};
