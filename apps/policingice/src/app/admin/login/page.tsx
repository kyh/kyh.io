"use client";

import { leading } from "@repo/tailwind-compat/leading.stylex";
import { theme } from "../../styles/tokens.stylex";

import { containers, fontSizes, fontWeights, spacing } from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { formString } from "@/lib/form-utils";

const styles = stylex.create({
  page: {
    display: "flex",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.background,
    paddingInline: spacing[4],
  },
  wrap: { width: "100%", maxWidth: containers.sm },
  heading: {
    marginBottom: spacing[8],
    fontSize: fontSizes.base,
    lineHeight: leading.base,
    fontWeight: fontWeights.normal,
  },
  /** was `space-y-4`: a margin on every child but the last */
  stacked: { marginBottom: spacing[4] },
  control: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: { default: theme.input, ":focus": theme.foreground },
    backgroundColor: "transparent",
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  fieldError: {
    marginTop: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.destructive,
  },
  formError: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.destructive,
  },
  submit: {
    width: "100%",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    opacity: { default: null, ":disabled": 0.5 },
  },
});

const AdminLogin = () => {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.wrap)}>
        <h1 {...stylex.props(styles.heading)}>Admin Login</h1>

        <Form
          errors={errors}
          onSubmit={async (e) => {
            e.preventDefault();
            setErrors({});
            setIsLoading(true);

            const formData = new FormData(e.currentTarget);
            const email = formString(formData, "email");
            const password = formString(formData, "password");

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
          <Field.Root name="email" {...stylex.props(styles.stacked)}>
            <Field.Control
              type="email"
              placeholder="Email"
              required
              {...stylex.props(styles.control)}
            />
            <Field.Error {...stylex.props(styles.fieldError)} />
          </Field.Root>

          <Field.Root name="password" {...stylex.props(styles.stacked)}>
            <Field.Control
              type="password"
              placeholder="Password"
              required
              {...stylex.props(styles.control)}
            />
            <Field.Error {...stylex.props(styles.fieldError)} />
          </Field.Root>

          {errors.form && <p {...stylex.props(styles.formError, styles.stacked)}>{errors.form}</p>}

          <button type="submit" disabled={isLoading} {...stylex.props(styles.submit)}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </Form>
      </div>
    </div>
  );
};

export default AdminLogin;
