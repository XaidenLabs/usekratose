import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page auth-page-centered">
      <div className="auth-main">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
