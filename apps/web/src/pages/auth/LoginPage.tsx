import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GoogleIcon, AppleIcon } from "@/components/icons/BrandIcons";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

function notAvailable(provider: string) {
  toast.info(`${provider} sign-in isn't available yet.`);
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await login(values.email, values.password);
      navigate("/events");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[32px] font-bold text-slate-950">Welcome back</h1>
        <p className="text-[15px] text-slate-600">Sign in to your account to continue managing your venues</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6">
        <Field label="Email Address" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" className="h-12" {...register("email")} error={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-12 pr-16"
              {...register("password")}
              error={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toast.info("Password reset isn't available yet — please contact support.")}
            className="text-[13px] font-semibold text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="lg" className="h-[50px] w-full text-[15px]" isLoading={isSubmitting}>
          Sign In
        </Button>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => notAvailable("Google")}
              className="flex h-12 flex-1 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-950 hover:bg-slate-50"
            >
              <GoogleIcon className="h-[18px] w-[18px]" />
              Google
            </button>
            <button
              type="button"
              onClick={() => notAvailable("Apple")}
              className="flex h-12 flex-1 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-950 hover:bg-slate-50"
            >
              <AppleIcon className="h-[18px] w-[18px]" />
              Apple
            </button>
          </div>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&rsquo;t have an account?{" "}
        <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
