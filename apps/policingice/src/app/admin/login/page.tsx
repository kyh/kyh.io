"use client";

import { useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import { OTPInput } from "@/components/otp-input";
import { authClient } from "@/lib/auth-client";
import { formString } from "@/lib/form-utils";

const CODE_LENGTH = 6;

const CODE_REFUSALS = {
  INVALID_OTP: "That code didn't work. Check it, or send a new one.",
  OTP_EXPIRED: "That code has expired. Send a new one.",
  TOO_MANY_ATTEMPTS: "Too many tries. Send a new code.",
};

const isRefusalCode = (code: string | undefined): code is keyof typeof CODE_REFUSALS =>
  code !== undefined && Object.hasOwn(CODE_REFUSALS, code);

const refusalOf = (error: { code?: string; message?: string }, fallback: string) =>
  isRefusalCode(error.code) ? CODE_REFUSALS[error.code] : (error.message ?? fallback);

const linkButton =
  "cursor-pointer text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

const sendCode = async (email: string) => {
  try {
    const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });

    return result.error ? refusalOf(result.error, "The code couldn't be sent.") : null;
  } catch {
    return "The code couldn't be sent.";
  }
};

const EmailStep = ({ onSent }: { onSent: (email: string) => void }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);

  return (
    <Form
      errors={errors}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const email = formString(new FormData(e.currentTarget), "email");

        void (async () => {
          setErrors({});
          setIsSending(true);
          const refusal = await sendCode(email);
          setIsSending(false);

          if (refusal === null) {
            onSent(email);
          } else {
            setErrors({ form: refusal });
          }
        })();
      }}
    >
      <Field.Root name="email">
        <Field.Control
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
        />
        <Field.Error className="mt-1 text-sm text-destructive" />
      </Field.Root>

      {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

      <button
        type="submit"
        disabled={isSending}
        className="w-full cursor-pointer py-2 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? "Sending a code..." : "Email me a code"}
      </button>
    </Form>
  );
};

const CodeStep = ({ email, onBack }: { email: string; onBack: () => void }) => {
  const router = useRouter();
  const [refusal, setRefusal] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        We sent a {CODE_LENGTH}-digit code to <span className="text-foreground">{email}</span>.
      </p>

      <label htmlFor="code" className="sr-only">
        Sign-in code
      </label>
      <OTPInput
        id="code"
        name="code"
        length={CODE_LENGTH}
        group
        autoFocus
        verify={async (otp) => {
          setRefusal(null);
          setResent(false);

          try {
            const result = await authClient.signIn.emailOtp({ email, otp });

            if (result.error) {
              setRefusal(refusalOf(result.error, "Sign-in failed."));

              return false;
            }

            return true;
          } catch {
            setRefusal("Sign-in failed.");

            return false;
          }
        }}
        onSuccess={() => {
          router.push("/admin");
        }}
      />

      {refusal !== null && <p className="text-sm text-destructive">{refusal}</p>}
      {resent && <output className="block text-sm text-muted-foreground">Sent a new code.</output>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className={linkButton}>
          Use a different email
        </button>
        <button
          type="button"
          disabled={isResending}
          className={linkButton}
          onClick={() => {
            void (async () => {
              setRefusal(null);
              setResent(false);
              setIsResending(true);
              const failed = await sendCode(email);
              setIsResending(false);

              if (failed === null) {
                setResent(true);
              } else {
                setRefusal(failed);
              }
            })();
          }}
        >
          {isResending ? "Sending..." : "Send a new code"}
        </button>
      </div>
    </div>
  );
};

const AdminLogin = () => {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-base font-normal">Admin Login</h1>

        {email === null ? (
          <EmailStep onSent={setEmail} />
        ) : (
          <CodeStep
            email={email}
            onBack={() => {
              setEmail(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
