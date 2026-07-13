import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import authBackground from "@/assets/auth-background.jpg";
import logo from "@/assets/logoblack.png";

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
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [showPoliciesDialog, setShowPoliciesDialog] = useState(false);

  const isInvalidRefreshTokenError = (error: unknown) => {
    const message = String((error as any)?.message || "");
    return message.toLowerCase().includes("invalid refresh token");
  };

  const signInWithPasswordRecovering = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;

    if (isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut();
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (retry.error) throw retry.error;
      return;
    }

    throw error;
  };

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

    try {
      if (isLogin) {
        setLoading(true);
        await signInWithPasswordRecovering(formData.email, formData.password);
        
        // Check user role from database
        const { data: { user } } = await supabase.auth.getUser();
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (formData.email === "leemwangi250@gmail.com") {
          navigate("/admin");
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

        if (!hasAcceptedPolicies) {
          throw new Error("Please accept the Terms and Conditions and Privacy Policy before enrolling.");
        }

        setLoading(true);

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

        await signInWithPasswordRecovering(formData.email, formData.password);

        // Check user role from database (only proceed if we have a session)
        const { data: { user } } = await supabase.auth.getUser();
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (formData.email === "leemwangi250@gmail.com") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      let message = "An error occurred";
      
      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json();
          message = body.error || body.message || message;
        } catch (e) {
          message = error.message || message;
        }
      } else {
        message = error.message || message;
      }

      toast.error(message);
      console.error("Full Auth Error:", error);
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
          <img src={logo} alt="ElimuTime logo" className="mb-2 h-56 w-auto object-contain" />

          <p className="mt-1 text-gray-600 dark:text-gray-300">
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

          {!isLogin && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-policies"
                  checked={hasAcceptedPolicies}
                  onCheckedChange={(checked) => setHasAcceptedPolicies(checked === true)}
                  className="mt-0.5 h-5 w-5 rounded-full data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="accept-policies"
                    className="text-sm font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    I have read and agree to the Terms and Conditions and Privacy Policy.
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPoliciesDialog(true)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Read Terms and Privacy Policy
                  </button>
                </div>
              </div>
            </div>
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
              setHasAcceptedPolicies(false);
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

      <Dialog open={showPoliciesDialog} onOpenChange={setShowPoliciesDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Terms and Conditions & Privacy Policy
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Please review these policies before enrolling your school on ElimuTime.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Terms and Conditions</h3>
              <p><strong>Effective Date:</strong> 24/04/2026</p>
              <p><strong>Company:</strong> NotifyAI</p>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</p>
                <p>By accessing or using Elimutime (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Platform.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">2. Description of Service</p>
                <p>Elimutime provides AI-powered timetable generation tools for educational institutions. While we aim for accuracy and optimization, we do not guarantee that generated timetables are error-free or suitable for all institutional needs.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">3. Eligibility</p>
                <p>You must be at least 18 years old or using the Platform under the supervision of a school or legal guardian.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">4. User Responsibilities</p>
                <p>You agree to:</p>
                <p>Provide accurate and complete data (teachers, subjects, availability)</p>
                <p>Review all generated timetables before implementation</p>
                <p>Use the Platform in compliance with applicable laws</p>
                <p className="mt-2">You agree NOT to:</p>
                <p>Misuse the system or attempt unauthorized access</p>
                <p>Reverse-engineer or exploit the AI models</p>
                <p>Upload harmful or unlawful content</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">5. AI Disclaimer</p>
                <p>The Platform uses artificial intelligence to generate schedules.</p>
                <p>We do not guarantee:</p>
                <p>Conflict-free outputs in all cases</p>
                <p>Compliance with all institutional policies</p>
                <p>Suitability for high-stakes decision-making without human review</p>
                <p className="mt-2">You are responsible for validating all outputs.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">6. Subscription & Payments</p>
                <p>Certain features (e.g., exports, large timetable generation) require a paid subscription</p>
                <p>Payments are non-refundable unless stated otherwise</p>
                <p>We reserve the right to change pricing with notice</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">7. Intellectual Property</p>
                <p>All Platform content, design, and technology remain the property of Elimu Digital. You retain ownership of your uploaded data.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">8. Data Usage</p>
                <p>By using Elimutime, you grant us the right to process your data to deliver services and improve system performance and AI models in anonymized form.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">9. Limitation of Liability</p>
                <p>To the fullest extent permitted by law:</p>
                <p>We are not liable for timetable conflicts, losses, or disruptions</p>
                <p>We are not responsible for decisions made based on Platform output</p>
                <p>Our total liability shall not exceed the amount paid by you in the last 3 months</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">10. Indemnification</p>
                <p>You agree to indemnify and hold harmless Elimu Digital from any claims arising from your use of Elimutime, your data inputs, or your violation of these Terms.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">11. Termination</p>
                <p>We may suspend or terminate access if you violate these Terms, misuse the Platform, or where required by law.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">12. Changes to Terms</p>
                <p>We may update these Terms at any time. Continued use means acceptance.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">13. Governing Law</p>
                <p>These Terms are governed by the laws of Kenya.</p>
              </div>
            </section>

            <section className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Privacy Policy</h3>
              <p><strong>Effective Date:</strong> 24/04/2026</p>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">1. Introduction</p>
                <p>Elimutime respects your privacy and is committed to protecting your personal data in compliance with the Kenyan Data Protection Act, 2019.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">2. Data We Collect</p>
                <p className="font-medium text-gray-900 dark:text-white">a) Information You Provide</p>
                <p>School details (name, structure)</p>
                <p>Teacher names and schedules</p>
                <p>User account details (email, login info)</p>
                <p className="mt-2 font-medium text-gray-900 dark:text-white">b) Automatically Collected Data</p>
                <p>Device and browser information</p>
                <p>Usage analytics</p>
                <p>IP address</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">3. How We Use Your Data</p>
                <p>We use your data to generate timetables, provide and improve services, manage subscriptions, and ensure security and prevent fraud.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">4. Legal Basis for Processing</p>
                <p>We process your data based on consent, contractual necessity, and legal obligations.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">5. Data Sharing</p>
                <p>We do NOT sell your data.</p>
                <p>We may share data with service providers such as Supabase for backend services, payment processors, and legal authorities when required.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">6. Data Retention</p>
                <p>We retain your data only as long as necessary to provide services and meet legal obligations. You may request deletion at any time.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">7. Data Security</p>
                <p>We implement encryption, secure authentication, and access controls. However, no system is 100% secure.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">8. Your Rights</p>
                <p>Under Kenyan law, you have the right to access your data, correct inaccuracies, request deletion, and object to processing.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">9. Cookies & Tracking</p>
                <p>We use cookies to improve user experience and analyze usage patterns. You can disable cookies in your browser.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">10. Third-Party Services</p>
                <p>We may use third-party tools such as Supabase and analytics providers. We are not responsible for their independent privacy practices.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">11. Children&rsquo;s Privacy</p>
                <p>We do not knowingly collect data from children under 13 without proper authorization.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">12. Changes to Privacy Policy</p>
                <p>We may update this policy. Continued use indicates acceptance.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">13. Contact</p>
                <p>For privacy-related requests: notifytechgroup@gmail.com</p>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
