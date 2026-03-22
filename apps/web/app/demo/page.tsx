"use client";

import SignInForm from "@/components/ui/sign-in-form";
import SignUpForm from "@/components/ui/sign-up-form";
import { useState } from "react";

export default function DemoPage() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shoplift Demo</h1>
          <p className="text-gray-600 mt-2">
            {showSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>
        {showSignUp ? <SignUpForm /> : <SignInForm />}
        <div className="text-center mt-4">
          <button
            onClick={() => setShowSignUp(!showSignUp)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
