import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import authBackground from "@/assets/auth-background.jpg";

interface AuthProps {
  isSignUp?: boolean;
}

const Auth = ({ isSignUp = false }: AuthProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(!isSignUp);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    schoolType: "",
  });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "password">("email");
  const [resetData, setResetData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });
  const [isResetting, setIsResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!resetData.email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: resetData.email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;
      toast.success("OTP has been sent to your email!");
      setOtpSent(true);
      setResetStep("otp");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!resetData.otp) {
      toast.error("Please enter the OTP code");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetData.email,
        token: resetData.otp,
        type: "email",
      });

      if (error) throw error;
      toast.success("OTP verified! Now set your new password.");
      setResetStep("password");
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP code");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!resetData.newPassword || !resetData.confirmPassword) {
      toast.error("Please enter both password fields");
      return;
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (resetData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: resetData.newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setShowResetDialog(false);
      setResetStep("email");
      setOtpSent(false);
      setResetData({ email: "", newPassword: "", confirmPassword: "", otp: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        
        // Check user role from database
        const { data: { user } } = await supabase.auth.getUser();
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (roleData) {
          navigate("/role-selection");
        } else {
          navigate("/dashboard");
        }
        toast.success("Welcome back! ");
      } else {
        if (!formData.password || !formData.confirmPassword) {
          throw new Error("Please enter and confirm your password.");
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const { error: createError } = await supabase.functions.invoke("auth-signup", {
          body: {
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            schoolName: formData.schoolName,
            schoolType: formData.schoolType,
          },
        });

        if (createError) throw createError;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;

        // Check user role from database (only proceed if we have a session)
        const { data: { user } } = await supabase.auth.getUser();
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleData) {
          navigate("/role-selection");
        } else {
          navigate("/dashboard");
        }
        toast.success("Registration successful! Welcome aboard! 🎉");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Header />
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm"></div>
      <Card className="w-full max-w-md p-8 shadow-2xl animate-scale-in relative z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md mt-20">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ElimuTime</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {isLogin ? "Welcome back!" : "Enroll your school to ElimuTime"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-900 dark:text-white">Contact Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-gray-900 dark:text-white">School Name *</Label>
                <Input
                  id="schoolName"
                  type="text"
                  placeholder="Springfield High School"
                  value={formData.schoolName}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolName: e.target.value })
                  }
                  required={!isLogin}
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolType" className="text-gray-900 dark:text-white">School Type *</Label>
                <select
                  id="schoolType"
                  value={formData.schoolType}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolType: e.target.value })
                  }
                  required={!isLogin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="" disabled>Select school type</option>
                  <option value="primary">Primary</option>
                  <option value="highschool">High School/Secondary</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="training">Training Institute</option>
                  <option value="international">International School</option>
                </select>
              </div>
            </>
          )}

        <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-900 dark:text-white">School Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@school.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="transition-all focus:ring-2 focus:ring-primary"
            />
          </div>

          {isLogin && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 dark:text-white">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="transition-all focus:ring-2 focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-900 dark:text-white">Password *</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!isLogin}
                    className="transition-all focus:ring-2 focus:ring-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password" className="text-gray-900 dark:text-white">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="signup-confirm-password"
                    type={showSignUpConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    required={!isLogin}
                    className="transition-all focus:ring-2 focus:ring-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="font-semibold w-full gradient-primary text-white hover:opacity-90 transition-all rounded-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Enroll"
            )}
          </Button>

          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setResetData({ ...resetData, email: formData.email });
                setShowResetDialog(true);
              }}
              className="w-full text-sm text-primary hover:underline transition-all mt-2"
            >
              Forgot Password?
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData((current) => ({
                ...current,
                password: "",
                confirmPassword: "",
              }));
            }}
            className="text-sm text-primary hover:underline transition-all"
          >
            {isLogin
              ? "Don't have an account? Enroll"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={(open) => {
        setShowResetDialog(open);
        if (!open) {
          setResetStep("email");
          setOtpSent(false);
          setResetData({ email: "", newPassword: "", confirmPassword: "", otp: "" });
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {resetStep === "email" && "Enter your email address to receive an OTP"}
              {resetStep === "otp" && "Check your email and enter the OTP code sent by Supabase"}
              {resetStep === "password" && "Create your new password"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {resetStep === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-900 dark:text-white">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@school.com"
                    value={resetData.email}
                    onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                    disabled={otpSent}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={isResetting}
                  className="w-full"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP Code"
                  )}
                </Button>
              </>
            )}

            {resetStep === "otp" && (
              <>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    ✉️ OTP has been sent to <strong>{resetData.email}</strong>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-gray-900 dark:text-white">Enter OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={resetData.otp}
                    onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isResetting}
                  className="w-full"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </>
            )}

            {resetStep === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-900 dark:text-white">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-900 dark:text-white">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleUpdatePassword}
                  disabled={isResetting}
                  className="w-full"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
