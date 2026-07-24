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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await registerUser(values.name, values.email, values.password);
      toast.success("Welcome! Your account has been created.");
      navigate("/events");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[32px] font-bold text-slate-950">Create your planner account</h1>
        <p className="text-[15px] text-slate-600">Start planning your next event in minutes</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6">
        <Field label="Full Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" className="h-12" {...register("name")} error={!!errors.name} />
        </Field>
        <Field label="Email Address" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" className="h-12" {...register("email")} error={!!errors.email} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number"
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <Button type="submit" size="lg" className="h-[50px] w-full text-[15px]" isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
