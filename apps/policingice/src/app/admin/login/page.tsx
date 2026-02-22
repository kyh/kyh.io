"use client";

import { useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

const AdminLogin = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-base font-normal">Admin Login</h1>

        <Form
          errors={errors}
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErrors({});
            setIsLoading(true);

            const formData = new FormData(e.currentTarget);
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;

            try {
              const result = await authClient.signIn.email({ email, password });
              if (result.error) {
                setErrors({ form: result.error.message ?? "Login failed" });
              } else {
                router.push("/admin");
              }
            } catch {
              setErrors({ form: "Login failed" });
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <Field.Root name="email">
            <Field.Control
              type="email"
              placeholder="Email"
              required
              className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
            />
            <Field.Error className="mt-1 text-sm text-red-600" />
          </Field.Root>

          <Field.Root name="password">
            <Field.Control
              type="password"
              placeholder="Password"
              required
              className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
            />
            <Field.Error className="mt-1 text-sm text-red-600" />
          </Field.Root>

          {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer py-2 text-sm text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </Form>
      </div>
    </div>
  );
};

export default AdminLogin;
