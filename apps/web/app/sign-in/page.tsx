import SignInForm from "@/components/ui/sign-in-form";
import { Link } from "@/lib/navigation";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your Shoplift account</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
