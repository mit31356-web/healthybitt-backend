import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  TrendingUp,
  Settings,
  Plus,
  Camera,
  CameraOff,
  Image,
  ChevronRight,
  Trash2,
  LogOut,
  User,
  Sparkles,
  ChevronLeft,
  Apple,
  Lock,
  AlertCircle,
  X,
  Send,
  Flame,
  Handshake,
  Check,
  Volume2,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useUser, useAuth, useSession, useSignIn, useSignUp } from '@clerk/clerk-react';
import {
  analyzeFoodText,
  analyzeFoodImage,
  analyzeLiveFoodFrame
} from './gemini';
import type { FoodAnalysisResult } from './gemini';

function clerkIdToUuid(clerkId: string): string {
  if (!clerkId) return '';
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x1337c0de;
  for (let i = 0; i < clerkId.length; i++) {
    const c = clerkId.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
    h3 = Math.imul(h3 ^ c, 3812030807);
    h4 = Math.imul(h4 ^ c, 2182413521);
  }
  const hex = (val: number) => (val >>> 0).toString(16).padStart(8, '0');
  const part1 = hex(h1);
  const part2 = hex(h2);
  const part3 = hex(h3);
  const part4 = hex(h4);
  
  const s1 = part1;
  const s2 = part2.substring(0, 4);
  const s3 = '4' + part2.substring(4, 7);
  const s4 = 'a' + part3.substring(0, 3);
  const s5 = part3.substring(3, 8) + part4.substring(0, 7);
  return `${s1}-${s2}-${s3}-${s4}-${s5}`;
}


const GoogleIcon = ({ size = 20, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg style={{ width: `${size}px`, height: `${size}px`, ...style }} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Define Interface Types
interface Profile {
  id?: string;
  email: string;
  name: string;
  daily_calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fats_goal_g: number;
  weight_kg: number;
  height_cm: number;
  target_weight_kg: number;
  activity_level: string;
  goal_type: string;
  avatar_url?: string;
  phone?: string;
  is_premium?: boolean;
  scans_used?: number;
  premium_until?: string | null;
  current_session_id?: string | null;
}

interface FoodLog {
  id?: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  image_url?: string | null;
  ingredients?: any[];
  health_score?: number;
  logged_at: string; // ISO String
}

interface WeightLog {
  id?: string;
  weight_kg: number;
  logged_at: string; // YYYY-MM-DD
}



const HealthyBitLogo = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
      <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.25" />
      </filter>
    </defs>
    <path
      d="M50 85C32 85 20 70 20 50C20 32 32 20 50 20C68 20 80 32 80 50C80 70 68 85 50 85Z"
      stroke="url(#logoGrad)"
      strokeWidth="8"
      strokeLinecap="round"
      filter="url(#logoShadow)"
    />
    <path
      d="M50 12C50 12 55 25 68 25C80 25 80 35 80 35C80 35 65 35 50 28C35 35 20 35 20 35C20 35 20 25 32 25C45 25 50 12 50 12Z"
      fill="url(#logoGrad)"
    />
    <circle cx="50" cy="50" r="12" fill="url(#logoGrad)" />
  </svg>
);

const ftOptions = [3, 4, 5, 6, 7];
const inOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const cmOptions = Array.from({ length: 101 }, (_, i) => 120 + i);
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => 2026 - i);


export default function App() {
  const { isLoaded: isUserLoaded, isSignedIn, user: clerkUser } = useUser();
  const { session } = useSession();
  const { signOut } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'home' | 'progress' | 'diet' | 'settings'>('home');
  const [aiVoiceLanguage, setAiVoiceLanguage] = useState<'en' | 'hi'>(() => {
    return (localStorage.getItem('hb_ai_voice_lang') as 'en' | 'hi') || 'en';
  });
  const handleVoiceLangChange = (lang: 'en' | 'hi') => {
    setAiVoiceLanguage(lang);
    localStorage.setItem('hb_ai_voice_lang', lang);
  };
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showTextDescriber, setShowTextDescriber] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Onboarding States
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [onboardingSex, setOnboardingSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [onboardingWorkouts, setOnboardingWorkouts] = useState<'0-2' | '3-5' | '6+' | null>(null);
  const onboardingAccomplish: string[] = [];
  const onboardingExperience = 'no';
  const [onboardingGoal, setOnboardingGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [birthMonth, setBirthMonth] = useState<string>('January');
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(2001);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft');
  const [heightCm, setHeightCm] = useState<number>(168);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(6);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('lbs');
  const [currentWeight, setCurrentWeight] = useState<number>(119);
  const [desiredWeight, setDesiredWeight] = useState<number | null>(null);
  const [goalSpeed, setGoalSpeed] = useState<'slow' | 'recommended' | 'fast' | null>(null);
  const [obstacles, setObstacles] = useState<string[]>([]);
  const addBurnedBack = true;
  const rolloverCals = true;
  const notificationConsent = false;

  // New Hold-to-Commit States
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [committed, setCommitted] = useState<boolean>(false);

  // UI helpers
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [showAllFoods, setShowAllFoods] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Live Food Scan states
  const [liveScanDetectedFood, setLiveScanDetectedFood] = useState<FoodAnalysisResult | null>(null);
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false);
  const [shakeDetectedVisual, setShakeDetectedVisual] = useState(false);
  const lastShakeTimeRef = useRef(0);
  const foodDetectedAtRef = useRef(0);
  const liveScanDetectedFoodRef = useRef<FoodAnalysisResult | null>(null);
  liveScanDetectedFoodRef.current = liveScanDetectedFood;
  if (liveScanDetectedFood && foodDetectedAtRef.current === 0) {
    foodDetectedAtRef.current = Date.now();
  } else if (!liveScanDetectedFood) {
    foodDetectedAtRef.current = 0;
  }
  const isAnalyzingFrameRef = useRef(false);
  isAnalyzingFrameRef.current = isAnalyzingFrame;
  const isSavingMealRef = useRef(false);
  isSavingMealRef.current = isSavingMeal;
  const showCameraScannerRef = useRef(false);
  showCameraScannerRef.current = showCameraScanner;
  const handleLiveScanRef = useRef<(isAuto?: boolean) => Promise<void>>(() => Promise.resolve());
  const handleSaveLiveScannedFoodRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const capturePhotoRef = useRef<() => void>(() => {});
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Wheel picker scroll refs
  const heightFtRef = useRef<HTMLDivElement>(null);
  const heightInRef = useRef<HTMLDivElement>(null);
  const heightCmRef = useRef<HTMLDivElement>(null);
  const birthMonthRef = useRef<HTMLDivElement>(null);
  const birthDayRef = useRef<HTMLDivElement>(null);
  const birthYearRef = useRef<HTMLDivElement>(null);

  // Programmatic scroll blocker refs
  const isProgrammaticHeight = useRef(false);
  const isProgrammaticBirthdate = useRef(false);

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [loadingType, setLoadingType] = useState<'email' | 'google' | null>(null);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingReset, setVerifyingReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0); // countdown seconds remaining

  // OTP timer countdown effect — starts at 60 when verifyingEmail becomes true
  useEffect(() => {
    if (verifyingEmail) {
      setOtpTimer(60);
    }
  }, [verifyingEmail]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setAuthError('');
    setVerificationCode('');
    setIsLoading(true);
    try {
      if (authMode === 'login') {
        if (!signIn) return;
        const { supportedFirstFactors } = await signIn.create({ identifier: email });
        const emailFactor = supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
        if (emailFactor) {
          await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
          setOtpTimer(60);
        }
      } else {
        if (!signUp) return;
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setOtpTimer(60);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to resend code.';
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authMode === 'login') {
      if (!isSignInLoaded || !signIn) return;
      try {
        setLoadingType('google');
        setIsLoading(true);
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.origin,
          redirectUrlComplete: window.location.origin
        });
      } catch (err: any) {
        console.error("Google login error:", err);
        setAuthError(err.errors?.[0]?.message || err.message || "Failed to sign in with Google.");
        setLoadingType(null);
        setIsLoading(false);
      }
    } else {
      if (!isSignUpLoaded || !signUp) return;
      try {
        setLoadingType('google');
        setIsLoading(true);
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: window.location.origin,
          redirectUrlComplete: window.location.origin
        });
      } catch (err: any) {
        console.error("Google signup error:", err);
        setAuthError(err.errors?.[0]?.message || err.message || "Failed to sign up with Google.");
        setLoadingType(null);
        setIsLoading(false);
      }
    }
  };

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playFeedback = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Audio context error or blocked autoplay
    }

    try {
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch (e) {
      // Haptics permission / support error
    }
  };

  const startHold = () => {
    if (!committed) {
      setIsHolding(true);
    }
  };

  const stopHold = () => {
    setIsHolding(false);
  };

  // Daily tracker date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datesList, setDatesList] = useState<Date[]>([]);

  // Configured Keys & Profiles
  const [profile, setProfile] = useState<Profile>({
    email: '',
    name: '',
    daily_calorie_goal: 2200,
    protein_goal_g: 130,
    carbs_goal_g: 220,
    fats_goal_g: 70,
    weight_kg: 75,
    height_cm: 175,
    target_weight_kg: 70,
    activity_level: 'moderate',
    goal_type: 'lose'
  });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Camera Permission State
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [cameraTrigger, setCameraTrigger] = useState(0);

  // Local draft states for settings to avoid getting stuck on numeric inputs
  const [settingsName, setSettingsName] = useState('');
  const [settingsHeight, setSettingsHeight] = useState('');
  const [settingsWeight, setSettingsWeight] = useState('');
  const [settingsCalorieGoal, setSettingsCalorieGoal] = useState('');
  const [settingsTargetWeight, setSettingsTargetWeight] = useState('');
  const [settingsGoalType, setSettingsGoalType] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [settingsActivityLevel, setSettingsActivityLevel] = useState<string>('moderate');
  const [settingsProteinGoal, setSettingsProteinGoal] = useState('');
  const [settingsCarbsGoal, setSettingsCarbsGoal] = useState('');
  const [settingsFatsGoal, setSettingsFatsGoal] = useState('');
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Settings Change Password States
  const [showSettingsChangePassword, setShowSettingsChangePassword] = useState(false);
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsNewPasswordConfirm, setSettingsNewPasswordConfirm] = useState('');
  const [settingsPasswordError, setSettingsPasswordError] = useState('');
  const [settingsPasswordSuccess, setSettingsPasswordSuccess] = useState(false);
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);

  // Sync settings inputs when the global profile loads/updates
  useEffect(() => {
    if (profile) {
      setSettingsName(profile.name || '');
      setSettingsHeight(profile.height_cm ? String(profile.height_cm) : '');
      setSettingsWeight(profile.weight_kg ? String(profile.weight_kg) : '');
      setSettingsCalorieGoal(profile.daily_calorie_goal ? String(profile.daily_calorie_goal) : '');
      setSettingsTargetWeight(profile.target_weight_kg ? String(profile.target_weight_kg) : '');
      setSettingsGoalType((profile.goal_type as 'lose' | 'maintain' | 'gain') || 'maintain');
      setSettingsActivityLevel(profile.activity_level || 'moderate');
      setSettingsProteinGoal(profile.protein_goal_g ? String(profile.protein_goal_g) : '130');
      setSettingsCarbsGoal(profile.carbs_goal_g ? String(profile.carbs_goal_g) : '220');
      setSettingsFatsGoal(profile.fats_goal_g ? String(profile.fats_goal_g) : '70');
    }
  }, [profile]);

  // Food / Weight logs state
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  // Input states for scanners
  const [inputText, setInputText] = useState('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScannedBase64, setLastScannedBase64] = useState<string | null>(null);

  // Breakdown Detail state
  const [currentAnalysis, setCurrentAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [breakdownQuantity, setBreakdownQuantity] = useState(1);

  // Paywall / Subscription States
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [paywallStep, setPaywallStep] = useState<'plans' | 'checkout' | 'success' | 'failure'>('plans');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentProgressStep, setPaymentProgressStep] = useState<string>('');
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

  // Weight Logging UI State
  const [weightInput, setWeightInput] = useState('');
  const [weightPeriod, setWeightPeriod] = useState<'90' | '180' | '365'>('90');

  // AI Chat Coach state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hello! I am your HealthyBit AI Nutrition Coach. Ask me anything about diet, weight loss, recipes, or training!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Camera capture hooks
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const checkAndShowRLSError = (error: any, contextMessage: string) => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('row-level security') || msg.includes('violates row-level security') || msg.includes('new row violates') || msg.includes('violates row level security')) {
      showToast(`⚠️ Database security block! Please run 'supabase/reset_database.sql' in your Supabase SQL Editor.`, 'error');
      return true;
    }
    showToast(`${contextMessage}: ${error.message}`, 'error');
    return true;
  };

  // Image compressor utility to speed up image analysis and saving
  const compressImage = (base64Str: string, maxWidth = 512, quality = 0.55): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // State to track calorie percentage animation on Progress tab
  const [animatedCalorieProgress, setAnimatedCalorieProgress] = useState(0);

  useEffect(() => {
    if (activeTab === 'progress') {
      setAnimatedCalorieProgress(0);
      const timer = setTimeout(() => {
        const consumed = foodLogs.filter(dateLogFilter).reduce((sum, item) => sum + item.calories, 0);
        const percent = Math.min(100, (consumed / (profile.daily_calorie_goal || 2200)) * 100);
        setAnimatedCalorieProgress(percent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, foodLogs, profile.daily_calorie_goal]);


  // Initialize Dates calendar bar (last 7 days)
  useEffect(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    setDatesList(dates);
  }, []);

  // Splash Timer Effect — always transition to Step 1 (Get Started) so user fills all options first
  useEffect(() => {
    if (onboardingStep === 0) {
      const timer = setTimeout(() => {
        setOnboardingStep(1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [onboardingStep]);

  // Sync onboarding steps with browser history for mobile hardware back button
  useEffect(() => {
    if (onboardingStep === -1) {
      // App is active — manage tab navigation with history
      const handleAppBack = () => {
        // If a modal is open, close it
        if (showBreakdown) { setShowBreakdown(false); return; }
        if (showAICoach) { setShowAICoach(false); return; }
        if (showAddMenu) { setShowAddMenu(false); return; }
        if (showCameraScanner) { stopCamera(); return; }
        if (showTextDescriber) { setShowTextDescriber(false); return; }
        // Otherwise navigate home
        if (activeTab !== 'home') {
          setActiveTab('home');
          window.history.pushState({ tab: 'home' }, 'Home');
        }
      };
      window.addEventListener('popstate', handleAppBack);
      // Push a state so there's something to pop back to
      if (!window.history.state?.tab) {
        window.history.pushState({ tab: activeTab }, activeTab);
      }
      return () => window.removeEventListener('popstate', handleAppBack);
    }

    // Onboarding flow back navigation
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state.step === 'number') {
        setOnboardingStep(event.state.step);
      }
    };
    window.addEventListener('popstate', handlePopState);
    const currentHistoryStep = window.history.state?.step;
    if (currentHistoryStep !== onboardingStep) {
      window.history.pushState({ step: onboardingStep }, `Step ${onboardingStep}`);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onboardingStep, activeTab, showBreakdown, showAICoach, showAddMenu, showCameraScanner, showTextDescriber]);

  // Listen to Clerk Auth State
  useEffect(() => {
    if (isUserLoaded) {
      if (isSignedIn && clerkUser) {
        const mappedId = clerkIdToUuid(clerkUser.id);
        const userEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
        const displayName = clerkUser.fullName || clerkUser.firstName || '';
        const googleAvatar = clerkUser.imageUrl || '';
        setUser({
          id: mappedId,
          email: userEmail,
          clerkId: clerkUser.id
        });
        setOnboardingStep(-1); // Jump straight to home on login
        fetchUserData(mappedId, userEmail, session?.id, displayName, googleAvatar);
      } else {
        setUser(null);
        setIsProfileLoaded(false);
        setOnboardingStep(0); // Always start at splash
      }
    }
  }, [isUserLoaded, isSignedIn, clerkUser, session?.id]);

  // Real-time subscription to detect active session changes
  useEffect(() => {
    if (!user?.id || !session?.id) return;

    const profileChannel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hb_profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newSessionId = payload.new?.current_session_id;
          if (newSessionId && session?.id && newSessionId !== session.id) {
            console.log("Session conflict detected via real-time update!");
            setSessionConflict(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id, session?.id]);

  // Poll session state every 5 seconds as a fallback
  useEffect(() => {
    if (!user?.id || !session?.id || sessionConflict) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('hb_profiles')
          .select('current_session_id')
          .eq('id', user.id)
          .maybeSingle();
        if (data && data.current_session_id && data.current_session_id !== session.id) {
          console.log("Session conflict detected via polling!");
          setSessionConflict(true);
        }
      } catch (err) {
        console.error("Error polling session status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, session?.id, sessionConflict]);

  // Synchronize logged-in user profile with localStorage cache
  useEffect(() => {
    if (user?.id && isProfileLoaded && profile && profile.email !== '' && profile.email !== 'guest@healthybit.app') {
      localStorage.setItem(`hb_user_profile_${user.id}`, JSON.stringify(profile));
    }
  }, [profile, user?.id, isProfileLoaded]);

  // Synchronize logged-in user food logs with localStorage cache
  useEffect(() => {
    if (user?.id && isProfileLoaded && foodLogs) {
      localStorage.setItem(`hb_user_foods_${user.id}`, JSON.stringify(foodLogs));
    }
  }, [foodLogs, user?.id, isProfileLoaded]);

  // Synchronize logged-in user weight logs with localStorage cache
  useEffect(() => {
    if (user?.id && isProfileLoaded && weightLogs) {
      localStorage.setItem(`hb_user_weights_${user.id}`, JSON.stringify(weightLogs));
    }
  }, [weightLogs, user?.id, isProfileLoaded]);

  // Cashfree Success Redirect Verification - Extract on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const planParam = params.get('plan') as 'monthly' | 'yearly' | null;

    if (orderId && planParam) {
      // Clear the query params from the URL immediately so they don't linger
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      
      // Store in localStorage as pending transaction
      localStorage.setItem('hb_pending_cashfree', JSON.stringify({
        orderId,
        plan: planParam,
        timestamp: Date.now()
      }));
    }
  }, []);

  // Process pending Cashfree transactions once user session is active
  useEffect(() => {
    const verifyTransaction = async () => {
      if (user && isProfileLoaded) {
        const pending = localStorage.getItem('hb_pending_cashfree');
        if (pending) {
          try {
            const { orderId, plan, timestamp } = JSON.parse(pending);
            // Only process if the transaction is fresh (e.g. less than 10 mins old)
            if (Date.now() - timestamp < 600000) {
              // Open the paywall drawer and display verification progress overlay
              setShowPaywall(true);
              setPaywallStep('checkout');
              setIsProcessingPayment(true);
              setPaymentProgressStep('Verifying your payment with Cashfree secure gateway...');

              // Call Supabase Edge Function to verify payment status
              const { data, error } = await supabase.functions.invoke('cashfree-payment', {
                body: {
                  action: 'check-status',
                  orderId
                }
              });

              if (error || !data || !data.success) {
                console.error("Payment status check failed:", error || data);
                const errMsg = data?.error || error?.message || 'Payment not completed or was cancelled.';
                setPaymentErrorMessage(errMsg);
                setPaywallStep('failure');
                setIsProcessingPayment(false);
                setPaymentProgressStep('');
              } else {
                if (data.paid) {
                  showToast("Payment Verified Successfully!", "success");
                  await activatePremiumLocally(orderId, data.paymentId, plan);
                } else {
                  console.warn("Payment status not success:", data.orderStatus);
                  const errMsg = `Transaction status is ${data.orderStatus || 'FAILED'}`;
                  
                  // Deactivate premium locally only if they don't have an active subscription in the future
                  const isAlreadyActive = profile.is_premium && 
                                          profile.premium_until && 
                                          (new Date(profile.premium_until) > new Date());
                  if (!isAlreadyActive) {
                    setProfile(prev => ({
                      ...prev,
                      is_premium: false,
                      premium_until: null
                    }));
                  }

                  // Re-fetch user profile to sync client state with the database
                  try {
                    await fetchUserData(user.id, user.email || '', session?.id);
                  } catch (syncErr) {
                    console.error("Failed to sync profile after failed payment:", syncErr);
                  }

                  setPaymentErrorMessage(errMsg);
                  setPaywallStep('failure');
                  setIsProcessingPayment(false);
                  setPaymentProgressStep('');
                }
              }
            }
            localStorage.removeItem('hb_pending_cashfree');
          } catch (e) {
            console.error("Error processing pending Cashfree payment:", e);
            localStorage.removeItem('hb_pending_cashfree');
            setIsProcessingPayment(false);
            setPaymentProgressStep('');
          }
        }
      }
    };

    verifyTransaction();
  }, [user, isProfileLoaded]);

  // Automatic cleanup of scanned photos older than 24 hours
  const cleanExpiredPhotos = async (fetchedLogs: FoodLog[], currentUserId?: string) => {
    const now = new Date();
    const limit = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Filter logs that are older than 24 hours and have an active image_url
    const expiredLogs = fetchedLogs.filter(log => {
      if (!log.image_url) return false;
      const loggedAt = new Date(log.logged_at);
      return loggedAt < limit;
    });

    if (expiredLogs.length === 0) return;

    // Immediately remove from local state
    const cleanedLogs = fetchedLogs.map(log => {
      if (log.image_url && new Date(log.logged_at) < limit) {
        return { ...log, image_url: null };
      }
      return log;
    });

    setFoodLogs(cleanedLogs);
    if (!currentUserId) {
      localStorage.setItem('hb_demo_foods', JSON.stringify(cleanedLogs));
    }

    if (currentUserId) {
      for (const log of expiredLogs) {
        if (!log.id) continue;
        try {
          // 1. Remove photo link in the database table hb_food_logs
          await supabase
            .from('hb_food_logs')
            .update({ image_url: null })
            .eq('id', log.id);

          // 2. If it is stored in Supabase storage bucket 'food-images', delete the file
          if (log.image_url && log.image_url.includes('/storage/v1/object/public/food-images/')) {
            const parts = log.image_url.split('/food-images/');
            if (parts.length > 1) {
              const filePath = parts[1];
              await supabase.storage
                .from('food-images')
                .remove([filePath]);
            }
          }
        } catch (dbErr) {
          console.error("Failed to clean up expired photo:", dbErr);
        }
      }
    }
  };

  // Fetch all user details from database or local fallback
  const fetchUserData = async (userId: string, userEmail: string, currentSessionId?: string, displayName?: string, avatarUrl?: string) => {
    setIsLoading(true);

    // 0. Load offline cached data first for instant UI response
    try {
      const cachedProfile = localStorage.getItem(`hb_user_profile_${userId}`);
      const cachedFoods = localStorage.getItem(`hb_user_foods_${userId}`);
      const cachedWeights = localStorage.getItem(`hb_user_weights_${userId}`);

      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setProfile(parsed);
        if (parsed.avatar_url) setAvatarUrl(parsed.avatar_url);
      }
      if (cachedFoods) {
        setFoodLogs(JSON.parse(cachedFoods));
      }
      if (cachedWeights) {
        setWeightLogs(JSON.parse(cachedWeights));
      }
    } catch (cacheErr) {
      console.warn("Failed to load offline cache:", cacheErr);
    }

    try {
      // 1. Fetch Profile by UUID using maybeSingle to avoid noisy errors
      const { data: profileData, error: profileErr } = await supabase
        .from('hb_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.error("Error fetching profile by UUID:", profileErr.message);
        checkAndShowRLSError(profileErr, "Error loading profile from database");
      }

      if (profileData) {
        let currentProfile = profileData;

        // Takeover vs Mismatch verification
        const lastSessionId = localStorage.getItem('hb_last_session_id');
        const isNewSession = currentSessionId && currentSessionId !== lastSessionId;

        if (isNewSession) {
          console.log("New session detected on this device. Overwriting current_session_id in database with:", currentSessionId);
          const { error: sessionErr } = await supabase
            .from('hb_profiles')
            .update({ current_session_id: currentSessionId })
            .eq('id', userId);
          if (sessionErr) {
            checkAndShowRLSError(sessionErr, "Failed to update current session");
          }
          currentProfile.current_session_id = currentSessionId;
          localStorage.setItem('hb_last_session_id', currentSessionId);
        } else {
          // Session conflict check for existing/restored session
          if (profileData.current_session_id && currentSessionId && profileData.current_session_id !== currentSessionId) {
            console.log("Session conflict detected on fetchUserData!");
            setSessionConflict(true);
            setIsLoading(false);
            setIsProfileLoaded(true);
            return; // Stop loading data for security
          }
        }

        // Check if premium subscription has expired
        if (profileData.is_premium && profileData.premium_until) {
          const expiry = new Date(profileData.premium_until);
          if (expiry < new Date()) {
            console.log('Premium subscription expired. Revoking premium access...');
            const { error: revokeErr } = await supabase
              .from('hb_profiles')
              .update({ is_premium: false, premium_until: null })
              .eq('id', userId);
            
            if (!revokeErr) {
              currentProfile = { ...profileData, is_premium: false, premium_until: null };
            } else {
              console.error('Failed to revoke expired premium in DB:', revokeErr);
              checkAndShowRLSError(revokeErr, "Failed to revoke premium status");
            }
          }
        }
        setProfile(currentProfile);
        if (currentProfile.avatar_url) setAvatarUrl(currentProfile.avatar_url);
      } else {
        // No profile found by UUID — check if this email already exists (e.g. Google + email linking)
        const { data: emailProfile, error: emailFetchErr } = await supabase
          .from('hb_profiles')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (emailFetchErr) {
          checkAndShowRLSError(emailFetchErr, "Failed to check existing profile by email");
        }

        if (emailProfile) {
          // Existing profile found via email (prior email/password signup) — migrate it to this UUID
          console.log('Migrating existing email profile to new auth UUID (account linking)...');
          const { error: migrateErr } = await supabase
            .from('hb_profiles')
            .update({ id: userId, current_session_id: currentSessionId || null })
            .eq('email', userEmail);
          
          if (migrateErr) {
            checkAndShowRLSError(migrateErr, "Failed to link existing email profile");
          }

          // Also migrate all food/weight logs from old UUID to new UUID
          if (emailProfile.id && emailProfile.id !== userId) {
            await supabase.from('hb_food_logs').update({ user_id: userId }).eq('user_id', emailProfile.id);
            await supabase.from('hb_weight_logs').update({ user_id: userId }).eq('user_id', emailProfile.id);
          }

          const merged = { ...emailProfile, id: userId, current_session_id: currentSessionId || null };
          setProfile(merged);
          if (merged.avatar_url) setAvatarUrl(merged.avatar_url);
          if (currentSessionId) localStorage.setItem('hb_last_session_id', currentSessionId);
        } else {
          // Brand new user (e.g. first Google login) — create profile using Google display name & avatar
          const resolvedName = displayName || name || userEmail.split('@')[0];
          const newProfile: Profile = {
            email: userEmail,
            name: resolvedName,
            avatar_url: avatarUrl || undefined,
            daily_calorie_goal: 2200,
            protein_goal_g: 130,
            carbs_goal_g: 220,
            fats_goal_g: 70,
            weight_kg: 75,
            height_cm: 175,
            target_weight_kg: 70,
            activity_level: 'moderate',
            goal_type: 'lose',
            is_premium: false,
            scans_used: 0,
            premium_until: null,
            current_session_id: currentSessionId || null
          };
          
          // Use upsert to avoid duplicate key violations and ensure robust creation
          const { error: insertErr } = await supabase
            .from('hb_profiles')
            .upsert({ id: userId, ...newProfile });

          if (insertErr) {
            checkAndShowRLSError(insertErr, "Failed to create profile");
            // Set local state anyway so they can use the app as guest / local-first fallback
            setProfile(newProfile);
            if (avatarUrl) setAvatarUrl(avatarUrl);
          } else {
            setProfile(newProfile);
            if (avatarUrl) setAvatarUrl(avatarUrl);
            if (currentSessionId) {
              localStorage.setItem('hb_last_session_id', currentSessionId);
            }
          }
        }
      }

      // 2. Fetch Food Logs
      const { data: foods } = await supabase
        .from('hb_food_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (foods) {
        setFoodLogs(foods);
        // Run expired photo cleanup logic
        cleanExpiredPhotos(foods, userId);
      }

      // 3. Fetch Weight Logs
      const { data: weights } = await supabase
        .from('hb_weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: true });

      if (weights) setWeightLogs(weights);

    } catch (err) {
      console.error("Error fetching database details, using fallbacks:", err);
      loadLocalDemoData();
    } finally {
      setIsLoading(false);
      setIsProfileLoaded(true);
    }
  };

  // Load Demo fallback data
  const loadLocalDemoData = () => {
    const cachedProfile = localStorage.getItem('hb_demo_profile');
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      setProfile(parsed);
      if (parsed.avatar_url) {
        setAvatarUrl(parsed.avatar_url);
      } else {
        const cachedAvatar = localStorage.getItem('hb_demo_avatar');
        if (cachedAvatar) setAvatarUrl(cachedAvatar);
      }
    } else {
      const defaultProfile = {
        email: 'guest@healthybit.app',
        name: 'Guest User',
        daily_calorie_goal: 2200,
        protein_goal_g: 130,
        carbs_goal_g: 220,
        fats_goal_g: 70,
        weight_kg: 75,
        height_cm: 175,
        target_weight_kg: 70,
        activity_level: 'moderate',
        goal_type: 'lose'
      };
      setProfile(defaultProfile);
      localStorage.setItem('hb_demo_profile', JSON.stringify(defaultProfile));
    }

    const cachedFoods = localStorage.getItem('hb_demo_foods');
    if (cachedFoods) {
      const parsedFoods = JSON.parse(cachedFoods);
      setFoodLogs(parsedFoods);
      // Run expired photo cleanup logic
      cleanExpiredPhotos(parsedFoods);
    } else {
      // Seed initial foods resembling screen logs
      const sampleFoods: FoodLog[] = [
        {
          id: 'sample-1',
          food_name: "Grilled Salmon",
          calories: 672,
          protein_g: 52,
          carbs_g: 18,
          fats_g: 44,
          health_score: 92,
          ingredients: [
            { name: "Salmon Fillet (200g)", calories: 416, protein: 40, carbs: 0, fats: 28 },
            { name: "Olive Oil (1 tbsp)", calories: 119, protein: 0, carbs: 0, fats: 14 },
            { name: "Mixed Vegetables", calories: 85, protein: 3, carbs: 14, fats: 1 }
          ],
          logged_at: new Date().toISOString()
        }
      ];
      setFoodLogs(sampleFoods);
      localStorage.setItem('hb_demo_foods', JSON.stringify(sampleFoods));
    }

    const cachedWeights = localStorage.getItem('hb_demo_weights');
    if (cachedWeights) {
      setWeightLogs(JSON.parse(cachedWeights));
    } else {
      // Seed weights for progress graph
      const sampleWeights: WeightLog[] = [
        { weight_kg: 84.5, logged_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { weight_kg: 83.2, logged_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { weight_kg: 82.5, logged_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { weight_kg: 81.8, logged_at: new Date().toISOString().split('T')[0] }
      ];
      setWeightLogs(sampleWeights);
      localStorage.setItem('hb_demo_weights', JSON.stringify(sampleWeights));
    }


  };

  // Manage camera stream for Live Food Scan tab
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCurrent = true;

    const initScannerCamera = async () => {
      if (activeTab !== 'diet') return;

      // 1. Check if we are in an insecure context (HTTP, not localhost)
      if (!window.isSecureContext) {
        console.warn("Insecure context: Camera access is blocked by the browser over HTTP.");
        if (isCurrent) {
          setCameraPermissionStatus('denied');
          setIsCameraInitializing(false);
        }
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("navigator.mediaDevices.getUserMedia is not available.");
        if (isCurrent) {
          setCameraPermissionStatus('denied');
          setIsCameraInitializing(false);
        }
        return;
      }

      // 2. Query permissions state if available
      let permissionState: 'prompt' | 'granted' | 'denied' = 'prompt';

      // Fallback for Safari/iOS: use localStorage
      const wasCameraGranted = localStorage.getItem('hb_camera_granted') === 'true';
      if (wasCameraGranted) {
        permissionState = 'granted';
      } else if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as any });
          permissionState = result.state as 'prompt' | 'granted' | 'denied';

          // Setup live permission listener
          result.onchange = () => {
            if (isCurrent) {
              const newState = result.state as 'prompt' | 'granted' | 'denied';
              setCameraPermissionStatus(newState);
              if (newState === 'granted') {
                setCameraTrigger(prev => prev + 1);
              }
            }
          };
        } catch (e) {
          // Permissions API might fail or not support camera query
        }
      }

      if (isCurrent) {
        setCameraPermissionStatus(permissionState);
      }

      // 3. If state is denied, don't try to access camera
      if (permissionState === 'denied') {
        if (isCurrent) {
          setIsCameraInitializing(false);
        }
        return;
      }

      // 4. If state is prompt, show the allow camera popup overlay, do not auto-request stream
      if (permissionState === 'prompt') {
        if (isCurrent) {
          setIsCameraInitializing(false);
        }
        return;
      }

      // 5. If state is granted, initialize the camera stream
      if (permissionState === 'granted') {
        if (isCurrent) {
          setIsCameraInitializing(true);
        }

        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
          } catch (firstErr) {
            console.warn("Live scan camera environment facing constraint failed, trying generic video:", firstErr);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
          }

          if (!isCurrent) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          activeStream = stream;
          if (isCurrent) {
            setCameraPermissionStatus('granted');
            localStorage.setItem('hb_camera_granted', 'true');
            setIsCameraInitializing(false);
          }

          // Assign stream and play — retry after a short delay for mobile browsers
          const playVideo = () => {
            if (liveVideoRef.current) {
              liveVideoRef.current.srcObject = stream;
              liveVideoRef.current.play().catch(() => {});
            }
          };
          playVideo();
          // Retry after React re-render to ensure video element is visible
          setTimeout(playVideo, 200);

        } catch (err: any) {
          console.warn("Live scan tab camera failed completely:", err);
          if (isCurrent) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setCameraPermissionStatus('denied');
              localStorage.removeItem('hb_camera_granted');
            } else {
              setCameraPermissionStatus('denied');
            }
            setIsCameraInitializing(false);
          }
        }
      }
    };

    initScannerCamera();

    return () => {
      isCurrent = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
      }
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setLiveScanDetectedFood(null);
      setIsCameraInitializing(false);
    };
  }, [activeTab, cameraTrigger]);

  // Shake detection hook: shake phone to scan or confirm/log scanned food
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastTime = 0;
    const SHAKE_THRESHOLD = 15; // Responsive threshold for mobile wrist shake / flick

    const triggerShakeAction = () => {
      const now = Date.now();
      if (now - lastShakeTimeRef.current < 1600) return; // 1.6s debounce cooldown
      lastShakeTimeRef.current = now;

      // Haptic feedback (vibration)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([40, 50, 40]); } catch (_) {}
      }

      setShakeDetectedVisual(true);
      setTimeout(() => setShakeDetectedVisual(false), 1400);

      // 1. In Diet tab live scanner
      if (activeTab === 'diet' && cameraPermissionStatus === 'granted') {
        if (!liveScanDetectedFoodRef.current) {
          // Food not scanned yet: stabilize for 250ms then trigger live scan for sharp camera focus
          if (!isAnalyzingFrameRef.current) {
            showToast("📱 Shake detected! Stabilizing & scanning food...", "info");
            setTimeout(() => {
              if (!liveScanDetectedFoodRef.current && !isAnalyzingFrameRef.current) {
                handleLiveScanRef.current(false);
              }
            }, 250);
          }
        } else {
          // Food already scanned: ensure at least 2.5s cooldown since food was detected before shake logs it
          if (Date.now() - foodDetectedAtRef.current < 2500) {
            return;
          }
          if (!isSavingMealRef.current) {
            showToast("📱 Shake detected! Logging meal to diary... 🎉", "success");
            handleSaveLiveScannedFoodRef.current();
          }
        }
      } else if (showCameraScannerRef.current) {
        // 2. In full-screen modal camera scanner
        showToast("📱 Shake detected! Stabilizing & capturing photo...", "info");
        setTimeout(() => {
          capturePhotoRef.current();
        }, 250);
      }
    };

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const currentTime = Date.now();
      if ((currentTime - lastTime) > 80) {
        const diffTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        let delta = 0;
        if (event.acceleration && event.acceleration.x !== null) {
          delta = Math.sqrt(x * x + y * y + z * z);
        } else {
          delta = (Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ)) / (diffTime || 0.1);
        }

        if (delta > SHAKE_THRESHOLD) {
          triggerShakeAction();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    if ((activeTab === 'diet' && cameraPermissionStatus === 'granted') || showCameraScanner) {
      window.addEventListener('devicemotion', handleMotionEvent);
      // Request iOS permissions if supported
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        (DeviceMotionEvent as any).requestPermission().catch(() => {});
      }
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent);
    };
  }, [activeTab, cameraPermissionStatus, showCameraScanner]);

  // General tab change listener to clean up other camera states and text-to-speech
  useEffect(() => {
    stopCamera();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [activeTab]);

  // Stop AI voice when scan screens/drawers are closed (e.g. Back button, Save to Log, Tab change)
  useEffect(() => {
    if (!showBreakdown && !showCameraScanner && !showTextDescriber) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [showBreakdown, showCameraScanner, showTextDescriber]);

  const speakFoodAnalysis = (result: FoodAnalysisResult) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const isHindi = aiVoiceLanguage === 'hi';
      const text = isHindi
        ? `स्कैन किया गया ${result.foodName}। इसमें ${result.calories} कैलोरी, ${result.protein} ग्राम प्रोटीन, ${result.carbs} ग्राम कार्बोहाइड्रेट, और ${result.fats} ग्राम फैट है।`
        : `Scanned ${result.foodName}. It has ${result.calories} calories, ${result.protein} grams of protein, ${result.carbs} grams of carbs, and ${result.fats} grams of fat.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      
      if (isHindi) {
        selectedVoice = voices.find(v => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          return (lang.startsWith('hi') || name.includes('hindi') || name.includes('india')) && (
            name.includes('female') ||
            name.includes('google') ||
            name.includes('swara') ||
            name.includes('kalpana') ||
            (v as any).gender === 'female'
          );
        }) || voices.find(v => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          return lang.startsWith('hi') || name.includes('hindi') || name.includes('india');
        });
      } else {
        selectedVoice = voices.find(v => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          return lang.startsWith('en') && (
            name.includes('female') || 
            name.includes('google us english') || 
            name.includes('zira') || 
            name.includes('samantha') || 
            name.includes('victoria') || 
            name.includes('hazel') ||
            name.includes('natural') ||
            name.includes('karen') ||
            name.includes('moira') ||
            name.includes('tessa') ||
            name.includes('siri') ||
            (v as any).gender === 'female'
          );
        });
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = isHindi ? 1.05 : 1.0;
      utterance.pitch = isHindi ? 1.1 : 1.25;
      window.speechSynthesis.speak(utterance);
    }
  };



  const isValidFood = (res: any): boolean => {
    if (!res) return false;
    const name = (res.foodName || '').toLowerCase();
    if (
      name.includes('no food') ||
      name.includes('not food') ||
      name.includes('not a food') ||
      name.includes('unknown') ||
      name.includes('empty') ||
      name.includes('refuse') ||
      name.includes('no visible') ||
      name.includes('unable to') ||
      name.includes('camera blocked') ||
      name.includes('no scan')
    ) {
      return false;
    }
    const isZeroCalBeverage = name.includes('coffee') || name.includes('tea') || name.includes('water') || name.includes('diet');
    if ((res.calories || 0) <= 0 && !isZeroCalBeverage) {
      return false;
    }
    return true;
  };

  const handleLiveScan = async (isAuto = false) => {
    if (isAnalyzingFrame) return;
    setIsAnalyzingFrame(true);
    if (!isAuto) {
      setScanError(null);
    }

    // Camera mode: capture high-quality image from video element and scan with Gemini
    if (liveVideoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        const videoWidth = liveVideoRef.current.videoWidth || 1280;
        const videoHeight = liveVideoRef.current.videoHeight || 720;
        const maxWidth = 720;
        let width = videoWidth;
        let height = videoHeight;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(liveVideoRef.current, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.65);
          // Call our live analyzer (which invokes Gemini 2.5 Flash)
          const result = await analyzeLiveFoodFrame(base64, 'image/jpeg');
          
          if (isValidFood(result)) {
            setLiveScanDetectedFood(result);
            setLastScannedBase64(base64);
            setScannedImage(base64);
            speakFoodAnalysis(result);
            if (!isAuto) {
              setScanError(null);
            }
          } else {
            console.log("[handleLiveScan] No valid food detected in frame:", result);
            if (!isAuto) {
              setScanError("No food detected in frame. Please align your food inside the viewfinder.");
            }
          }
        } else {
          throw new Error('Canvas context failed');
        }
      } catch (err: any) {
        console.error("Live scan failed:", err);
        if (!isAuto) {
          if (err?.message === 'quota_exceeded') {
            setScanError('quota');
          } else {
            setScanError('failed');
          }
        }
      } finally {
        setIsAnalyzingFrame(false);
      }
    } else {
      setIsAnalyzingFrame(false);
      if (!isAuto) {
        setScanError('failed');
      }
    }
  };
  handleLiveScanRef.current = handleLiveScan;


  const handleSaveLiveScannedFood = async () => {
    if (!liveScanDetectedFood || isSavingMeal) return;
    setIsSavingMeal(true);

    const newLog: FoodLog = {
      food_name: liveScanDetectedFood.foodName,
      calories: liveScanDetectedFood.calories,
      protein_g: liveScanDetectedFood.protein,
      carbs_g: liveScanDetectedFood.carbs,
      fats_g: liveScanDetectedFood.fats,
      health_score: liveScanDetectedFood.healthScore,
      ingredients: liveScanDetectedFood.ingredients || [],
      logged_at: new Date().toISOString()
    };

    if (user) {
      const { error } = await supabase.from('hb_food_logs').insert({
        user_id: user.id,
        food_name: newLog.food_name,
        calories: newLog.calories,
        protein_g: newLog.protein_g,
        carbs_g: newLog.carbs_g,
        fats_g: newLog.fats_g,
        ingredients: newLog.ingredients,
        health_score: newLog.health_score,
        logged_at: newLog.logged_at
      });
      if (error) console.error("Error inserting live scan meal:", error);
    }

    const updated = [newLog, ...foodLogs];
    setFoodLogs(updated);

    if (!user) {
      localStorage.setItem('hb_demo_foods', JSON.stringify(updated));
    }

    playFeedback();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setLiveScanDetectedFood(null);
    setIsSavingMeal(false);
    
    showToast(`Successfully logged ${newLog.food_name}! 🎉`, 'success');
  };
  handleSaveLiveScannedFoodRef.current = handleSaveLiveScannedFood;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.warn("Clerk signOut failed or ignored:", e);
    }
    localStorage.removeItem('hb_last_session_id');
    setUser(null);
    setAvatarUrl(null);
    setProfile({
      email: '',
      name: '',
      daily_calorie_goal: 2200,
      protein_goal_g: 130,
      carbs_goal_g: 220,
      fats_goal_g: 70,
      weight_kg: 75,
      height_cm: 175,
      target_weight_kg: 70,
      activity_level: 'moderate',
      goal_type: 'lose',
      is_premium: false,
      scans_used: 0,
      premium_until: null
    });
    setFoodLogs([]);
    setWeightLogs([]);
    setChatMessages([]);
    setActiveTab('home');
    setAuthMode('login'); // Go to login mode
    setOnboardingStep(14); // Go straight to Login page (Step 14)
  };

  // Upload avatar photo to Supabase Storage or local cache
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      if (!user) {
        // Guest mode base64 avatar
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAvatarUrl(base64);
          setProfile(prev => ({ ...prev, avatar_url: base64 }));
          localStorage.setItem('hb_demo_avatar', base64);
          setIsUploadingAvatar(false);
          showToast('Avatar updated locally (guest mode)!', 'success');
        };
        reader.readAsDataURL(file);
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      
      let uploadData;
      let bucketToUse = 'avatars';
      
      // Attempt upload to avatars bucket
      const { data: upData, error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { contentType: file.type, upsert: true });
        
      if (upErr) {
        console.warn('Avatars bucket failed, trying food-images:', upErr.message);
        // Fallback to food-images bucket
        const { data: fallbackData, error: fallbackErr } = await supabase.storage
          .from('food-images')
          .upload(`avatars/${filePath}`, file, { contentType: file.type, upsert: true });
          
        if (fallbackErr) {
          throw new Error(`Failed to upload avatar: ${fallbackErr.message}`);
        }
        uploadData = fallbackData;
        bucketToUse = 'food-images';
      } else {
        uploadData = upData;
      }
      
      if (!uploadData) {
        throw new Error('Upload succeeded but no data returned.');
      }
      
      const { data: urlData } = supabase.storage.from(bucketToUse).getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-bust
      setAvatarUrl(publicUrl);
      
      // Persist to profile
      const { error: dbErr } = await supabase
        .from('hb_profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
        
      if (dbErr) {
        console.error('Error updating profile avatar in database:', dbErr);
        showToast('Avatar uploaded, but failed to link to profile in DB.', 'error');
      } else {
        setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
        showToast('Profile picture updated successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showToast(err.message || 'Failed to upload avatar.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so same file can be re-picked
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Profile Save
  const handleSaveProfile = async (updated: Profile) => {
    setProfile(updated);
    if (user) {
      // Filter out non-database columns like 'phone' to prevent PostgreSQL errors
      const dbProfile: any = {};
      const allowedColumns = [
        'email',
        'name',
        'daily_calorie_goal',
        'protein_goal_g',
        'carbs_goal_g',
        'fats_goal_g',
        'weight_kg',
        'height_cm',
        'target_weight_kg',
        'activity_level',
        'goal_type',
        'avatar_url',
        'is_premium',
        'scans_used',
        'premium_until'
      ];

      for (const key of allowedColumns) {
        if (key in updated) {
          dbProfile[key] = (updated as any)[key];
        }
      }

      console.log('Upserting profile to hb_profiles:', dbProfile);
      const { error } = await supabase.from('hb_profiles').upsert({ id: user.id, ...dbProfile });
      if (error) {
        console.error('Error upserting profile in hb_profiles:', error);
      } else {
        console.log('Profile upserted successfully');
      }
    } else {
      localStorage.setItem('hb_demo_profile', JSON.stringify(updated));
    }
  };

  const activatePremiumLocally = async (_cashfreeOrderId: string, _cashfreePaymentId: string | null, plan: 'monthly' | 'yearly') => {
    const expiryDate = new Date();
    if (plan === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const premiumUntilISO = expiryDate.toISOString();

    // 1. Update local React state instantly for responsive UI
    setProfile(prev => ({
      ...prev,
      is_premium: true,
      premium_until: premiumUntilISO
    }));

    // 2. Also directly write to Supabase in case the edge function hasn't finished yet
    if (user) {
      try {
        const { error: dbErr } = await supabase
          .from('hb_profiles')
          .update({ is_premium: true, premium_until: premiumUntilISO })
          .eq('id', user.id);

        if (dbErr) {
          console.error('Error directly writing premium to DB:', dbErr);
        } else {
          console.log('Premium status written directly to Supabase successfully.');
        }
      } catch (writeErr) {
        console.error('Failed to write premium to DB directly:', writeErr);
      }
    }

    setPaywallStep('success');
    setIsProcessingPayment(false);
    setPaymentProgressStep('');
    setShowPaywall(true);

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const playTone = (freq: number, startDelay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + 0.15);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + 0.15);
      };
      playTone(523.25, 0); playTone(659.25, 0.08); playTone(783.99, 0.16); playTone(1046.50, 0.24);
    } catch (e) { }
  };

  const handleCashfreeCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      showToast("Please sign in or create an account to upgrade to Pro.", 'info');
      setOnboardingStep(14);
      return;
    }
    setPaywallPlan(plan);
    setPaywallStep('checkout');
    setIsProcessingPayment(true);
    setPaymentProgressStep('Connecting to Cashfree Secure Payment Gateway...');
    
    const safetyTimer = setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentProgressStep('');
    }, 45000);

    const price = plan === 'yearly' ? 1800 : 300;

    try {
      // Calculate origin reachable by mobile devices & desktop
      let redirectUrlOrigin = window.location.origin;
      if (redirectUrlOrigin.includes('localhost') || redirectUrlOrigin.startsWith('file:') || redirectUrlOrigin.includes('capacitor')) {
        const hostname = (window.location.hostname && window.location.hostname !== 'localhost') ? window.location.hostname : '10.48.105.150';
        const port = window.location.port ? `:${window.location.port}` : ':5173';
        redirectUrlOrigin = `http://${hostname}${port}`;
      }

      console.log('Initiating Cashfree checkout with origin:', redirectUrlOrigin);

      const { data, error } = await supabase.functions.invoke('cashfree-payment', {
        body: {
          plan,
          amount: price,
          userId: user.id,
          redirectUrlOrigin,
          userPhone: profile.phone || '',
          userEmail: user.email || profile.email || ''
        }
      });

      clearTimeout(safetyTimer);

      if (error) {
        throw new Error(error.message || 'Failed to initiate secure payment via Cashfree Edge Function');
      }
      if (!data || !data.success) {
        throw new Error(data?.error || 'Cashfree payment initiation failed');
      }

      if (data.orderId) {
        setCurrentOrderId(data.orderId);
      }

      if (data.paymentSessionId) {
        // Ensure Cashfree SDK script is loaded dynamically
        if (!(window as any).Cashfree) {
          setPaymentProgressStep('Loading Cashfree Payment Gateway SDK...');
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Cashfree Checkout SDK'));
            document.head.appendChild(script);
          });
        }

        // Save pending transaction details to localStorage so after Cashfree redirect return, app verifies payment
        if (data.orderId) {
          localStorage.setItem('hb_pending_cashfree', JSON.stringify({
            orderId: data.orderId,
            plan,
            timestamp: Date.now()
          }));
        }

        // Initialize Cashfree SDK (sandbox mode)
        const cashfree = (window as any).Cashfree({
          mode: "sandbox"
        });

        setIsProcessingPayment(true);
        setPaymentProgressStep('Redirecting to Cashfree Payment Gateway...');

        // Launch Cashfree checkout with redirectTarget: "_self" for full mobile compatibility
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self"
        });
      } else {
        throw new Error('No payment session ID returned from Cashfree server');
      }

    } catch (err: any) {
      clearTimeout(safetyTimer);
      setIsProcessingPayment(false);
      setPaymentProgressStep('');
      console.error('Cashfree secure API gateway failed:', err);
      setPaymentErrorMessage(err.message || String(err));
      setPaywallStep('failure');
    }
  };

  const handleActivatePremium = async (plan: 'monthly' | 'yearly') => {
    await handleCashfreeCheckout(plan);
  };

  const handleTestCheckout = async () => {
    if (!user) {
      showToast("Please sign in or create an account to upgrade to Pro.", 'info');
      setOnboardingStep(14);
      return;
    }
    setPaywallPlan('monthly');
    setIsProcessingPayment(true);
    setPaymentProgressStep('Processing test checkout...');
    const orderId = 'HB_ORD_TEST_' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
    setCurrentOrderId(orderId);

    setTimeout(async () => {
      await activatePremiumLocally(orderId, 'PAY_TEST_' + Date.now(), 'monthly');
      showToast("🎉 Test Payment Successful! Premium Activated.", "success");
    }, 800);
  };

  const handleSaveSettings = async () => {
    const updated: Profile = {
      ...profile,
      name: settingsName.trim() || profile.name,
      height_cm: parseFloat(settingsHeight) || profile.height_cm,
      weight_kg: parseFloat(settingsWeight) || profile.weight_kg,
      daily_calorie_goal: parseInt(settingsCalorieGoal) || profile.daily_calorie_goal,
      target_weight_kg: parseFloat(settingsTargetWeight) || profile.target_weight_kg,
      goal_type: settingsGoalType || profile.goal_type,
      activity_level: settingsActivityLevel || profile.activity_level,
      protein_goal_g: parseFloat(settingsProteinGoal) || profile.protein_goal_g,
      carbs_goal_g: parseFloat(settingsCarbsGoal) || profile.carbs_goal_g,
      fats_goal_g: parseFloat(settingsFatsGoal) || profile.fats_goal_g
    };
    await handleSaveProfile(updated);
    setSettingsSaveSuccess(true);
    setTimeout(() => {
      setSettingsSaveSuccess(false);
    }, 3000);
  };

  const handleSettingsChangePassword = async () => {
    setSettingsPasswordError('');
    setSettingsPasswordSuccess(false);

    if (settingsNewPassword.length < 6) {
      setSettingsPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (settingsNewPassword !== settingsNewPasswordConfirm) {
      setSettingsPasswordError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: settingsNewPassword
      });
      if (error) throw error;
      setSettingsPasswordSuccess(true);
      setSettingsNewPassword('');
      setSettingsNewPasswordConfirm('');
      setTimeout(() => {
        setShowSettingsChangePassword(false);
        setSettingsPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setSettingsPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermissionStatus('granted');
      localStorage.setItem('hb_camera_granted', 'true');
      stream.getTracks().forEach(track => track.stop());
      setCameraTrigger(prev => prev + 1);
      return true;
    } catch (err: any) {
      console.warn("Camera request permission failed:", err);
      setCameraPermissionStatus('denied');
      localStorage.removeItem('hb_camera_granted');
      return false;
    }
  };

  // Camera Management — mobile-first: try native camera, fall back to file picker with capture
  const startCamera = async () => {
    setShowAddMenu(false);
    setShowCameraScanner(true);

    const isSecure = window.isSecureContext;
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!isSecure || !hasMedia) {
      console.warn("Insecure HTTP context or getUserMedia unsupported. Showing unsupported scanner UI.");
      setCameraPermissionStatus('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      // Permission granted! Show camera scanner screen and bind stream
      setCameraPermissionStatus('granted');
      localStorage.setItem('hb_camera_granted', 'true');
      setCameraStream(stream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn("Failed to play video stream:", err);
          });
        }
      }, 100);

    } catch (err) {
      console.warn("getUserMedia failed or denied, showing blocked state:", err);
      setCameraPermissionStatus('denied');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraScanner(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Handle Photo Capture
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const videoWidth = videoRef.current.videoWidth || 640;
      const videoHeight = videoRef.current.videoHeight || 480;
      const maxWidth = 512;
      let width = videoWidth;
      let height = videoHeight;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        setScannedImage(dataUrl);
        stopCamera();
        analyzeCapturedImage(dataUrl);
      }
    }
  };
  capturePhotoRef.current = capturePhoto;

  // Handle File Upload Scanner
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressedBase64 = await compressImage(base64);
        setScannedImage(compressedBase64);
        stopCamera();
        analyzeCapturedImage(compressedBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process and Analyze Image
  const analyzeCapturedImage = async (base64Image: string) => {
    if (!profile.is_premium && (profile.scans_used || 0) >= 3) {
      setShowPaywall(true);
      return;
    }
    setIsLoading(true);
    setScanError(null);
    setLastScannedBase64(base64Image);
    setCurrentAnalysis(null);
    setShowBreakdown(true);
    try {
      const result = await analyzeFoodImage(base64Image, 'image/jpeg');
      setCurrentAnalysis(result);
      setBreakdownQuantity(1);
      speakFoodAnalysis(result);

      // Increment scans count
      const nextScans = (profile.scans_used || 0) + 1;
      const updatedProfile = { ...profile, scans_used: nextScans };
      setProfile(updatedProfile);
      if (user) {
        await supabase.from('hb_profiles').update({ scans_used: nextScans }).eq('id', user.id);
      } else {
        localStorage.setItem('hb_demo_profile', JSON.stringify(updatedProfile));
      }
    } catch (err: any) {
      setShowBreakdown(false);
      if (err?.message === 'quota_exceeded') {
        setScanError('quota');
      } else {
        setScanError('failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Process Text Foods
  const analyzeTextIngredients = async () => {
    if (!inputText.trim()) return;
    if (!profile.is_premium && (profile.scans_used || 0) >= 3) {
      setShowPaywall(true);
      return;
    }
    setIsLoading(true);
    setScanError(null);
    setCurrentAnalysis(null);
    setShowBreakdown(true);
    try {
      const result = await analyzeFoodText(inputText);
      setCurrentAnalysis(result);
      setBreakdownQuantity(1);
      speakFoodAnalysis(result);

      // Increment scans count
      const nextScans = (profile.scans_used || 0) + 1;
      const updatedProfile = { ...profile, scans_used: nextScans };
      setProfile(updatedProfile);
      if (user) {
        await supabase.from('hb_profiles').update({ scans_used: nextScans }).eq('id', user.id);
      } else {
        localStorage.setItem('hb_demo_profile', JSON.stringify(updatedProfile));
      }
    } catch (err: any) {
      setShowBreakdown(false);
      if (err?.message === 'quota_exceeded') {
        setScanError('quota');
      } else {
        setScanError('failed');
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Log weight
  const addWeightLog = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newLog: WeightLog = { weight_kg: val, logged_at: todayStr };

    if (user) {
      const { error } = await supabase.from('hb_weight_logs').insert({
        user_id: user.id,
        weight_kg: val,
        logged_at: todayStr
      });
      if (error) console.error(error);
    }

    // Always update local state
    const updated = [...weightLogs, newLog].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    setWeightLogs(updated);
    setWeightInput('');
    setProfile(prev => ({ ...prev, weight_kg: val }));

    if (!user) {
      localStorage.setItem('hb_demo_weights', JSON.stringify(updated));
      const profileUpdated = { ...profile, weight_kg: val };
      localStorage.setItem('hb_demo_profile', JSON.stringify(profileUpdated));
    }
  };

  // Save the logged meal to database / storage — guarded against double-click
  const handleSaveMeal = async () => {
    if (!currentAnalysis || isSavingMeal) return;
    setIsSavingMeal(true);

    const loggedCal = Math.round(currentAnalysis.calories * breakdownQuantity);
    const loggedProt = Math.round(currentAnalysis.protein * breakdownQuantity);
    const loggedCarb = Math.round(currentAnalysis.carbs * breakdownQuantity);
    const loggedFat = Math.round(currentAnalysis.fats * breakdownQuantity);

    // Upload image to Supabase Storage if user is logged in and an image was scanned
    let finalImageUrl: string | undefined = scannedImage || undefined;
    if (user && lastScannedBase64) {
      try {
        // Convert base64 data URL to a Blob for upload
        const base64Data = lastScannedBase64.split(',')[1];
        const mimeType = lastScannedBase64.split(';')[0].split(':')[1] || 'image/jpeg';
        const byteChars = atob(base64Data);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType });
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const filePath = `${user.id}/${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(filePath, blob, { contentType: mimeType, upsert: false });

        if (uploadError) {
          console.warn('Image upload failed, using base64 fallback:', uploadError.message);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('food-images')
            .getPublicUrl(uploadData.path);
          finalImageUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Image upload error, using base64 fallback:', uploadErr);
      }
    }

    const newLog: FoodLog = {
      food_name: currentAnalysis.foodName,
      calories: loggedCal,
      protein_g: loggedProt,
      carbs_g: loggedCarb,
      fats_g: loggedFat,
      image_url: finalImageUrl,
      ingredients: currentAnalysis.ingredients,
      health_score: currentAnalysis.healthScore,
      logged_at: new Date().toISOString()
    };

    if (user) {
      const { error } = await supabase.from('hb_food_logs').insert({
        user_id: user.id,
        food_name: newLog.food_name,
        calories: newLog.calories,
        protein_g: newLog.protein_g,
        carbs_g: newLog.carbs_g,
        fats_g: newLog.fats_g,
        image_url: newLog.image_url,
        ingredients: newLog.ingredients,
        health_score: newLog.health_score,
        logged_at: newLog.logged_at
      });
      if (error) console.error("Error inserting meal:", error);
    }

    const updated = [newLog, ...foodLogs];
    setFoodLogs(updated);

    if (!user) {
      localStorage.setItem('hb_demo_foods', JSON.stringify(updated));
    }

    // Reset views
    setShowBreakdown(false);
    setShowTextDescriber(false);
    setShowCameraScanner(false);
    setScannedImage(null);
    setLastScannedBase64(null);
    setInputText('');
    setCurrentAnalysis(null);
    setIsSavingMeal(false);
  };

  // Delete log
  const handleDeleteFoodLog = async (id: string | undefined, index: number) => {
    if (user && id) {
      await supabase.from('hb_food_logs').delete().eq('id', id);
    }
    const updated = [...foodLogs];
    updated.splice(index, 1);
    setFoodLogs(updated);
    if (!user) {
      localStorage.setItem('hb_demo_foods', JSON.stringify(updated));
    }
  };



  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    const updatedMessages = [...chatMessages, { sender: 'user' as const, text: userMsg }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      let aiResponse = '';
      const endpoint = `https://oiuvwaoljbrnhcfxsblu.supabase.co/functions/v1/gemini-proxy`;

      // Build conversation history for context-aware replies
      const historyContents = updatedMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are a friendly, enthusiastic, and warm AI nutrition buddy/coach for HealthyBit. The user is: ${profile.weight_kg}kg, target calorie is ${profile.daily_calorie_goal} kcal/day, goal is to ${profile.goal_type} weight, protein goal ${profile.protein_goal_g || 0}g, carbs ${profile.carbs_goal_g || 0}g, fats ${profile.fats_goal_g || 0}g.

RULE: Always respond in a very friendly, supportive, and warm friend tone, but KEEP your response short and sweet (under 2-3 sentences max, under 45 words). NEVER use bullet points, lists, or headers. Speak like a real human friend in a quick chat app message. If the user speaks or queries in Hindi or Hinglish (Hindi written in English alphabet), you MUST respond in friendly Hindi or Hinglish, adhering strictly to the same formatting and length rules.`;

      try {
        let chatData: any = null;
        for (const chatModel of ['gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash']) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'chat',
                payload: {
                  model: chatModel,
                  system_instruction: { parts: [{ text: systemInstruction }] },
                  contents: historyContents
                }
              })
            });
            if (response.ok) {
              const data = await response.json();
              if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                chatData = data;
                break;
              }
            }
          } catch (_) {}
        }
        aiResponse = chatData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch {
        // Proxy unavailable — use smart offline fallback
      }

      if (!aiResponse) {
        const l = userMsg.toLowerCase();
        const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        if (l.includes('lose weight') || l.includes('fat loss') || l.includes('cut')) {
          aiResponse = rand([
            `Aim for a ~400 kcal deficit from your ${profile.daily_calorie_goal} kcal goal and hit ${profile.protein_goal_g}g protein daily to protect muscle. 🔥`,
            `Cut calories gradually — crash dieting backfires. Start by dropping 300 kcal from your current ${profile.daily_calorie_goal} goal and track for 2 weeks. 📉`,
            `Protein + fiber = fullness. Hit your ${profile.protein_goal_g}g protein target and load up on veggies — calories take care of themselves. 🥦`
          ]);
        } else if (l.includes('muscle') || l.includes('bulk') || l.includes('gain')) {
          aiResponse = rand([
            `Eat ${Math.round(profile.daily_calorie_goal * 1.1)} kcal with ${profile.protein_goal_g}g protein daily + lift heavy 3-4x/week. Simple, effective. 💪`,
            `Muscle needs a small surplus (~200-300 kcal above ${profile.daily_calorie_goal}) and consistent protein at ${profile.protein_goal_g}g. No shortcuts! 🏋️`,
            `Focus on progressive overload in the gym — nutrition handles the rest. Hit ${profile.protein_goal_g}g protein every day. 🔬`
          ]);
        } else if (l.includes('protein') || l.includes('macro')) {
          aiResponse = rand([
            `Your target is ${profile.protein_goal_g}g/day. Top sources: chicken (31g/100g), Greek yogurt (10g/100g), eggs (6g each). 🍗`,
            `Spread ${profile.protein_goal_g}g across 3-4 meals (30-40g each) for best muscle retention. 🥚`,
            `Struggling to hit ${profile.protein_goal_g}g? Add a whey shake (25g/scoop) — easiest protein boost. 🥛`
          ]);
        } else if (l.includes('water') || l.includes('hydrat')) {
          aiResponse = rand([
            `At ${profile.weight_kg}kg, drink ~${Math.round(profile.weight_kg * 0.033)}L daily. Thirst often disguises itself as hunger! 💧`,
            `Drink 500ml before each meal — it naturally reduces calorie intake without effort. 🚰`
          ]);
        } else if (l.includes('sleep') || l.includes('rest') || l.includes('recover')) {
          aiResponse = rand([
            `Poor sleep spikes hunger hormones by 30% — making your ${profile.daily_calorie_goal} kcal goal much harder. Prioritize 7-9 hrs. 😴`,
            `Deep sleep is when your body uses that ${profile.protein_goal_g}g of protein to repair muscle. Don't skip it! 🌙`
          ]);
        } else if (l.includes('cardio') || l.includes('workout') || l.includes('exercise')) {
          aiResponse = rand([
            `For fat loss, strength training > cardio long-term. 3 lifting sessions/week beats daily treadmill. 🏋️`,
            `Cardio is a bonus, not the foundation. A 300 kcal walk + a small food deficit beats 2-hour runs. 🏃`
          ]);
        } else if (l.includes('meal') || l.includes('eat') || l.includes('food') || l.includes('diet')) {
          aiResponse = rand([
            `Simple split for ${profile.daily_calorie_goal} kcal: Breakfast 400, Lunch 600, Dinner 700, Snacks 300. Adjust as needed! 🍽️`,
            `Meal prep Sundays = autopilot nutrition all week. Batch cook chicken + rice + veg, hit ${profile.protein_goal_g}g protein easily. 🥡`
          ]);
        } else {
          aiResponse = rand([
            `Log consistently, hit ${profile.protein_goal_g}g protein, and trust the process — that's 80% of the work. 🎯`,
            `Half plate veggies, quarter protein, quarter carbs. You'll stay within ${profile.daily_calorie_goal} kcal naturally. 🥗`,
            `Nutrition is simple: track, eat enough protein, sleep well. HealthyBit handles the rest! 💚`
          ]);
        }
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I had a hiccup! Try again in a moment. 🙏' }]);
    } finally {
      setIsChatLoading(false);
    }
  };





  // Weight ruler scrolling event handler and useEffect alignment
  const handleWeightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const tickWidth = 10;
    const minValue = weightUnit === 'kg' ? 30 : 60;
    const maxValue = weightUnit === 'kg' ? 180 : 400;
    const calculated = minValue + Math.round(scrollLeft / tickWidth);
    if (calculated >= minValue && calculated <= maxValue && calculated !== currentWeight) {
      setCurrentWeight(calculated);
      playFeedback();
    }
  };

  useEffect(() => {
    if (onboardingStep === 5) {
      const container = document.getElementById('weight-ruler-scroll');
      if (container) {
        const tickWidth = 10;
        const minValue = weightUnit === 'kg' ? 30 : 60;
        container.scrollLeft = (currentWeight - minValue) * tickWidth;
      }
    }
  }, [onboardingStep, weightUnit]);

  // Desired Weight ruler scrolling event handler and useEffect alignment
  const handleDesiredWeightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const tickWidth = 10;
    const minValue = weightUnit === 'kg' ? 30 : 60;
    const maxValue = weightUnit === 'kg' ? 180 : 400;
    const calculated = minValue + Math.round(scrollLeft / tickWidth);
    if (calculated >= minValue && calculated <= maxValue && calculated !== desiredWeight) {
      setDesiredWeight(calculated);
      playFeedback();
    }
  };

  useEffect(() => {
    if (onboardingStep === 9) {
      const container = document.getElementById('desired-weight-ruler-scroll');
      if (container) {
        const tickWidth = 10;
        const minValue = weightUnit === 'kg' ? 30 : 60;
        container.scrollLeft = ((desiredWeight ?? currentWeight) - minValue) * tickWidth;
      }
    }
  }, [onboardingStep, weightUnit, desiredWeight, currentWeight]);

  // Feet, inches, cm click handlers
  const handleFtClick = (ft: number) => {
    setHeightFt(ft);
    playFeedback();
    isProgrammaticHeight.current = true;
    const ftIndex = ftOptions.indexOf(ft);
    if (heightFtRef.current) {
      heightFtRef.current.scrollTo({ top: ftIndex * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticHeight.current = false;
    }, 300);
  };

  const handleInClick = (inch: number) => {
    setHeightIn(inch);
    playFeedback();
    isProgrammaticHeight.current = true;
    const inIndex = inOptions.indexOf(inch);
    if (heightInRef.current) {
      heightInRef.current.scrollTo({ top: inIndex * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticHeight.current = false;
    }, 300);
  };

  const handleCmClick = (cm: number) => {
    setHeightCm(cm);
    playFeedback();
    isProgrammaticHeight.current = true;
    const cmIndex = cmOptions.indexOf(cm);
    if (heightCmRef.current) {
      heightCmRef.current.scrollTo({ top: cmIndex * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticHeight.current = false;
    }, 300);
  };

  // Height scroll handlers
  const handleHeightFtScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticHeight.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < ftOptions.length) {
      const val = ftOptions[index];
      if (heightFt !== val) {
        setHeightFt(val);
        playFeedback();
      }
    }
  };

  const handleHeightInScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticHeight.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < inOptions.length) {
      const val = inOptions[index];
      if (heightIn !== val) {
        setHeightIn(val);
        playFeedback();
      }
    }
  };

  const handleHeightCmScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticHeight.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < cmOptions.length) {
      const val = cmOptions[index];
      if (heightCm !== val) {
        setHeightCm(val);
        playFeedback();
      }
    }
  };

  // Height mount and unit change sync
  useEffect(() => {
    if (onboardingStep === 4) {
      isProgrammaticHeight.current = true;
      if (heightUnit === 'ft') {
        const ftVal = heightFt !== null ? heightFt : 5;
        const inVal = heightIn !== null ? heightIn : 6;
        const ftIndex = ftOptions.indexOf(ftVal);
        const inIndex = inOptions.indexOf(inVal);
        if (heightFtRef.current) heightFtRef.current.scrollTop = ftIndex * 40;
        if (heightInRef.current) heightInRef.current.scrollTop = inIndex * 40;
      } else {
        const cmVal = heightCm !== null ? heightCm : 170;
        const cmIndex = cmOptions.indexOf(cmVal);
        if (heightCmRef.current) heightCmRef.current.scrollTop = cmIndex * 40;
      }
      const t = setTimeout(() => {
        isProgrammaticHeight.current = false;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [onboardingStep, heightUnit]);

  // Birthdate click handlers
  const handleBirthMonthClick = (m: string) => {
    setBirthMonth(m);
    playFeedback();
    isProgrammaticBirthdate.current = true;
    const index = months.indexOf(m);
    if (birthMonthRef.current) {
      birthMonthRef.current.scrollTo({ top: index * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticBirthdate.current = false;
    }, 300);
  };

  const handleBirthDayClick = (d: number) => {
    setBirthDay(d);
    playFeedback();
    isProgrammaticBirthdate.current = true;
    const index = days.indexOf(d);
    if (birthDayRef.current) {
      birthDayRef.current.scrollTo({ top: index * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticBirthdate.current = false;
    }, 300);
  };

  const handleBirthYearClick = (y: number) => {
    setBirthYear(y);
    playFeedback();
    isProgrammaticBirthdate.current = true;
    const index = years.indexOf(y);
    if (birthYearRef.current) {
      birthYearRef.current.scrollTo({ top: index * 40, behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticBirthdate.current = false;
    }, 300);
  };

  // Birthdate scroll handlers
  const handleBirthMonthScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticBirthdate.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < months.length) {
      const val = months[index];
      if (birthMonth !== val) {
        setBirthMonth(val);
        playFeedback();
      }
    }
  };

  const handleBirthDayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticBirthdate.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < days.length) {
      const val = days[index];
      if (birthDay !== val) {
        setBirthDay(val);
        playFeedback();
      }
    }
  };

  const handleBirthYearScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticBirthdate.current) return;
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / 40);
    if (index >= 0 && index < years.length) {
      const val = years[index];
      if (birthYear !== val) {
        setBirthYear(val);
        playFeedback();
      }
    }
  };

  // Birthdate mount sync & reset commit states
  useEffect(() => {
    if (onboardingStep === 13) {
      setCommitted(false);
      setHoldProgress(0);
      setIsHolding(false);
    }
    if (onboardingStep === 6) {
      isProgrammaticBirthdate.current = true;
      const mVal = birthMonth !== null ? birthMonth : 'January';
      const dVal = birthDay !== null ? birthDay : 1;
      const yVal = birthYear !== null ? birthYear : 2001;

      const mIndex = months.indexOf(mVal);
      const dIndex = days.indexOf(dVal);
      const yIndex = years.indexOf(yVal);

      if (birthMonthRef.current) birthMonthRef.current.scrollTop = mIndex * 40;
      if (birthDayRef.current) birthDayRef.current.scrollTop = dIndex * 40;
      if (birthYearRef.current) birthYearRef.current.scrollTop = yIndex * 40;

      const t = setTimeout(() => {
        isProgrammaticBirthdate.current = false;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [onboardingStep]);

  // Hold progress interval effect
  useEffect(() => {
    let intervalId: any = null;
    if (isHolding) {
      intervalId = setInterval(() => {
        setHoldProgress(p => {
          if (p >= 100) {
            clearInterval(intervalId);
            setIsHolding(false);
            setCommitted(true);
            setTimeout(() => {
              setOnboardingStep(14); // Next screen (gateway)
            }, 2500);
            return 100;
          }
          return p + 3.33; // 1.5s total duration
        });
      }, 50);
    } else {
      intervalId = setInterval(() => {
        setHoldProgress(p => {
          if (p <= 0) {
            clearInterval(intervalId);
            return 0;
          }
          return Math.max(0, p - 8); // Drain back down
        });
      }, 30);
    }
    return () => clearInterval(intervalId);
  }, [isHolding]);

  // Confetti Canvas animation hook when committed is true
  useEffect(() => {
    if (committed) {
      const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const colors = ['#10B981', '#2563EB', '#F97316', '#EF4444', '#EC4899', '#FBBF24'];
      const particles: Array<{
        x: number;
        y: number;
        size: number;
        color: string;
        speedX: number;
        speedY: number;
        rotation: number;
        rotationSpeed: number;
        opacity: number;
      }> = [];

      const centerX = width / 2;
      const centerY = height * 0.6; // center around commit button height

      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 9;
        particles.push({
          x: centerX,
          y: centerY,
          size: 5 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed - 3,
          rotation: Math.random() * 360,
          rotationSpeed: -8 + Math.random() * 16,
          opacity: 1
        });
      }

      let animId: number;
      const tick = () => {
        ctx.clearRect(0, 0, width, height);
        let active = false;

        particles.forEach(p => {
          p.x += p.speedX;
          p.y += p.speedY;
          p.speedY += 0.2; // gravity
          p.speedX *= 0.97; // drag
          p.rotation += p.rotationSpeed;

          if (p.y > height * 0.75) {
            p.opacity -= 0.015;
          }
          if (p.opacity < 0) p.opacity = 0;

          if (p.opacity > 0 && p.y < height + 10) {
            active = true;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        if (active) {
          animId = requestAnimationFrame(tick);
        }
      };

      tick();
      return () => cancelAnimationFrame(animId);
    }
  }, [committed]);

  // Forgot password flow
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setIsLoading(true);
    setAuthError('');

    if (!verifyingReset) {
      try {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email
        });
        setResetSent(true);
        setVerifyingReset(true);
      } catch (err: any) {
        console.error("Error sending reset password code:", err);
        if (err.errors && err.errors[0]) {
          setAuthError(err.errors[0].longMessage || err.errors[0].message);
        } else {
          setAuthError(err.message || 'Failed to send reset code.');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: password
      });
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
        setVerifyingReset(false);
        setResetSent(false);
        setResetCode('');
        setEmail('');
        setPassword('');
      } else {
        setAuthError(`Password reset could not be completed. Status: ${result.status}`);
      }
    } catch (err: any) {
      console.error("Error verifying reset password code:", err);
      if (err.errors && err.errors[0]) {
        setAuthError(err.errors[0].longMessage || err.errors[0].message);
      } else {
        setAuthError(err.message || 'Password reset failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Signup/Login flow inside onboarding
  const handleOnboardingSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !isSignUpLoaded) return;
    setLoadingType('email');
    setIsLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        if (!verifyingEmail) {
          try {
            console.log("Starting Clerk sign-in for:", email);
            const { supportedFirstFactors } = await signIn.create({
              identifier: email,
            });

            const emailFactor = supportedFirstFactors?.find(
              (factor) => factor.strategy === 'email_code'
            );

            if (emailFactor) {
              await signIn.prepareFirstFactor({
                strategy: 'email_code',
                emailAddressId: emailFactor.emailAddressId,
              });
              console.log("Login OTP sent successfully.");
              setVerifyingEmail(true);
            } else {
              setAuthError("Email verification code is not enabled for this account.");
            }
          } catch (err: any) {
            console.error("Error sending login OTP:", err);
            if (err.errors && err.errors[0]) {
              setAuthError(err.errors[0].longMessage || err.errors[0].message);
            } else {
              setAuthError(err.message || 'Login failed.');
            }
          } finally {
            setLoadingType(null);
            setIsLoading(false);
          }
          return;
        }

        // Login OTP verification phase
        try {
          console.log("Verifying login OTP code:", verificationCode);
          const result = await signIn.attemptFirstFactor({
            strategy: 'email_code',
            code: verificationCode
          });

          if (result.status === "complete") {
            await setSignInActive({ session: result.createdSessionId });
            setEmail('');
            setVerificationCode('');
            setVerifyingEmail(false);
          } else {
            setAuthError(`Login could not be completed. Status: ${result.status}`);
          }
        } catch (err: any) {
          console.error("Error verifying login code:", err);
          if (err.errors && err.errors[0]) {
            setAuthError(err.errors[0].longMessage || err.errors[0].message);
          } else {
            setAuthError(err.message || 'Verification failed.');
          }
        } finally {
          setLoadingType(null);
          setIsLoading(false);
        }
      } else {
        // Register flow
        if (!verifyingEmail) {
          try {
            // Check if email already exists in hb_profiles (to speed up "already exists" checks)
            console.log("Checking if profile exists in hb_profiles first...");
            const { data: existingProfile } = await supabase
              .from('hb_profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (existingProfile) {
              setAuthError("An account with this email already exists. Please sign in instead.");
              setLoadingType(null);
              setIsLoading(false);
              return;
            }

            console.log("Creating Clerk signup for:", email);
            const cachedStrategy = localStorage.getItem('hb_clerk_signup_strategy');
            let success = false;

            if (cachedStrategy) {
              try {
                if (cachedStrategy === 'strategy_1') {
                  await signUp.create({
                    emailAddress: email,
                    password,
                    firstName: name || email.split('@')[0]
                  });
                } else if (cachedStrategy === 'strategy_2') {
                  const generatedUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);
                  await signUp.create({
                    emailAddress: email,
                    password,
                    username: generatedUsername,
                    firstName: name || email.split('@')[0]
                  });
                } else if (cachedStrategy === 'strategy_3') {
                  await signUp.create({
                    emailAddress: email,
                    firstName: name || email.split('@')[0]
                  });
                } else if (cachedStrategy === 'strategy_4') {
                  const generatedUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);
                  await signUp.create({
                    emailAddress: email,
                    username: generatedUsername,
                    firstName: name || email.split('@')[0]
                  });
                }
                success = true;
                console.log(`Clerk signup created successfully using cached strategy: ${cachedStrategy}`);
              } catch (cacheErr) {
                console.warn(`Cached strategy ${cachedStrategy} failed, trying all strategies...`, cacheErr);
              }
            }

            if (!success) {
              try {
                // Strategy 1: Create user with email and password
                await signUp.create({
                  emailAddress: email,
                  password,
                  firstName: name || email.split('@')[0]
                });
                localStorage.setItem('hb_clerk_signup_strategy', 'strategy_1');
              } catch (createErr: any) {
                const firstErr = createErr.errors?.[0];
                const errText = (firstErr?.message || firstErr?.longMessage || createErr.message || '').toLowerCase();
                console.log("Strategy 1 signup failed. Error text:", errText);

                if (firstErr && (firstErr.code === 'form_identifier_missing' || errText.includes('username'))) {
                  // Strategy 2: Username required by configuration
                  console.log("Retrying signup with auto-generated username...");
                  const generatedUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);
                  try {
                    await signUp.create({
                      emailAddress: email,
                      password,
                      username: generatedUsername,
                      firstName: name || email.split('@')[0]
                    });
                    localStorage.setItem('hb_clerk_signup_strategy', 'strategy_2');
                  } catch (retryErr: any) {
                    const retryFirstErr = retryErr.errors?.[0];
                    const retryErrText = (retryFirstErr?.message || retryFirstErr?.longMessage || retryErr.message || '').toLowerCase();
                    if (retryErrText.includes('password')) {
                      // Strategy 4: Username required and Passwordless (no password allowed)
                      await signUp.create({
                        emailAddress: email,
                        username: generatedUsername,
                        firstName: name || email.split('@')[0]
                      });
                      localStorage.setItem('hb_clerk_signup_strategy', 'strategy_4');
                    } else {
                      throw retryErr;
                    }
                  }
                } else if (errText.includes('password') && (errText.includes('invalid') || errText.includes('not supported') || errText.includes('unknown') || errText.includes('not enabled'))) {
                  // Strategy 3: Passwordless configuration (no password allowed)
                  console.log("Retrying signup without password (passwordless configuration)...");
                  await signUp.create({
                    emailAddress: email,
                    firstName: name || email.split('@')[0]
                  });
                  localStorage.setItem('hb_clerk_signup_strategy', 'strategy_3');
                } else {
                  throw createErr;
                }
              }
            }
            console.log("Clerk signup created successfully. Preparing email verification...");
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            console.log("Email verification code sent successfully.");
            setVerifyingEmail(true);
          } catch (err: any) {
            console.error("Error creating Clerk sign up:", err);
            const firstError = err.errors && err.errors[0];

            // Detect "email already registered" — covers both plain signup and Google-linked accounts
            const isAlreadyExists = firstError && (
              firstError.code === 'form_identifier_exists' ||
              firstError.code === 'email_address_taken' ||
              firstError.code === 'oauth_email_exists' ||
              (firstError.message || '').toLowerCase().includes('already') ||
              (firstError.longMessage || '').toLowerCase().includes('already')
            );

            if (isAlreadyExists) {
              setAuthError("An account with this email already exists. Please sign in instead.");
            } else if (firstError) {
              setAuthError(firstError.longMessage || firstError.message);
            } else {
              setAuthError(err.message || 'Signup failed. Please try again.');
            }
          } finally {
            setLoadingType(null);
            setIsLoading(false);
          }
          return;
        }

        // Verification phase
        try {
          const result = await signUp.attemptEmailAddressVerification({
            code: verificationCode
          });

          if (result.status === "complete") {
            // Set session active
            await setSignUpActive({ session: result.createdSessionId });

            // Save profile with onboarding data
            const ftVal = heightFt !== null ? heightFt : 5;
            const inVal = heightIn !== null ? heightIn : 6;
            const cmVal = heightCm !== null ? heightCm : 170;
            const yVal = birthYear !== null ? birthYear : 2001;
            const destWeightVal = desiredWeight !== null ? desiredWeight : currentWeight;
            const goalVal = onboardingGoal || 'maintain';

            const finalWeightKg = weightUnit === 'kg' ? currentWeight : Math.round(currentWeight * 0.453592);
            const finalTargetWeightKg = weightUnit === 'kg' ? destWeightVal : Math.round(destWeightVal * 0.453592);
            const finalHeightCm = heightUnit === 'cm' ? cmVal : Math.round((ftVal * 12 + inVal) * 2.54);

            const currentYear = new Date().getFullYear();
            const age = currentYear - yVal;
            let bmr = 10 * finalWeightKg + 6.25 * finalHeightCm - 5 * age;
            if (onboardingSex === 'female') {
              bmr -= 161;
            } else {
              bmr += 5;
            }

            let activityMultiplier = 1.375;
            if (onboardingWorkouts === '0-2') {
              activityMultiplier = 1.2;
            } else if (onboardingWorkouts === '3-5') {
              activityMultiplier = 1.375;
            } else if (onboardingWorkouts === '6+') {
              activityMultiplier = 1.55;
            }

            const tdee = Math.round(bmr * activityMultiplier);
            let targetCalories = tdee;
            if (goalVal === 'lose') {
              targetCalories = Math.round(tdee - 500);
            } else if (goalVal === 'gain') {
              targetCalories = Math.round(tdee + 300);
            }
            if (targetCalories < 1200) targetCalories = 1200;

            const proteinGoal = Math.round(finalWeightKg * 2.0);
            const fatsGoal = Math.round((targetCalories * 0.25) / 9);
            const carbsGoal = Math.round((targetCalories - (proteinGoal * 4 + fatsGoal * 9)) / 4);

            const newProfile: Profile = {
              email: email,
              name: name || email.split('@')[0],
              daily_calorie_goal: targetCalories,
              protein_goal_g: proteinGoal,
              carbs_goal_g: carbsGoal,
              fats_goal_g: fatsGoal,
              weight_kg: finalWeightKg,
              height_cm: finalHeightCm,
              target_weight_kg: finalTargetWeightKg,
              activity_level: onboardingWorkouts === '6+' ? 'very_active' : onboardingWorkouts === '3-5' ? 'moderate' : 'sedentary',
              goal_type: goalVal,
              is_premium: false,
              scans_used: 0,
              premium_until: null,
              current_session_id: result.createdSessionId
            };

            const mappedUserId = clerkIdToUuid(result.createdUserId || '');

            const { error: upsertErr } = await supabase
              .from('hb_profiles')
              .upsert({ id: mappedUserId, ...newProfile });

            if (upsertErr) {
              console.error("Failed to upsert profile:", upsertErr);
            } else {
              if (result.createdSessionId) {
                localStorage.setItem('hb_last_session_id', result.createdSessionId);
              }
            }

            setProfile(newProfile);
            setUser({
              id: mappedUserId,
              email: email,
              clerkId: result.createdUserId
            });
            localStorage.setItem('hb_onboarding_completed', 'true');
            localStorage.setItem('hb_onboarding_sex', onboardingSex || 'other');
            localStorage.setItem('hb_onboarding_workouts', onboardingWorkouts || '3-5');
            localStorage.setItem('hb_onboarding_accomplish', JSON.stringify(onboardingAccomplish));
            localStorage.setItem('hb_onboarding_experience', onboardingExperience || 'no');
            localStorage.setItem('hb_onboarding_add_burned_back', String(addBurnedBack));
            localStorage.setItem('hb_onboarding_rollover_cals', String(rolloverCals));
            localStorage.setItem('hb_onboarding_notification_consent', String(notificationConsent));
            setOnboardingStep(-1);
            setVerifyingEmail(false);
            setVerificationCode('');
          } else {
            setAuthError(`Verification could not be completed. Status: ${result.status}`);
          }
        } catch (err: any) {
          console.error("Error verifying email code:", err);
          if (err.errors && err.errors[0]) {
            setAuthError(err.errors[0].longMessage || err.errors[0].message);
          } else {
            setAuthError(err.message || 'Verification failed.');
          }
        } finally {
          setLoadingType(null);
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error("Error in onboarding signup/login:", err);
      if (err.errors && err.errors[0]) {
        setAuthError(err.errors[0].longMessage || err.errors[0].message);
      } else {
        setAuthError(err.message);
      }
      setIsLoading(false);
    }
  };

  // Render onboarding flow steps
  const renderOnboarding = () => {
    const getProgressPercent = () => {
      if (onboardingStep < 2) return 0;
      if (onboardingStep > 13) return 100;
      const progressMap: Record<number, number> = {
        2: 8,
        3: 16,
        4: 24,
        5: 32,
        6: 40,
        8: 48,
        9: 58,
        10: 67,
        11: 76,
        12: onboardingGoal === 'maintain' ? 65 : 85,
        7: onboardingGoal === 'maintain' ? 80 : 92,
        13: 96,
        14: 100
      };
      return progressMap[onboardingStep] || 0;
    };
    const progressPercent = getProgressPercent();

    const minWeightValue = weightUnit === 'kg' ? 30 : 60;
    const maxWeightValue = weightUnit === 'kg' ? 180 : 400;

    // Create weight scale ticks
    const weightTicks = [];
    for (let i = minWeightValue; i <= maxWeightValue; i++) {
      weightTicks.push(i);
    }

    // Dynamic speed speed rate calculations
    const weightDiff = Math.abs(currentWeight - (desiredWeight ?? currentWeight));
    const rateValue = weightUnit === 'kg'
      ? (goalSpeed === 'slow' ? 0.1 : goalSpeed === 'fast' ? 1.0 : 0.5)
      : (goalSpeed === 'slow' ? 0.2 : goalSpeed === 'fast' ? 2.0 : 1.0);
    const weeksNeeded = rateValue > 0 ? weightDiff / rateValue : 1;
    const monthsNeeded = Math.max(1, Math.ceil(weeksNeeded / 4.33));

    // Dynamic Real-time Calorie Calculation for Speed view
    const currentYear = new Date().getFullYear();
    const age = currentYear - (birthYear ?? 2001);
    const heightValCm = heightUnit === 'cm' ? (heightCm ?? 170) : ((heightFt ?? 5) * 12 + (heightIn ?? 6)) * 2.54;
    const weightValKg = weightUnit === 'kg' ? currentWeight : currentWeight * 0.453592;
    let bmrVal = 10 * weightValKg + 6.25 * heightValCm - 5 * age;
    if (onboardingSex === 'female') {
      bmrVal -= 161;
    } else {
      bmrVal += 5;
    }
    const actMultiplier = onboardingWorkouts === '6+' ? 1.55 : onboardingWorkouts === '3-5' ? 1.375 : 1.2;
    const tdeeVal = Math.round(bmrVal * actMultiplier);

    let speedCalAdjustment = 0;
    if (onboardingGoal === 'lose') {
      speedCalAdjustment = goalSpeed === 'slow' ? -200 : goalSpeed === 'fast' ? -800 : -500;
    } else if (onboardingGoal === 'gain') {
      speedCalAdjustment = goalSpeed === 'slow' ? 150 : goalSpeed === 'fast' ? 500 : 300;
    }
    const dynamicCalorieGoal = Math.max(1200, Math.round(tdeeVal + speedCalAdjustment));

    const toggleObstacle = (item: string) => {
      setObstacles(prev =>
        prev.includes(item) ? prev.filter(o => o !== item) : [...prev, item]
      );
    };

    const continueBtnStyle = (isActive: boolean): React.CSSProperties => ({
      width: '100%',
      padding: '16px',
      borderRadius: '24px',
      background: isActive ? 'var(--text-primary)' : '#e5e7eb',
      color: isActive ? '#fff' : '#9ca3af',
      fontWeight: 700,
      fontSize: '15px',
      boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
      cursor: isActive ? 'pointer' : 'not-allowed',
      marginTop: 'auto',
      marginBottom: '20px',
      flexShrink: 0,
      transition: 'all 0.2s ease'
    });

    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative', width: '100%' }}>
        {/* Confetti Canvas */}
        {onboardingStep === 13 && committed && (
          <canvas
            id="confetti-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 200
            }}
          />
        )}

        {/* Circular Black Swallow Overlay */}
        {onboardingStep === 13 && (isHolding || committed) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            background: committed
              ? '#000000'
              : `radial-gradient(circle at 50% 60%, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.98) ${holdProgress * 1.6}%, rgba(0,0,0,0) ${holdProgress * 1.6 + 18}%)`,
            zIndex: 12,
            transition: 'background 0.05s linear'
          }} />
        )}

        {/* Onboarding Header — hidden on signup screen (step 14) and after commit animation */}
        {onboardingStep >= 2 && onboardingStep <= 13 && !committed && (
          <div style={{ padding: '20px 20px 10px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                if (onboardingStep === 2) {
                  setOnboardingStep(1);
                } else if (onboardingStep === 3) {
                  setOnboardingStep(2);
                } else if (onboardingStep === 4) {
                  setOnboardingStep(3);
                } else if (onboardingStep === 5) {
                  setOnboardingStep(4);
                } else if (onboardingStep === 6) {
                  setOnboardingStep(5);
                } else if (onboardingStep === 8) {
                  setOnboardingStep(6);
                } else if (onboardingStep === 9) {
                  setOnboardingStep(8);
                } else if (onboardingStep === 10) {
                  setOnboardingStep(9);
                } else if (onboardingStep === 11) {
                  setOnboardingStep(10);
                } else if (onboardingStep === 12) {
                  if (onboardingGoal === 'maintain') {
                    setOnboardingStep(8);
                  } else {
                    setOnboardingStep(11);
                  }
                } else if (onboardingStep === 7) {
                  setOnboardingStep(12);
                } else if (onboardingStep === 13) {
                  setOnboardingStep(7);
                } else if (onboardingStep === 14) {
                  setOnboardingStep(13);
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ flex: 1, height: '4px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--text-primary)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Onboarding Screen Body */}
        <div style={{ flex: 1, padding: '16px 20px 24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', overflowY: 'auto', minHeight: 0, boxSizing: 'border-box' }}>

          {/* SCREEN 0: Animated Splash Screen */}
          {onboardingStep === 0 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '24px' }}>
              <div className="logo-splash">
                <HealthyBitLogo size={140} />
              </div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 955,
                background: 'linear-gradient(135deg, #10B981 0%, #2563EB 50%, #F97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px'
              }}>
                HealthyBit
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
                Scan. Track. Thrive.
              </p>
            </div>
          )}

          {/* SCREEN 1: Welcome Intro (Photo 1) */}
          {onboardingStep === 1 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', alignItems: 'center', width: '100%', flex: 1, justifyContent: 'center' }}>
              {/* CSS Phone frame mockup */}
              <div style={{
                width: '180px',
                height: '320px',
                borderRadius: '32px',
                border: '6px solid var(--text-primary)',
                background: '#eef2f6',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Simulated Camera View */}
                <div style={{
                  flex: 1,
                  position: 'relative',
                  background: 'linear-gradient(to bottom, #dbeafe, #bfdbfe)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {/* Laser line overlay */}
                  <div className="laser-scan-line" />

                  {/* Food Plate SVG */}
                  <svg width="110" height="110" viewBox="0 0 100 100">
                    {/* White plate */}
                    <circle cx="50" cy="50" r="42" fill="#ffffff" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.08))" />
                    {/* Inner plate circle */}
                    <circle cx="50" cy="50" r="32" fill="#f8fafc" stroke="#f1f5f9" strokeWidth="1.5" />

                    {/* Sandwich */}
                    <path d="M28 45 L52 28 L52 62 Z" fill="#b45309" />
                    <path d="M30 44 L50 30 L50 58 Z" fill="#fef08a" />
                    <path d="M31 43 L48 31 L48 36 Z" fill="#22c55e" />
                    <path d="M36 39 L45 34 L45 42 Z" fill="#ef4444" />

                    {/* Chips */}
                    <circle cx="68" cy="46" r="6" fill="#facc15" opacity="0.9" />
                    <circle cx="60" cy="56" r="6" fill="#fbbf24" opacity="0.95" />
                    <circle cx="70" cy="62" r="5" fill="#facc15" opacity="0.85" />
                    <circle cx="62" cy="42" r="5" fill="#f59e0b" opacity="0.9" />
                  </svg>

                  {/* Scanning Bracket Overlays */}
                  <div style={{ position: 'absolute', top: '25%', left: '20%', width: '12px', height: '12px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff' }} />
                  <div style={{ position: 'absolute', top: '25%', right: '20%', width: '12px', height: '12px', borderTop: '2px solid #fff', borderRight: '2px solid #fff' }} />
                  <div style={{ position: 'absolute', bottom: '25%', left: '20%', width: '12px', height: '12px', borderBottom: '2px solid #fff', borderLeft: '2px solid #fff' }} />
                  <div style={{ position: 'absolute', bottom: '25%', right: '20%', width: '12px', height: '12px', borderBottom: '2px solid #fff', borderRight: '2px solid #fff' }} />

                  {/* Scanning Badge Overlay 1 */}
                  <div style={{
                    position: 'absolute',
                    top: '12%',
                    left: '6%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                    Sandwich • 350 kcal
                  </div>

                  {/* Scanning Badge Overlay 2 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12%',
                    right: '6%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                    Chips • 150 kcal
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginTop: '10px' }}>
                Calorie tracking made easy
              </h2>

              {/* Button */}
              <button
                onClick={() => setOnboardingStep(2)}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '24px',
                  background: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '15px',
                  marginTop: 'auto',
                  marginBottom: '10px',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
                }}
              >
                Get Started
              </button>

              <button
                onClick={() => { setAuthMode('login'); setOnboardingStep(14); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}

          {/* SCREEN 2: Choose your sex (Photo 3) */}
          {onboardingStep === 2 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  Choose your sex
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This helps personalize your experience.
                </p>
              </div>

              {/* Options list, staggered item anim */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 'auto 0' }}>
                <div
                  onClick={() => setOnboardingSex('male')}
                  className="animate-option delay-100"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: onboardingSex === 'male' ? 'var(--text-primary)' : 'var(--glass-border)',
                    background: onboardingSex === 'male' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(37, 99, 235, 0.08)',
                      color: 'var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={18} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Male</span>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: onboardingSex === 'male' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: onboardingSex === 'male' ? 'var(--text-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    {onboardingSex === 'male' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>

                <div
                  onClick={() => setOnboardingSex('female')}
                  className="animate-option delay-200"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: onboardingSex === 'female' ? 'var(--text-primary)' : 'var(--glass-border)',
                    background: onboardingSex === 'female' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--accent-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={18} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Female</span>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: onboardingSex === 'female' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: onboardingSex === 'female' ? 'var(--text-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    {onboardingSex === 'female' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>

                <div
                  onClick={() => setOnboardingSex('other')}
                  className="animate-option delay-300"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: onboardingSex === 'other' ? 'var(--text-primary)' : 'var(--glass-border)',
                    background: onboardingSex === 'other' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={18} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Other</span>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: onboardingSex === 'other' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: onboardingSex === 'other' ? 'var(--text-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    {onboardingSex === 'other' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>
              </div>

              {/* Continue button spaced at the bottom */}
              <button
                disabled={!onboardingSex}
                onClick={() => setOnboardingStep(3)}
                className="btn-primary"
                style={continueBtnStyle(!!onboardingSex)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 3: How many workouts do you do per week? (Photo 2) */}
          {onboardingStep === 3 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  How many workouts do you do per week?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This helps calculate your daily calorie budget.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 'auto 0' }}>
                {[
                  { id: '0-2', label: '0-2 workouts', desc: 'Sedentary or light activity' },
                  { id: '3-5', label: '3-5 workouts', desc: 'Moderately active' },
                  { id: '6+', label: '6+ workouts', desc: 'Very active / Athlete' }
                ].map((item, index) => {
                  const isSelected = onboardingWorkouts === item.id;
                  const delayClass = index === 0 ? 'delay-100' : index === 1 ? 'delay-200' : 'delay-300';
                  return (
                    <div
                      key={item.id}
                      onClick={() => setOnboardingWorkouts(item.id as any)}
                      className={`animate-option ${delayClass}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--glass-border)',
                        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(37, 99, 235, 0.08)',
                          color: 'var(--accent-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Flame size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</span>
                        </div>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        background: isSelected ? 'var(--text-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={!onboardingWorkouts}
                onClick={() => setOnboardingStep(4)}
                className="btn-primary"
                style={continueBtnStyle(!!onboardingWorkouts)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 4: What is your height? */}
          {onboardingStep === 4 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  What is your height?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This will be taken into account when calculating your daily nutrition goals.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', margin: 'auto 0' }}>
                {/* Custom unit toggle switcher capsule */}
                <div style={{
                  display: 'flex',
                  background: '#e5e7eb',
                  borderRadius: '20px',
                  padding: '4px',
                  width: '180px',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <div
                    onClick={() => setHeightUnit('ft')}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: heightUnit === 'ft' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: heightUnit === 'ft' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    ft in
                  </div>
                  <div
                    onClick={() => setHeightUnit('cm')}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: heightUnit === 'cm' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: heightUnit === 'cm' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    cm
                  </div>
                </div>

                {/* Interactive Wheel Columns */}
                {heightUnit === 'ft' ? (
                  <div className="wheel-picker-container animate-option delay-100" style={{ width: '100%' }}>
                    <div className="wheel-picker-highlight" />
                    {/* Feet picker */}
                    <div className="wheel-picker-column" ref={heightFtRef} onScroll={handleHeightFtScroll}>
                      {ftOptions.map((ft) => (
                        <div
                          key={ft}
                          onClick={() => handleFtClick(ft)}
                          className={`wheel-picker-item ${heightFt === ft ? 'active' : 'inactive'}`}
                        >
                          {ft} ft
                        </div>
                      ))}
                    </div>
                    {/* Inches picker */}
                    <div className="wheel-picker-column" ref={heightInRef} onScroll={handleHeightInScroll}>
                      {inOptions.map((inch) => (
                        <div
                          key={inch}
                          onClick={() => handleInClick(inch)}
                          className={`wheel-picker-item ${heightIn === inch ? 'active' : 'inactive'}`}
                        >
                          {inch} in
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="wheel-picker-container animate-option delay-100" style={{ width: '100%' }}>
                    <div className="wheel-picker-highlight" />
                    <div className="wheel-picker-column" ref={heightCmRef} onScroll={handleHeightCmScroll}>
                      {cmOptions.map((cm) => (
                        <div
                          key={cm}
                          onClick={() => handleCmClick(cm)}
                          className={`wheel-picker-item ${heightCm === cm ? 'active' : 'inactive'}`}
                        >
                          {cm} cm
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setOnboardingStep(5)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 5: What is your weight? */}
          {onboardingStep === 5 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  What is your weight?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This will be taken into account when calculating your daily nutrition goals.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', margin: 'auto 0' }}>
                {/* Lbs/Kg Toggle */}
                <div style={{
                  display: 'flex',
                  background: '#e5e7eb',
                  borderRadius: '20px',
                  padding: '4px',
                  width: '180px',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <div
                    onClick={() => {
                      if (weightUnit !== 'lbs') {
                        setWeightUnit('lbs');
                        setCurrentWeight(Math.round(currentWeight * 2.20462));
                        if (desiredWeight !== null) {
                          setDesiredWeight(Math.round(desiredWeight * 2.20462));
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: weightUnit === 'lbs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: weightUnit === 'lbs' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    lbs
                  </div>
                  <div
                    onClick={() => {
                      if (weightUnit !== 'kg') {
                        setWeightUnit('kg');
                        setCurrentWeight(Math.round(currentWeight / 2.20462));
                        if (desiredWeight !== null) {
                          setDesiredWeight(Math.round(desiredWeight / 2.20462));
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: weightUnit === 'kg' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: weightUnit === 'kg' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    kg
                  </div>
                </div>

                {/* Weight value display */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Current Weight
                  </span>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {currentWeight}.0 <span style={{ fontSize: '18px', fontWeight: 700 }}>{weightUnit}</span>
                  </span>
                </div>

                {/* Interactive scale tick ruler */}
                <div className="ruler-container-outer animate-option delay-100">
                  <div className="ruler-pointer" />
                  <div
                    id="weight-ruler-scroll"
                    className="ruler-scroll-container"
                    onScroll={handleWeightScroll}
                  >
                    <div className="ruler-padding" />
                    {weightTicks.map((tick) => (
                      <div
                        key={tick}
                        className={`ruler-tick-wrapper ${tick % 5 === 0 ? 'major' : ''}`}
                      >
                        <div className="ruler-tick-line" />
                        {tick % 5 === 0 && (
                          <span className="ruler-tick-label">{tick}</span>
                        )}
                      </div>
                    ))}
                    <div className="ruler-padding" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOnboardingStep(6)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 8: What is your goal? */}
          {onboardingStep === 8 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  What is your goal?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This helps us generate a plan for your calorie intake.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: 'auto 0' }}>
                {[
                  { id: 'lose', label: 'Lose Weight', icon: '↓' },
                  { id: 'maintain', label: 'Maintain', icon: '—' },
                  { id: 'gain', label: 'Gain Weight', icon: '↑' }
                ].map((item, index) => {
                  const isSelected = onboardingGoal === item.id;
                  const delayClass = index === 0 ? 'delay-100' : index === 1 ? 'delay-200' : 'delay-300';
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setOnboardingGoal(item.id as any);
                        if (item.id === 'lose') {
                          setDesiredWeight(currentWeight - 10);
                        } else if (item.id === 'gain') {
                          setDesiredWeight(currentWeight + 10);
                        } else {
                          setDesiredWeight(currentWeight);
                        }
                      }}
                      className={`animate-option ${delayClass}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--glass-border)',
                        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: item.id === 'lose' ? 'rgba(239, 68, 68, 0.08)' : item.id === 'gain' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(37, 99, 235, 0.08)',
                          color: item.id === 'lose' ? 'var(--accent-red)' : item.id === 'gain' ? 'var(--accent-green)' : 'var(--accent-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 800
                        }}>
                          {item.icon}
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</span>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        background: isSelected ? 'var(--text-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={!onboardingGoal}
                onClick={() => {
                  if (onboardingGoal === 'maintain') {
                    setOnboardingStep(12);
                  } else {
                    setOnboardingStep(9);
                  }
                }}
                className="btn-primary"
                style={continueBtnStyle(!!onboardingGoal)}
              >
                Continue
              </button>
            </div>
          )}



          {/* SCREEN 9: What is your desired weight? (Photo New 1) */}
          {onboardingStep === 9 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  What is your desired weight?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500, textTransform: 'capitalize' }}>
                  {onboardingGoal} Weight
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', margin: 'auto 0' }}>
                {/* Lbs/Kg Toggle */}
                <div style={{
                  display: 'flex',
                  background: '#e5e7eb',
                  borderRadius: '20px',
                  padding: '4px',
                  width: '180px',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <div
                    onClick={() => {
                      if (weightUnit !== 'lbs') {
                        setWeightUnit('lbs');
                        setCurrentWeight(Math.round(currentWeight * 2.20462));
                        setDesiredWeight(Math.round((desiredWeight ?? currentWeight) * 2.20462));
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: weightUnit === 'lbs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: weightUnit === 'lbs' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    lbs
                  </div>
                  <div
                    onClick={() => {
                      if (weightUnit !== 'kg') {
                        setWeightUnit('kg');
                        setCurrentWeight(Math.round(currentWeight / 2.20462));
                        setDesiredWeight(Math.round((desiredWeight ?? currentWeight) / 2.20462));
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: weightUnit === 'kg' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: weightUnit === 'kg' ? '#ffffff' : 'transparent',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      zIndex: 2
                    }}
                  >
                    kg
                  </div>
                </div>

                {/* Desired weight value display */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Desired Weight
                  </span>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {desiredWeight}.0 <span style={{ fontSize: '18px', fontWeight: 700 }}>{weightUnit}</span>
                  </span>
                </div>

                {/* Interactive scale tick ruler for desired weight */}
                <div className="ruler-container-outer animate-option delay-100">
                  <div className="ruler-pointer" />
                  <div
                    id="desired-weight-ruler-scroll"
                    className="ruler-scroll-container"
                    onScroll={handleDesiredWeightScroll}
                  >
                    <div className="ruler-padding" />
                    {weightTicks.map((tick) => (
                      <div
                        key={tick}
                        className={`ruler-tick-wrapper ${tick % 5 === 0 ? 'major' : ''}`}
                      >
                        <div className="ruler-tick-line" />
                        {tick % 5 === 0 && (
                          <span className="ruler-tick-label">{tick}</span>
                        )}
                      </div>
                    ))}
                    <div className="ruler-padding" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOnboardingStep(10)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 10: Dynamic Motivation Checkpoint (Photo New 2) */}
          {onboardingStep === 10 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div style={{ textAlign: 'center', margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  marginBottom: '10px'
                }}>
                  ✓
                </div>

                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                  {onboardingGoal === 'lose' ? 'Losing' : 'Gaining'} <span style={{ color: 'var(--accent-orange)' }}>{weightDiff}.0 {weightUnit}</span> is a realistic target. it's not hard at all!
                </h2>

                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, maxWidth: '280px', margin: '0 auto', lineHeight: 1.5 }}>
                  80% of users say that the change is obvious after using HealthyBit and it is not easy to rebound.
                </p>
              </div>

              <button
                onClick={() => setOnboardingStep(11)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 11: Goal Speed Screen (Photo New 3) */}
          {onboardingStep === 11 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  How fast do you want to reach your goal?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  Weight {onboardingGoal === 'lose' ? 'loss' : 'gain'} speed per week
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: 'auto 0' }}>
                <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {rateValue}.0 <span style={{ fontSize: '16px', fontWeight: 700 }}>{weightUnit}</span>
                </div>

                {/* 3 columns selection cards */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'slow', label: 'Slow', icon: '🦥', desc: weightUnit === 'kg' ? '0.1 kg' : '0.2 lbs' },
                    { id: 'recommended', label: 'Recommended', icon: '🐇', desc: weightUnit === 'kg' ? '0.5 kg' : '1.0 lbs' },
                    { id: 'fast', label: 'Fast', icon: '🐆', desc: weightUnit === 'kg' ? '1.0 kg' : '2.0 lbs' }
                  ].map((speed, index) => {
                    const isSelected = goalSpeed === speed.id;
                    const delayClass = index === 0 ? 'delay-100' : index === 1 ? 'delay-200' : 'delay-300';
                    return (
                      <div
                        key={speed.id}
                        onClick={() => setGoalSpeed(speed.id as any)}
                        className={`animate-option ${delayClass}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '16px 8px',
                          borderRadius: '20px',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--text-primary)' : 'var(--glass-border)',
                          background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '24px', marginBottom: '8px' }}>{speed.icon}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>{speed.label}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{speed.desc}/wk</span>
                      </div>
                    );
                  })}
                </div>

                {/* dynamic duration info card */}
                <div
                  className="animate-option delay-400"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    You will reach your goal in <span style={{ color: 'var(--accent-orange)' }}>{monthsNeeded} {monthsNeeded === 1 ? 'month' : 'months'}</span>
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                    {goalSpeed === 'slow' && 'Going slow means a gentler and more sustainable daily caloric goal.'}
                    {goalSpeed === 'recommended' && 'Going at a recommended pace balances consistency with sustainable daily caloric goals.'}
                    {goalSpeed === 'fast' && 'Going fast requires higher discipline and a stricter daily caloric goal.'}
                  </p>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '12px 0' }} />
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Daily calorie goal: <span style={{ color: 'var(--accent-green)' }}>{dynamicCalorieGoal} cal</span>
                  </p>
                </div>
              </div>

              <button
                disabled={!goalSpeed}
                onClick={() => setOnboardingStep(12)}
                className="btn-primary"
                style={continueBtnStyle(!!goalSpeed)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 12: Obstacles Screen (Photo New 4) */}
          {onboardingStep === 12 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  What's stopping you from reaching your goals?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  Select all that apply.
                </p>
              </div>

              {/* Staggered lists of items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: 'auto 0' }}>
                {[
                  { label: 'Lack of consistency', icon: '📈' },
                  { label: 'Unhealthy eating habits', icon: '🍕' },
                  { label: 'Lack of support', icon: '👥' },
                  { label: 'Busy schedule', icon: '⏰' },
                  { label: 'Lack of meal inspiration', icon: '🍳' }
                ].map((item, index) => {
                  const isSelected = obstacles.includes(item.label);
                  const delayClass = `delay-${(index + 1) * 100}`;
                  return (
                    <div
                      key={item.label}
                      onClick={() => toggleObstacle(item.label)}
                      className={`animate-option ${delayClass}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--glass-border)',
                        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</span>
                      </div>

                      {/* Check radio indicator */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        background: isSelected ? 'var(--text-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={obstacles.length === 0}
                onClick={() => setOnboardingStep(7)}
                className="btn-primary"
                style={continueBtnStyle(obstacles.length > 0)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 6: When were you born? */}
          {onboardingStep === 6 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  When were you born?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                  This will be taken into account when calculating your daily nutrition goals.
                </p>
              </div>

              <div className="wheel-picker-container animate-option delay-100" style={{ margin: 'auto 0' }}>
                <div className="wheel-picker-highlight" />

                {/* Month Picker Column */}
                <div className="wheel-picker-column" ref={birthMonthRef} onScroll={handleBirthMonthScroll}>
                  {months.map((m) => (
                    <div
                      key={m}
                      onClick={() => handleBirthMonthClick(m)}
                      className={`wheel-picker-item ${birthMonth === m ? 'active' : 'inactive'}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>

                {/* Day Picker Column */}
                <div className="wheel-picker-column" ref={birthDayRef} onScroll={handleBirthDayScroll}>
                  {days.map((d) => (
                    <div
                      key={d}
                      onClick={() => handleBirthDayClick(d)}
                      className={`wheel-picker-item ${birthDay === d ? 'active' : 'inactive'}`}
                    >
                      {String(d).padStart(2, '0')}
                    </div>
                  ))}
                </div>

                {/* Year Picker Column */}
                <div className="wheel-picker-column" ref={birthYearRef} onScroll={handleBirthYearScroll}>
                  {years.map((y) => (
                    <div
                      key={y}
                      onClick={() => handleBirthYearClick(y)}
                      className={`wheel-picker-item ${birthYear === y ? 'active' : 'inactive'}`}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOnboardingStep(8)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 7: Thank You Screen (New) */}
          {onboardingStep === 7 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%' }}>
              <div style={{ textAlign: 'center', margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                {/* Brand Logo Wrapper */}
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '36px',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.05)',
                  border: '1px solid var(--glass-border)',
                  animation: 'pulseGlow 3s infinite'
                }}>
                  <HealthyBitLogo size={80} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    background: 'linear-gradient(135deg, #10B981 0%, #2563EB 50%, #F97316 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    HealthyBit
                  </span>
                  <h2 style={{ fontSize: '28px', fontWeight: 955, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                    Thank you for trusting us!
                  </h2>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 550, maxWidth: '290px', margin: '0 auto', lineHeight: 1.6 }}>
                  Now let's personalize HealthyBit for you. We will tailor your daily budget and nutrition plan.
                </p>
              </div>

              <button
                onClick={() => setOnboardingStep(13)}
                className="btn-primary"
                style={continueBtnStyle(true)}
              >
                Continue
              </button>
            </div>
          )}

          {/* SCREEN 13: Commit (New Hold-to-Commit) */}
          {onboardingStep === 13 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <div style={{ textAlign: 'center', margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 25 }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 955,
                  color: isHolding || committed ? '#ffffff' : 'var(--text-primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.25,
                  transition: 'color 1.2s ease'
                }}>
                  {committed ? 'YOU ARE COMMITTED!' : isHolding ? 'Keep holding!' : 'Are you ready to commit?'}
                </h2>
                <p style={{
                  color: isHolding || committed ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
                  fontSize: '15px',
                  fontWeight: 550,
                  maxWidth: '285px',
                  margin: '0 auto',
                  lineHeight: 1.6,
                  transition: 'color 1.2s ease'
                }}>
                  {committed
                    ? 'Your journey with HealthyBit has officially started. Let\'s build healthy habits together!'
                    : `Commit to your goal of ${onboardingGoal === 'lose' ? 'losing' : onboardingGoal === 'gain' ? 'gaining' : 'maintaining'} weight and unlock your potential!`}
                </p>

                {committed && (
                  <div className="animate-scale-up" style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                    <Handshake size={60} style={{ color: '#10b981', filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))' }} />
                  </div>
                )}

                {/* Interactive hold progress circle */}
                <div
                  onMouseDown={startHold}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                  onTouchStart={startHold}
                  onTouchEnd={stopHold}
                  style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: committed ? '#10b981' : '#000000',
                    border: committed ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative',
                    transition: 'background-color 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s',
                    boxShadow: committed
                      ? '0 12px 24px rgba(16, 185, 129, 0.35)'
                      : isHolding
                        ? '0 16px 32px rgba(0, 0, 0, 0.3)'
                        : '0 8px 24px rgba(0, 0, 0, 0.06)',
                    transform: isHolding ? 'scale(0.95)' : 'scale(1)',
                    zIndex: 25
                  }}
                >
                  {/* SVG progress border */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '140px', height: '140px', transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="70"
                      cy="70"
                      r="65"
                      stroke={isHolding ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                      strokeWidth="6"
                      fill="none"
                      style={{ transition: isHolding ? 'stroke 1.5s linear' : 'stroke 0.3s ease' }}
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="65"
                      stroke={committed ? '#10b981' : isHolding ? '#10b981' : 'url(#logoGrad)'}
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={408.4}
                      strokeDashoffset={408.4 - (408.4 * holdProgress) / 100}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s' }}
                    />
                  </svg>

                  {committed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', gap: '2px', animation: 'scaleUp 0.3s', zIndex: 5 }}>
                      <Handshake size={36} style={{ color: '#ffffff' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Committed</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', zIndex: 5 }}>
                      <HealthyBitLogo size={32} />
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        transition: 'color 0.3s ease'
                      }}>
                        {isHolding ? 'Holding...' : 'Hold to'}
                      </span>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 900,
                        color: '#ffffff',
                        letterSpacing: '0.5px',
                        transition: 'color 0.3s ease'
                      }}>
                        COMMIT
                      </span>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '12px', fontWeight: 700, color: isHolding ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)', transition: 'all 0.2s', opacity: isHolding ? 1 : 0.7, zIndex: 25 }}>
                  {isHolding ? 'Keep holding!' : 'Press and hold the button above'}
                </span>
              </div>

              <div style={{ height: '56px' }} />
            </div>
          )}

          {/* SCREEN 14: SignUp/Login Gateway */}
          {onboardingStep === 14 && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>

              {authMode === 'forgot' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                    <HealthyBitLogo size={60} />
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #2563EB 50%, #F97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Reset Password
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
                    {verifyingReset
                      ? 'Enter the 6-digit code sent to your email and your new password.'
                      : 'Enter your email address and we\'ll send you a recovery code to reset your password.'}
                  </p>

                  {verifyingReset ? (
                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="6-digit Reset Code"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="glass-input"
                        required
                      />
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="New Password (min 6 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', paddingRight: '45px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {authError && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--accent-red)', fontSize: '12px' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{authError}</span>
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading}>
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setVerifyingReset(false);
                          setResetSent(false);
                          setAuthMode('login');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          marginTop: '10px'
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input"
                        required
                      />

                      {authError && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--accent-red)', fontSize: '12px' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span>{authError}</span>
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading}>
                        {isLoading ? 'Sending Code...' : 'Send Reset Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthMode('login');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          marginTop: '10px'
                        }}
                      >
                        Back to Sign In
                      </button>
                    </form>
                  )}
                </>
              ) : verifyingEmail ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                    <HealthyBitLogo size={60} />
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #2563EB 50%, #F97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Verify Email
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
                    We've sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to {authMode === 'login' ? 'sign in' : 'complete your registration'}.
                  </p>

                  <form onSubmit={handleOnboardingSignup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 6-Digit OTP Verification Code Input */}
                    <div style={{ margin: '15px 0', position: 'relative', height: '52px' }}>
                      <style>{`
                        @keyframes otp-blink {
                          0%, 100% { opacity: 1; }
                          50% { opacity: 0; }
                        }
                      `}</style>
                      {/* The real input is layered directly over the boxes, but fully transparent */}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                          setVerificationCode(val);
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          zIndex: 10,
                          cursor: 'pointer',
                          outline: 'none',
                          border: 'none',
                          background: 'transparent'
                        }}
                      />

                      {/* Visual Boxes Grid */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '8px',
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 5,
                        pointerEvents: 'none'
                      }}>
                        {Array.from({ length: 6 }).map((_, index) => {
                          const char = verificationCode[index] || '';
                          const isActive = index === Math.min(verificationCode.length, 5) && isInputFocused;
                          const isFilled = char !== '';
                          
                          return (
                            <div
                              key={index}
                              style={{
                                flex: 1,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '12px',
                                border: isActive 
                                  ? '2px solid var(--accent-blue)' 
                                  : (isFilled ? '1.5px solid rgba(0, 0, 0, 0.25)' : '1.5px solid rgba(0, 0, 0, 0.1)'),
                                background: isActive 
                                  ? 'rgba(59, 130, 246, 0.06)' 
                                  : 'rgba(0, 0, 0, 0.02)',
                                boxShadow: isActive ? '0 0 8px rgba(59, 130, 246, 0.15)' : 'none',
                                transition: 'all 0.15s ease-in-out',
                                position: 'relative'
                              }}
                            >
                              <span style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#1f2937'
                              }}>
                                {char}
                              </span>

                              {/* Blinking cursor for the active field if it has no character */}
                              {isActive && char === '' && (
                                <div style={{
                                  width: '2px',
                                  height: '20px',
                                  background: 'var(--accent-blue)',
                                  animation: 'otp-blink 1s step-end infinite'
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {authError && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--accent-red)', fontSize: '12px' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{authError}</span>
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading || verificationCode.length < 6}>
                      {isLoading ? 'Verifying...' : (authMode === 'login' ? 'Verify & Sign In' : 'Verify & Continue')}
                    </button>
                  </form>

                  {/* Resend OTP with 60-second timer */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                    {/* Circular countdown ring */}
                    <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background ring */}
                        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4" />
                        {/* Countdown ring */}
                        <circle
                          cx="28" cy="28" r="22" fill="none"
                          stroke={otpTimer > 0 ? '#2563EB' : '#10B981'}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 22}`}
                          strokeDashoffset={`${2 * Math.PI * 22 * (1 - otpTimer / 60)}`}
                          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                        />
                      </svg>
                      {/* Center text */}
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700,
                        color: otpTimer > 0 ? '#2563EB' : '#10B981'
                      }}>
                        {otpTimer > 0 ? otpTimer : '✓'}
                      </div>
                    </div>

                    {otpTimer > 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Resend code in <strong>{otpTimer}s</strong>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #2563EB 100%)',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 20px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      >
                        {isLoading ? 'Sending...' : '🔁 Resend Code'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setAuthError('');
                      setVerifyingEmail(false);
                      setVerificationCode('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: '10px'
                    }}
                  >
                    {authMode === 'login' ? 'Back to Sign In' : 'Back to Sign Up'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                    <HealthyBitLogo size={60} />
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #2563EB 50%, #F97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {authMode === 'login' ? 'Welcome Back' : 'Join HealthyBit'}
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
                    {authMode === 'login' ? 'Sign in to access your logs and daily budget.' : 'Create your account to save your progress securely.'}
                  </p>

                  <form onSubmit={handleOnboardingSignup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {authMode !== 'login' && (
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="glass-input"
                        required
                      />
                    )}
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input"
                      required
                    />
                    {authMode !== 'login' && (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password (min 6 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', paddingRight: '45px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}

                    {authError && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--accent-red)', fontSize: '12px' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{authError}</span>
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoading}>
                      {isLoading && loadingType === 'email'
                        ? (authMode === 'login' ? 'Signing In...' : 'Creating Account...')
                        : (authMode === 'login' ? 'Sign In & Start' : 'Sign Up & Start')
                      }
                    </button>
                    <div style={{
                      marginTop: '10px',
                      background: 'rgba(59, 130, 246, 0.06)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#a0c4ff',
                      lineHeight: '1.4',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '14px' }}>💡</span>
                      <span><strong>Fastest Login:</strong> Clerk email verification codes may take up to 60s. We highly recommend using <strong>Continue with Google</strong> below for instant access!</span>
                    </div>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.08)' }} />
                    <span style={{ margin: '0 10px', fontSize: '12px', color: 'rgba(0, 0, 0, 0.4)', fontWeight: 500 }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.08)' }} />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      borderRadius: '14px',
                      border: '1.5px solid rgba(0, 0, 0, 0.08)',
                      background: '#ffffff',
                      color: '#1f2937',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.border = '1.5px solid rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.06)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.border = '1.5px solid rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    <GoogleIcon size={22} />
                    {isLoading && loadingType === 'google' ? 'Redirecting...' : 'Continue with Google'}
                  </button>

                  <button
                    onClick={() => {
                      setAuthError('');
                      setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: '4px'
                    }}
                  >
                    {authMode === 'login'
                      ? "New to HealthyBit? Create an account"
                      : "Already have an account? Sign in"
                    }
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    );
  };

  // Helper values for Daily Calculations
  const dateLogFilter = (log: FoodLog) => {
    const logDate = new Date(log.logged_at);
    return logDate.getDate() === selectedDate.getDate() &&
      logDate.getMonth() === selectedDate.getMonth() &&
      logDate.getFullYear() === selectedDate.getFullYear();
  };

  const dailyLogs = foodLogs.filter(dateLogFilter);
  const caloriesConsumed = dailyLogs.reduce((sum, item) => sum + item.calories, 0);
  const proteinConsumed = dailyLogs.reduce((sum, item) => sum + item.protein_g, 0);
  const carbsConsumed = dailyLogs.reduce((sum, item) => sum + item.carbs_g, 0);
  const fatsConsumed = dailyLogs.reduce((sum, item) => sum + item.fats_g, 0);

  const caloriesRemaining = Math.max(0, profile.daily_calorie_goal - caloriesConsumed);
  const proteinRemaining = Math.max(0, profile.protein_goal_g - proteinConsumed);
  const carbsRemaining = Math.max(0, profile.carbs_goal_g - carbsConsumed);
  const fatsRemaining = Math.max(0, profile.fats_goal_g - fatsConsumed);

  // Calorie ring parameters
  const ringRadius = 55;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const caloriePercent = Math.min(100, (caloriesConsumed / profile.daily_calorie_goal) * 100);
  const strokeDashoffset = ringCircumference - (caloriePercent / 100) * ringCircumference;

  if (sessionConflict) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '24px',
          padding: '40px 24px 32px 24px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)'
          }}>
            <AlertCircle size={32} style={{ color: '#ef4444' }} />
          </div>
          
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', margin: 0, letterSpacing: '-0.025em' }}>
              Session Conflict Detected
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '12px', lineHeight: '1.6' }}>
              Another device has logged into this account. To keep your data secure, this session has been disconnected.
            </p>
          </div>

          <button
            onClick={async () => {
              setSessionConflict(false);
              await handleLogout();
            }}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              padding: '14px 28px',
              borderRadius: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s',
              width: '100%',
              fontFamily: 'inherit'
            }}
          >
            Understood & Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (onboardingStep !== -1) {
    return renderOnboarding();
  }

  return (
    <div className="app-container">

      {/* Main Content Area */}
      <div className="app-content">
        {/* Navigation router views */}
        {activeTab === 'home' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Title with month/year */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    background: profile.is_premium
                      ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                      : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    AI Calorie
                  </h1>
                  {profile.is_premium && (
                    <span style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)',
                      letterSpacing: '0.5px'
                    }}>
                      Pro
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Track Your Daily Goals</p>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.3px'
                }}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long' })}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  {selectedDate.getFullYear()}
                </span>
              </div>
            </div>

            {/* Date Calendar Picker */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {datesList.map((d, index) => {
                const isActive = d.getDate() === selectedDate.getDate();
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(d)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px',
                      borderRadius: '16px',
                      minWidth: '50px',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                      background: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {dayNames[d.getDay()]}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>
                      {d.getDate()}
                    </span>
                    {isToday && !isActive && (
                      <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                        marginTop: '3px'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calorie Ring Progress Card */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800 }}>{profile.daily_calorie_goal} cal</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Calorie Goal</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', marginTop: '8px', fontSize: '14px', fontWeight: 500 }}>
                  <Apple size={16} color="var(--accent-blue)" />
                  <span>{caloriesConsumed} consumed</span>
                </div>
              </div>

              {/* SVG Circular Ring */}
              <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="65"
                    cy="65"
                    r={ringRadius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="65"
                    cy="65"
                    r={ringRadius}
                    fill="transparent"
                    stroke="var(--accent-blue)"
                    strokeWidth="10"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800 }}>{caloriesRemaining}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Remaining</span>
                </div>
              </div>
            </div>

            {/* AI Nutrition Coach Chat Promo Banner */}
            <div
              onClick={() => setShowAICoach(true)}
              className="glass-card"
              style={{
                background: profile.is_premium
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(249,115,22,0.05) 100%)',
                borderColor: profile.is_premium
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: profile.is_premium ? 'var(--accent-yellow)' : 'var(--accent-blue)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: profile.is_premium
                    ? '0 0 15px rgba(245, 158, 11, 0.5)'
                    : '0 0 15px var(--accent-blue-glow)'
                }}>
                  <Sparkles size={20} color="#fff" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Chat with your AI Coach</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Get tips on diet plans, workout fuel, and macros</p>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </div>

            {/* Macros Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Protein</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-red)', background: 'var(--accent-red-glow)', padding: '2px 6px', borderRadius: '8px' }}>Macro</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>{proteinRemaining}g</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>left of {profile.protein_goal_g}g</span>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-red)', width: `${Math.min(100, (proteinConsumed / profile.protein_goal_g) * 100)}%`, transition: 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                </div>
              </div>

              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Carbs</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-yellow)', background: 'var(--accent-yellow-glow)', padding: '2px 6px', borderRadius: '8px' }}>Macro</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>{carbsRemaining}g</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>left of {profile.carbs_goal_g}g</span>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-yellow)', width: `${Math.min(100, (carbsConsumed / profile.carbs_goal_g) * 100)}%`, transition: 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                </div>
              </div>

              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Fats</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '2px 6px', borderRadius: '8px' }}>Macro</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>{fatsRemaining}g</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>left of {profile.fats_goal_g}g</span>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-green)', width: `${Math.min(100, (fatsConsumed / profile.fats_goal_g) * 100)}%`, transition: 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                </div>
              </div>
            </div>

            {/* Recently Logged Foods List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Today's Meals</h3>
                {dailyLogs.length > 2 && (
                  <button
                    onClick={() => setShowAllFoods(prev => !prev)}
                    style={{
                      background: showAllFoods ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.12)',
                      border: showAllFoods ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(37,99,235,0.2)',
                      color: showAllFoods ? 'var(--accent-red)' : 'var(--accent-blue)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {showAllFoods ? '✕ Close' : `See All (${dailyLogs.length})`}
                  </button>
                )}
              </div>
              {dailyLogs.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-secondary)' }}>
                  <Apple size={32} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--text-tertiary)' }} />
                  <p style={{ fontSize: '13px' }}>No meals logged for this day yet.</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Tap the + button to scan food or describe ingredients.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(showAllFoods ? dailyLogs : dailyLogs.slice(0, 2)).map((log, index) => {
                    const logTime = new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={index} className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', animation: 'fadeIn 0.3s ease-out' }}>
                        {log.image_url ? (
                          <img
                            src={log.image_url}
                            alt={log.food_name}
                            style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Apple size={24} color="var(--accent-blue)" />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{log.food_name}</h4>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{logTime}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', color: 'var(--accent-orange)', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                            <Flame size={12} fill="var(--accent-orange)" />
                            <span>{log.calories} kcal</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>🍗 P: {log.protein_g}g</span>
                            <span>⚡ C: {log.carbs_g}g</span>
                            <span>💧 F: {log.fats_g}g</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFoodLog(log.id, index)}
                          style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {!showAllFoods && dailyLogs.length > 2 && (
                    <button
                      onClick={() => setShowAllFoods(true)}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '16px',
                        border: '1px solid rgba(37,99,235,0.2)',
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.03) 100%)',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        transition: 'all 0.25s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>↓</span>
                      View {dailyLogs.length - 2} more meal{dailyLogs.length - 2 > 1 ? 's' : ''}
                    </button>
                  )}
                  {showAllFoods && dailyLogs.length > 2 && (
                    <button
                      onClick={() => setShowAllFoods(false)}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '16px',
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        transition: 'all 0.25s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>↑</span>
                      Close — Show Less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Progress (Track Progress) */}
        {activeTab === 'progress' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Track Progress</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Monitor weight metrics & nutritional consumption</p>
            </div>

            {/* Today's Calorie Summary Row (Goes to the Top with sliding animation) */}
            {(() => {
              const goal = profile.daily_calorie_goal || 2200;
              const consumed = foodLogs.filter(dateLogFilter).reduce((sum, item) => sum + item.calories, 0);
              const remaining = goal - consumed;
              const percent = Math.round((consumed / goal) * 100);

              let statusText = 'Safe';
              let statusColor = '#10b981';
              let statusBg = 'rgba(16, 185, 129, 0.15)';
              let statusBorder = '1px solid rgba(16, 185, 129, 0.2)';

              if (consumed > goal) {
                statusText = 'Limit Reached';
                statusColor = 'var(--accent-red)';
                statusBg = 'rgba(239, 68, 68, 0.15)';
                statusBorder = '1px solid rgba(239, 68, 68, 0.2)';
              } else if (remaining < 300) {
                statusText = 'Near Goal';
                statusColor = '#f59e0b';
                statusBg = 'rgba(245, 158, 11, 0.15)';
                statusBorder = '1px solid rgba(245, 158, 11, 0.2)';
              }

              return (
                <div 
                  className="glass-card animate-row-top" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px', 
                    padding: '20px',
                    background: consumed > goal 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(96, 165, 250, 0.03) 100%)',
                    borderColor: consumed > goal ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Energy Balance</span>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                        {consumed} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {goal} kcal</span>
                      </h3>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: statusBg,
                      color: statusColor,
                      border: statusBorder,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </div>
                  </div>

                  {/* Progress bar container */}
                  <div style={{ position: 'relative', width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: consumed > goal 
                          ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                          : 'linear-gradient(90deg, #2563eb, #60a5fa)',
                        width: `${animatedCalorieProgress}%`,
                        transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        borderRadius: '4px'
                      }} 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span>0%</span>
                    <span>{percent}% of daily goal</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })()}

            {/* Goal Weight Card */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Goal Weight</span>
                <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{profile.target_weight_kg} kg</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  style={{
                    width: '70px',
                    padding: '8px',
                    borderRadius: '10px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <button onClick={addWeightLog} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                  Log
                </button>
              </div>
            </div>

            {/* Goal Progress Graph Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Weight History</h4>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px' }}>
                  {(['90', '180', '365'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setWeightPeriod(period)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: 'none',
                        background: weightPeriod === period ? 'var(--accent-blue)' : 'transparent',
                        color: weightPeriod === period ? '#fff' : 'var(--text-secondary)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {period === '90' ? '90 Days' : period === '180' ? '6 Months' : '1 Year'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom SVG Line Chart */}
              {weightLogs.length < 2 ? (
                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <p style={{ fontSize: '12px' }}>Please log at least 2 weight entries to visualize progress.</p>
                </div>
              ) : (() => {
                const sortedLogs = [...weightLogs].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
                const weights = sortedLogs.map(l => l.weight_kg);
                const maxW = Math.max(...weights, profile.target_weight_kg) + 2;
                const minW = Math.min(...weights, profile.target_weight_kg) - 2;
                const range = maxW - minW;

                const chartWidth = 380;
                const chartHeight = 150;
                const padding = 20;

                const points = sortedLogs.map((log, i) => {
                  const x = padding + (i / (sortedLogs.length - 1)) * (chartWidth - padding * 2);
                  const y = chartHeight - padding - ((log.weight_kg - minW) / range) * (chartHeight - padding * 2);
                  return { x, y, weight: log.weight_kg, date: log.logged_at };
                });

                const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                // Goal line Y position
                const goalY = chartHeight - padding - ((profile.target_weight_kg - minW) / range) * (chartHeight - padding * 2);

                return (
                  <div style={{ position: 'relative' }}>
                    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                      {/* Grid Lines */}
                      <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
                      <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
                      <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />

                      {/* Goal Line */}
                      <line x1={padding} y1={goalY} x2={chartWidth - padding} y2={goalY} stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" strokeDasharray="4" />
                      <text x={chartWidth - padding - 60} y={goalY - 4} fill="var(--accent-red)" fontSize="8" fontWeight="600">Goal: {profile.target_weight_kg}kg</text>

                      {/* Chart Line */}
                      <path d={linePath} fill="none" stroke="var(--accent-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Dots and Labels */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-primary)" stroke="var(--accent-blue)" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize="9" fontWeight="700" textAnchor="middle">
                            {p.weight}
                          </text>
                          {/* X label */}
                          <text x={p.x} y={chartHeight - 4} fill="var(--text-tertiary)" fontSize="7" textAnchor="middle">
                            {p.date.split('-')[2]} / {p.date.split('-')[1]}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* Weekly Nutrition summary */}
            <div className="glass-card">
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Nutrition Overview</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Weekly calorie trends</p>

              {/* Custom SVG Bar Chart */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '0 10px' }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const logs = foodLogs.filter(log => {
                    const lDate = new Date(log.logged_at);
                    return lDate.getDate() === d.getDate() && lDate.getMonth() === d.getMonth();
                  });
                  const sumCal = logs.reduce((acc, curr) => acc + curr.calories, 0);
                  const percent = Math.min(100, (sumCal / profile.daily_calorie_goal) * 100);
                  const barHeight = Math.max(10, (percent / 100) * 100);

                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: sumCal > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                        {sumCal > 0 ? `${sumCal}` : ''}
                      </span>
                      <div style={{
                        width: '18px',
                        height: '100px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div style={{
                          width: '100%',
                          height: `${barHeight}%`,
                          background: percent >= 100 ? 'linear-gradient(to top, var(--accent-blue), #60a5fa)' : 'linear-gradient(to top, rgba(37,99,235,0.6), var(--accent-blue))',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                        {d.toLocaleDateString([], { weekday: 'narrow' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Live Food Scan */}
        {activeTab === 'diet' && (
          !profile.is_premium ? (
            <div className="animate-slide-up glass-card" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 24px',
              gap: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 193, 7, 0.2)',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8))',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              margin: 'auto 0'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                fontSize: '32px'
              }}>
                ⭐
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '0 0 8px 0' }}>Live Scan is a Premium Feature</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
                  Get real-time food ingredient and nutrition analysis directly from your video viewfinder. Unlock HealthyBit Premium to access this feature.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
                <button
                  onClick={() => setShowPaywall(true)}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '15px',
                    padding: '14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  Unlock Premium Now
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Live Food Scan</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Point your camera at food for real-time analysis</p>
              </div>
              
              {/* Language Toggle Control */}
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '4px',
                borderRadius: '12px',
                gap: '4px'
              }}>
                <button
                  onClick={() => handleVoiceLangChange('en')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: aiVoiceLanguage === 'en' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                    color: aiVoiceLanguage === 'en' ? '#fff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s',
                    boxShadow: aiVoiceLanguage === 'en' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none'
                  }}
                >
                  English 🇺🇸 (Female)
                </button>
                <button
                  onClick={() => handleVoiceLangChange('hi')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: aiVoiceLanguage === 'hi' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                    color: aiVoiceLanguage === 'hi' ? '#fff' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s',
                    boxShadow: aiVoiceLanguage === 'hi' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  हिन्दी 🇮🇳 (Female)
                </button>
              </div>
            </div>

            <div style={{
              position: 'relative',
              flex: 1,
              background: '#020617',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '2px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              minHeight: '320px'
            }}>
              {/* CAMERA FEED — always mounted so liveVideoRef is available when stream is assigned */}
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: cameraPermissionStatus === 'granted' && !isCameraInitializing ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                  zIndex: 1
                }}
              />

              {isCameraInitializing ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: '#020617',
                  width: '100%',
                  height: '100%',
                  minHeight: '320px',
                  position: 'relative',
                  zIndex: 5
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#60a5fa',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '12px'
                  }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    Connecting to camera...
                  </span>
                </div>
              ) : cameraPermissionStatus === 'denied' || cameraPermissionStatus === 'unsupported' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 24px',
                  textAlign: 'center',
                  zIndex: 10,
                  maxWidth: '380px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    boxShadow: '0 8px 24px rgba(239,68,68,0.1)'
                  }}>
                    <CameraOff size={28} style={{ color: '#f87171' }} />
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
                    {cameraPermissionStatus === 'unsupported' ? 'Live Camera Unavailable' : 'Camera Blocked'}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                    {cameraPermissionStatus === 'unsupported'
                      ? 'Live scanner requires a secure HTTPS connection. Please capture a photo using your native camera or choose from gallery.'
                      : 'Please enable camera permissions in your browser settings to scan your food, or use native upload below.'
                    }
                  </p>

                  {/* Two Main Call-To-Action Capture Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '20px' }}>
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '14px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                      }}
                    >
                      <Camera size={18} /> Take Photo (Native Camera)
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '14px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                      }}
                    >
                      <Plus size={18} /> Choose from Gallery
                    </button>
                  </div>

                  {cameraPermissionStatus === 'denied' && (
                    <div style={{
                      background: 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'left',
                      width: '100%',
                      marginBottom: '24px',
                      fontSize: '12px',
                      color: '#94a3b8',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>1.</span>
                        <span>Tap the lock/settings icon 🔒 next to the web address bar.</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>2.</span>
                        <span>Toggle the <b>Camera</b> setting to <b>"Allow"</b>.</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>3.</span>
                        <span>Refresh this page to re-initialize scanner.</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '10px 24px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%'
                    }}
                  >
                    Reload Page
                  </button>
                </div>
              ) : (
                <>
                  {cameraPermissionStatus === 'granted' ? (
                    <>
                      {/* Futuristic Viewfinder overlays */}
                      <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 10
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isAnalyzingFrame ? '#e11d48' : '#10b981',
                          animation: 'pulse 1.5s infinite',
                          boxShadow: isAnalyzingFrame ? '0 0 8px #e11d48' : '0 0 8px #10b981'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                          {isAnalyzingFrame ? 'ANALYZING...' : 'LIVE FEED'}
                        </span>
                      </div>

                      {/* Shake-to-Scan Readiness HUD Banner */}
                      <div style={{
                        position: 'absolute',
                        top: '64px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: shakeDetectedVisual
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))'
                          : 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(10px)',
                        border: shakeDetectedVisual ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.15)',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 30,
                        boxShadow: shakeDetectedVisual ? '0 0 20px rgba(16,185,129,0.6)' : '0 4px 16px rgba(0,0,0,0.4)',
                        transition: 'all 0.25s ease',
                        color: '#fff',
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ fontSize: '13px' }}>{shakeDetectedVisual ? '⚡' : '📱'}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.2px' }}>
                          {shakeDetectedVisual
                            ? 'Shake Detected! Scanning...'
                            : (liveScanDetectedFood ? 'Ready: Shake to Log Meal ✦' : 'Shake phone to scan ✦')}
                        </span>
                      </div>

                      {/* Laser scan lines when scanning */}
                      {isAnalyzingFrame && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.25) 50%, rgba(37, 99, 235, 0.1) 100%)',
                          zIndex: 5,
                          pointerEvents: 'none',
                          animation: 'laserScan 2s linear infinite'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '2px',
                            background: 'var(--accent-blue)',
                            boxShadow: '0 0 15px var(--accent-blue), 0 0 30px var(--accent-blue)',
                            position: 'absolute',
                            top: '50%'
                          }} />
                        </div>
                      )}

                      {/* Viewfinder Target corners */}
                      <div style={{ position: 'absolute', top: '30px', left: '30px', width: '20px', height: '20px', borderTop: '3px solid #fff', borderLeft: '3px solid #fff', opacity: 0.6 }} />
                      <div style={{ position: 'absolute', top: '30px', right: '30px', width: '20px', height: '20px', borderTop: '3px solid #fff', borderRight: '3px solid #fff', opacity: 0.6 }} />
                      <div style={{ position: 'absolute', bottom: '30px', left: '30px', width: '20px', height: '20px', borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', opacity: 0.6 }} />
                      <div style={{ position: 'absolute', bottom: '30px', right: '30px', width: '20px', height: '20px', borderBottom: '3px solid #fff', borderRight: '3px solid #fff', opacity: 0.6 }} />

                      {/* Center crosshair */}
                      <div style={{
                        position: 'absolute',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.35,
                        pointerEvents: 'none'
                      }}>
                        <div style={{ width: '10px', height: '2px', background: '#fff' }} />
                        <div style={{ height: '10px', width: '2px', background: '#fff', position: 'absolute' }} />
                      </div>

                      {/* HUD scan trigger button overlay */}
                      {!liveScanDetectedFood && !isAnalyzingFrame && (
                        <button
                          onClick={() => handleLiveScan(false)}
                          style={{
                            position: 'absolute',
                            bottom: '24px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 10
                          }}
                        >
                          <Sparkles size={16} />
                          <span>Scan Food (or Shake Phone)</span>
                        </button>
                      )}

                      {/* Active model badge at bottom right */}
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.3)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Powered by Gemini 2.5 Flash
                      </div>
                    </>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      background: '#020617',
                      width: '100%',
                      height: '100%',
                      minHeight: '320px',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#60a5fa',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        marginBottom: '12px'
                      }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        Awaiting camera permissions...
                      </span>

                      {/* POP-UP ALERT DIALOG OVERLAY */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(5, 8, 15, 0.82)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        zIndex: 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          background: '#131b2e',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '24px',
                          padding: '24px 20px',
                          maxWidth: '320px',
                          width: '100%',
                          textAlign: 'center',
                          boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '16px'
                        }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(96, 165, 250, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 16px rgba(96,165,250,0.1)'
                          }}>
                            <Camera size={26} color="#60a5fa" />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>Camera Permission</h4>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.45' }}>
                              HealthyBit needs camera permission to perform instant real-time food scanning and mapping.
                            </p>
                          </div>
                          <button
                            onClick={requestCameraPermission}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '13.5px',
                              cursor: 'pointer',
                              boxShadow: '0 6px 16px rgba(37,99,235,0.3)'
                            }}
                          >
                            Allow Camera
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Scanner Status Overlay */}
              {isAnalyzingFrame && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '10px 16px',
                  gap: '10px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>AI analyzing frame...</span>
                </div>
              )}

              {/* Detected Food Card Overlay */}
              {liveScanDetectedFood && (
                <div className="glass-card animate-slide-up" style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  maxHeight: 'calc(100% - 32px)',
                  overflowY: 'auto',
                  zIndex: 120,
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)'
                }}>
                  {/* Glowing neon decorative top bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
                  }} />

                  {/* Food Name & Health Score */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Detected Meal</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>{liveScanDetectedFood.foodName}</h3>
                        <button
                          onClick={() => speakFoodAnalysis(liveScanDetectedFood)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            padding: 0
                          }}
                          title="Speak macro summary aloud"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Health Score Pill */}
                    {liveScanDetectedFood.healthScore !== undefined && (
                      <div style={{
                        background: liveScanDetectedFood.healthScore >= 75
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.3) 100%)'
                          : liveScanDetectedFood.healthScore >= 50
                            ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.3) 100%)'
                            : 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.3) 100%)',
                        border: `1px solid ${liveScanDetectedFood.healthScore >= 75 ? '#10b981' : liveScanDetectedFood.healthScore >= 50 ? '#f59e0b' : '#ef4444'}`,
                        color: liveScanDetectedFood.healthScore >= 75 ? '#34d399' : liveScanDetectedFood.healthScore >= 50 ? '#fbbf24' : '#f87171',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 800,
                        boxShadow: `0 4px 12px ${liveScanDetectedFood.healthScore >= 75 ? 'rgba(16,185,129,0.15)' : liveScanDetectedFood.healthScore >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}`,
                        whiteSpace: 'nowrap'
                      }}>
                        ⭐ {liveScanDetectedFood.healthScore} Score
                      </div>
                    )}
                  </div>

                  {/* Energy & Stats Section */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '12px 16px', 
                    borderRadius: '16px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(249,115,22,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Flame size={18} color="#f97316" fill="#f97316" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>{liveScanDetectedFood.calories} kcal</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Energy Est.</span>
                      </div>
                    </div>
                    
                    {/* Visual food gauge */}
                    <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                      <Sparkles size={12} />
                      <span>Real-time Scanned</span>
                    </div>
                  </div>
                  
                  {/* Macros grid with custom color progress bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {/* Protein */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px',
                      background: 'rgba(239,68,68,0.03)',
                      border: '1px solid rgba(239,68,68,0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#f87171', fontWeight: 700, fontSize: '11px' }}>Protein</span>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>{liveScanDetectedFood.protein}g</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(239,68,68,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)', width: `${Math.min(100, (liveScanDetectedFood.protein / 50) * 100)}%`, borderRadius: '3px' }} />
                      </div>
                    </div>

                    {/* Carbs */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px',
                      background: 'rgba(245,158,11,0.03)',
                      border: '1px solid rgba(245,158,11,0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '11px' }}>Carbs</span>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>{liveScanDetectedFood.carbs}g</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(245,158,11,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', width: `${Math.min(100, (liveScanDetectedFood.carbs / 100) * 100)}%`, borderRadius: '3px' }} />
                      </div>
                    </div>

                    {/* Fats */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px',
                      background: 'rgba(16,185,129,0.03)',
                      border: '1px solid rgba(16,185,129,0.1)',
                      padding: '10px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#34d399', fontWeight: 700, fontSize: '11px' }}>Fats</span>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>{liveScanDetectedFood.fats}g</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(16,185,129,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', width: `${Math.min(100, (liveScanDetectedFood.fats / 40) * 100)}%`, borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Shake confirmation tip */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px dashed rgba(59, 130, 246, 0.4)',
                    borderRadius: '14px',
                    fontSize: '11px',
                    color: '#93c5fd',
                    fontWeight: 700
                  }}>
                    <span>📱</span>
                    <span>Ready! Shake phone to log meal to diary (or tap below)</span>
                  </div>

                  {/* Log button and Clear button */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        playFeedback();
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                        setLiveScanDetectedFood(null);
                      }}
                      className="btn-secondary"
                      style={{ 
                        flex: 1, 
                        padding: '14px', 
                        borderRadius: '16px',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.8)'
                      }}
                    >
                      Clear Scan
                    </button>
                    <button
                      onClick={handleSaveLiveScannedFood}
                      className="btn-primary"
                      style={{ 
                        flex: 2, 
                        padding: '14px', 
                        borderRadius: '16px',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        border: 'none',
                        boxShadow: '0 8px 20px rgba(59,130,246,0.3)',
                        color: '#fff'
                      }}
                    >
                      <Check size={16} />
                      <span>Log to Diary</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Settings</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Configure user profile & preferences</p>
          </div>

          {/* Profile Avatar Header Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '24px',
            borderRadius: '24px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
            transition: 'all 0.3s ease',
            flexWrap: 'wrap'
          }}>
            {/* Tappable Avatar with Premium Camera Floating Action Icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-orange))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '44px',
                  fontWeight: 800,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '3px solid var(--glass-border)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{settingsName ? settingsName[0].toUpperCase() : 'G'}</span>
                )}
              </div>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), #1e40af)',
                  border: '2px solid var(--bg-secondary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
              >
                {isUploadingAvatar ? (
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Camera size={16} />
                )}
              </div>
            </div>
            {/* Hidden avatar file input */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{settingsName || 'Guest User'}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{user ? user.email : 'Local Guest Profile'}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '6px 0 0 0' }}>Tap photo or camera icon to upload photo</p>
            </div>
          </div>

          {/* Subscription Tier Status Panel */}
          <div className="glass-card" style={{
            padding: '20px',
            borderRadius: '24px',
            background: profile.is_premium
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)'
              : 'var(--glass-bg)',
            border: profile.is_premium
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{profile.is_premium ? '⭐' : '🛡️'}</span>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: profile.is_premium ? '#f59e0b' : 'var(--text-primary)', margin: 0 }}>
                    {profile.is_premium ? 'HealthyBit Premium' : 'HealthyBit Free Plan'}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    {profile.is_premium
                      ? `Unlimited access until ${profile.premium_until ? new Date(profile.premium_until).toLocaleDateString() : 'Active'}`
                      : `${Math.max(0, 3 - (profile.scans_used || 0))} of 3 free standard food scans remaining`
                    }
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 8px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                background: profile.is_premium ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: profile.is_premium ? '#f59e0b' : 'var(--text-tertiary)',
                border: profile.is_premium ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {profile.is_premium ? 'Premium' : 'Free Trial'}
              </span>
            </div>

            {!profile.is_premium && (
              <button
                onClick={() => setShowPaywall(true)}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>Upgrade to Premium (300 Rs)</span>
              </button>
            )}
          </div>

          {/* Profile Config Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--accent-blue)" /> Profile Customizer
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Your Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                  outline: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Height (cm)</label>
                <input
                  type="number"
                  value={settingsHeight}
                  onChange={(e) => setSettingsHeight(e.target.value)}
                  placeholder="e.g. 175"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Weight (kg)</label>
                <input
                  type="number"
                  value={settingsWeight}
                  onChange={(e) => setSettingsWeight(e.target.value)}
                  placeholder="e.g. 70"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Daily Calorie Goal</label>
                <input
                  type="number"
                  value={settingsCalorieGoal}
                  onChange={(e) => setSettingsCalorieGoal(e.target.value)}
                  placeholder="e.g. 2000"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Weight Target (kg)</label>
                <input
                  type="number"
                  value={settingsTargetWeight}
                  onChange={(e) => setSettingsTargetWeight(e.target.value)}
                  placeholder="e.g. 65"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Goal Type</label>
                <select
                  value={settingsGoalType}
                  onChange={(e) => setSettingsGoalType(e.target.value as any)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Gain Weight</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Activity Level</label>
                <select
                  value={settingsActivityLevel}
                  onChange={(e) => setSettingsActivityLevel(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <option value="sedentary">Sedentary (desk job)</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="very">Very Active</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Protein (g)</label>
                <input
                  type="number"
                  value={settingsProteinGoal}
                  onChange={(e) => setSettingsProteinGoal(e.target.value)}
                  placeholder="Protein"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Carbs (g)</label>
                <input
                  type="number"
                  value={settingsCarbsGoal}
                  onChange={(e) => setSettingsCarbsGoal(e.target.value)}
                  placeholder="Carbs"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Fats (g)</label>
                <input
                  type="number"
                  value={settingsFatsGoal}
                  onChange={(e) => setSettingsFatsGoal(e.target.value)}
                  placeholder="Fats"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="btn-primary"
              style={{
                width: '100%',
                background: settingsSaveSuccess ? 'var(--accent-green)' : 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                boxShadow: settingsSaveSuccess ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(37, 99, 235, 0.15)'
              }}
            >
              {settingsSaveSuccess ? (
                <>
                  <Check size={16} /> Settings Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>

          {/* Supabase Account Card - Only render when user is logged in to allow signout */}
          {user && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="var(--accent-green)" /> Account Synchronization
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Synced to <strong>{user.email}</strong></span>
                </div>

                {!showSettingsChangePassword ? (
                  <button
                    onClick={() => {
                      setShowSettingsChangePassword(true);
                      setSettingsNewPassword('');
                      setSettingsNewPasswordConfirm('');
                      setSettingsPasswordError('');
                      setSettingsPasswordSuccess(false);
                    }}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Lock size={14} /> Change Password
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Update Password</span>
                      <button
                        onClick={() => setShowSettingsChangePassword(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showSettingsPassword ? "text" : "password"}
                        placeholder="New Password (min 6 chars)"
                        value={settingsNewPassword}
                        onChange={(e) => setSettingsNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          paddingRight: '40px',
                          borderRadius: '10px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--glass-border)',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSettingsPassword(!showSettingsPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {showSettingsPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <input
                      type={showSettingsPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      value={settingsNewPasswordConfirm}
                      onChange={(e) => setSettingsNewPasswordConfirm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                        outline: 'none',
                        fontSize: '13px'
                      }}
                    />

                    {settingsPasswordError && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>{settingsPasswordError}</span>
                    )}
                    {settingsPasswordSuccess && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>Password updated! 🎉</span>
                    )}

                    <button
                      onClick={handleSettingsChangePassword}
                      className="btn-primary"
                      disabled={isLoading}
                      style={{
                        padding: '10px',
                        fontSize: '13px',
                        borderRadius: '10px'
                      }}
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    gap: '8px',
                    borderColor: 'rgba(239,68,68,0.35)',
                    color: 'var(--accent-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>
          )}


        </div>
      )}
    </div>

      {/* Camera Full-Screen Viewfinder */ }
  {
    showCameraScanner && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Camera bar */}
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 8px' }}>
            <button
              onClick={stopCamera}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Scan Food</span>
            {/* Scan limit badge */}
            {profile.is_premium ? (
              <span style={{
                background: 'rgba(16,185,129,0.25)',
                border: '1px solid rgba(16,185,129,0.5)',
                color: '#34d399',
                fontSize: '10px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                letterSpacing: '0.3px'
              }}>✦ Unlimited</span>
            ) : (() => {
              const used = profile.scans_used || 0;
              const remaining = Math.max(0, 3 - used);
              const isLast = remaining === 1;
              const isEmpty = remaining === 0;
              return (
                <span style={{
                  background: isEmpty
                    ? 'rgba(239,68,68,0.25)'
                    : isLast
                      ? 'rgba(245,158,11,0.25)'
                      : 'rgba(255,255,255,0.12)',
                  border: `1px solid ${isEmpty ? 'rgba(239,68,68,0.5)' : isLast ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.2)'}`,
                  color: isEmpty ? '#f87171' : isLast ? '#fbbf24' : '#e2e8f0',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  boxShadow: isLast ? '0 0 8px rgba(245,158,11,0.3)' : 'none',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}>
                  {isEmpty ? '0 left · Upgrade' : `${remaining} / 3 free`}
                </span>
              );
            })()}
          </div>
          {/* Scan progress bar for free users */}
          {!profile.is_premium && (
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', margin: '0 20px 4px' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((profile.scans_used || 0) / 3) * 100)}%`,
                background: (profile.scans_used || 0) >= 3
                  ? '#ef4444'
                  : (profile.scans_used || 0) === 2
                    ? '#f59e0b'
                    : '#10b981',
                borderRadius: '2px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          )}
        </div>

        {/* Camera Video / Viewfinder overlay */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cameraPermissionStatus === 'denied' || cameraPermissionStatus === 'unsupported' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textAlign: 'center',
              zIndex: 10,
              maxWidth: '380px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 8px 24px rgba(239,68,68,0.1)'
              }}>
                <CameraOff size={28} style={{ color: '#f87171' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
                {cameraPermissionStatus === 'unsupported' ? 'Live Camera Unavailable' : 'Camera Blocked'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                {cameraPermissionStatus === 'unsupported'
                  ? 'Live scanner requires a secure HTTPS connection. Please capture a photo using your native camera or choose from gallery.'
                  : 'Please enable camera permissions in your browser settings to scan your food, or use native upload below.'
                }
              </p>

              {/* Two Main Call-To-Action Capture Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                  }}
                >
                  <Camera size={18} /> Take Photo (Native Camera)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                  }}
                >
                  <Plus size={18} /> Choose from Gallery
                </button>
              </div>

              {cameraPermissionStatus === 'denied' && (
                <div style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'left',
                  width: '100%',
                  marginBottom: '24px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  lineHeight: 1.6
                }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>1.</span>
                    <span>Tap the lock/settings icon 🔒 next to the web address bar.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>2.</span>
                    <span>Toggle the <b>Camera</b> setting to <b>"Allow"</b>.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>3.</span>
                    <span>Refresh this page to re-initialize scanner.</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Viewfinder Reticle Frame */}
              <div style={{
                position: 'absolute',
                width: '260px',
                height: '260px',
                border: '2px dashed rgba(255, 255, 255, 0.6)',
                borderRadius: '24px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none'
              }}>
                <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderTop: '4px solid #fff', borderLeft: '4px solid #fff' }} />
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderTop: '4px solid #fff', borderRight: '4px solid #fff' }} />
                <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderBottom: '4px solid #fff', borderLeft: '4px solid #fff' }} />
                <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', borderBottom: '4px solid #fff', borderRight: '4px solid #fff' }} />
              </div>

              {/* Shake indicator badge in modal camera */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: shakeDetectedVisual ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(8px)',
                border: shakeDetectedVisual ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.15)',
                padding: '6px 14px',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 20,
                transition: 'all 0.2s ease',
                boxShadow: shakeDetectedVisual ? '0 0 16px rgba(16, 185, 129, 0.6)' : 'none'
              }}>
                <span>{shakeDetectedVisual ? '⚡' : '📱'}</span>
                <span>{shakeDetectedVisual ? 'Shake Detected! Capturing...' : 'Shake phone to snap photo'}</span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Action buttons */}
        <div style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '24px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Capture & Upload controls */}
          <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '40px' }}>
            {/* Gallery upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Plus size={20} />
            </button>

            {/* Central Trigger button */}
            {cameraPermissionStatus !== 'denied' && (
              <button
                onClick={capturePhoto}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '6px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              />
            )}

            {/* Placeholder blank */}
            {cameraPermissionStatus !== 'denied' ? <div style={{ width: '48px' }} /> : null}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Center food inside frame and snap, or shake phone to capture.</p>
        </div>
      </div>
    )
  }

  {/* Text Describer Panel */ }
  {
    showTextDescriber && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#0a0b0d',
        zIndex: 190,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button
            onClick={() => setShowTextDescriber(false)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: '12px' }}
          >
            <ChevronLeft size={24} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>Describe Food</span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Ingredients / Items
            </label>
            <textarea
              placeholder="2 eggs, avocado toast, and black coffee..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                width: '100%',
                height: '120px',
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: '#fff',
                outline: 'none',
                fontSize: '15px',
                resize: 'none',
                lineHeight: '1.5'
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Parsed Ingredients Preview</span>
            {inputText.trim() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {inputText.split(',').map((item, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '12px', fontSize: '12px' }}>
                    {item.trim() || '...'}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Provide comma-separated ingredients with quantifiers (e.g. "1 banana, 200ml whole milk") for improved AI precision.
              </p>
            )}
          </div>

          <button
            onClick={analyzeTextIngredients}
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>
    )
  }

  {/* Meal Breakdown Details Modal Drawer */ }
  {
    showBreakdown && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#0a0b0d',
        zIndex: 220,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.25s ease-out forwards'
      }}>
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button
            onClick={() => setShowBreakdown(false)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: '12px' }}
          >
            <ChevronLeft size={24} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Meal Breakdown</span>
          {currentAnalysis && (
            <button
              onClick={() => speakFoodAnalysis(currentAnalysis)}
              style={{
                marginLeft: 'auto',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                color: 'var(--accent-orange)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.2)'
              }}
              title="Hear nutritional analysis"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
              }}
            >
              <Volume2 size={18} />
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!currentAnalysis ? (
            // ─── SKELETON LOADER VIEW ───────────────────────────────────────
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Image Skeleton */}
              {scannedImage ? (
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '20px', overflow: 'hidden' }}>
                  <img
                    src={scannedImage}
                    alt="Scanning food..."
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
                  />
                  <div className="laser-scan-line" />
                </div>
              ) : (
                <div className="skeleton-shimmer skeleton-box" style={{ width: '100%', height: '180px' }} />
              )}

              {/* Title & Quantity Skeleton */}
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer skeleton-text title" style={{ width: '60%', margin: 0 }} />
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: '12px', marginTop: '6px', margin: 0 }} />
                </div>
                <div className="skeleton-shimmer" style={{ width: '70px', height: '32px', borderRadius: '14px' }} />
              </div>

              {/* Energy Calorie Skeleton */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 20px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="skeleton-shimmer skeleton-text" style={{ width: '30%', height: '12px', margin: 0 }} />
                <div className="skeleton-shimmer" style={{ width: '50%', height: '38px', borderRadius: '8px' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '20%', height: '12px', margin: 0 }} />
              </div>

              {/* Macro Grid Skeleton */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="glass-card skeleton-shimmer" style={{ height: '76px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
                <div className="glass-card skeleton-shimmer" style={{ height: '76px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
                <div className="glass-card skeleton-shimmer" style={{ height: '76px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Health Score Skeleton */}
              <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="skeleton-shimmer skeleton-circle" style={{ width: '60px', height: '60px', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: '16px', margin: 0 }} />
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '100%', height: '12px', margin: 0 }} />
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: '12px', margin: 0 }} />
                </div>
              </div>

              {/* Ingredients List Skeleton */}
              <div>
                <div className="skeleton-shimmer skeleton-text" style={{ width: '35%', height: '16px', marginBottom: '10px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="glass-card skeleton-shimmer" style={{ height: '44px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
                  <div className="glass-card skeleton-shimmer" style={{ height: '44px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
                  <div className="glass-card skeleton-shimmer" style={{ height: '44px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            </div>
          ) : (
            // ─── ACTUAL RESULTS VIEW ───────────────────────────────────────
            <>
              {/* Food Image (if captured) */}
              {scannedImage && (
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <img
                    src={scannedImage}
                    alt={currentAnalysis.foodName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(10,11,13,0.8), transparent)',
                    pointerEvents: 'none'
                  }} />
                </div>
              )}

              {/* Food Name & Quantity Counter */}
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{currentAnalysis.foodName}</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Adjust servings multiplier</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => setBreakdownQuantity(q => Math.max(0.5, q - 0.5))}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{breakdownQuantity}x</span>
                  <button
                    onClick={() => setBreakdownQuantity(q => q + 0.5)}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Calorie Large Card */}
              <div className="glass-card" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.02) 100%)',
                borderColor: 'rgba(249,115,22,0.3)',
                boxShadow: '0 8px 32px rgba(249,115,22,0.08)',
                padding: '24px 20px'
              }}>
                <span style={{ color: 'rgba(249,115,22,0.8)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Estimated Energy</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                  <Flame size={36} fill="var(--accent-orange)" color="var(--accent-orange)" style={{ filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.5))' }} />
                  <h1 style={{ fontSize: '46px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>{Math.round(currentAnalysis.calories * breakdownQuantity)}</h1>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'center', display: 'block' }}>
                  Total Calories (kcal)
                  {profile.daily_calorie_goal > 0 && (
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>
                      Fulfills {Math.round((currentAnalysis.calories * breakdownQuantity / profile.daily_calorie_goal) * 100)}% of your daily budget
                    </span>
                  )}
                </span>
              </div>

              {/* Macronutrients detail */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="glass-card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '16px 10px',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.01) 100%)',
                  borderColor: 'rgba(239,68,68,0.25)',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.05)',
                  borderRadius: '16px'
                }}>
                  <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Protein</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#ff8a8a', letterSpacing: '-0.5px' }}>{Math.round(currentAnalysis.protein * breakdownQuantity)}g</span>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(239,68,68,0.15)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ height: '100%', background: '#ef4444', width: '100%', boxShadow: '0 0 8px #ef4444' }} />
                  </div>
                  {profile.protein_goal_g > 0 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {Math.round((currentAnalysis.protein * breakdownQuantity / profile.protein_goal_g) * 100)}% of goal
                    </span>
                  )}
                </div>
                <div className="glass-card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '16px 10px',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.01) 100%)',
                  borderColor: 'rgba(245,158,11,0.25)',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.05)',
                  borderRadius: '16px'
                }}>
                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carbs</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#fde047', letterSpacing: '-0.5px' }}>{Math.round(currentAnalysis.carbs * breakdownQuantity)}g</span>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(245,158,11,0.15)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ height: '100%', background: '#f59e0b', width: '100%', boxShadow: '0 0 8px #f59e0b' }} />
                  </div>
                  {profile.carbs_goal_g > 0 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {Math.round((currentAnalysis.carbs * breakdownQuantity / profile.carbs_goal_g) * 100)}% of goal
                    </span>
                  )}
                </div>
                <div className="glass-card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '16px 10px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.01) 100%)',
                  borderColor: 'rgba(16,185,129,0.25)',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.05)',
                  borderRadius: '16px'
                }}>
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fats</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#6ee7b7', letterSpacing: '-0.5px' }}>{Math.round(currentAnalysis.fats * breakdownQuantity)}g</span>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ height: '100%', background: '#10b981', width: '100%', boxShadow: '0 0 8px #10b981' }} />
                  </div>
                  {profile.fats_goal_g > 0 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {Math.round((currentAnalysis.fats * breakdownQuantity / profile.fats_goal_g) * 100)}% of goal
                    </span>
                  )}
                </div>
              </div>

              {/* Health Score Pie Chart */}
              <div className="glass-card" style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.06)',
                padding: '20px'
              }}>
                {(() => {
                  const score = currentAnalysis.healthScore || 50;
                  const radius = 30;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (score / 100) * circumference;
                  const scoreColor = score >= 70 ? 'var(--accent-green)' : score >= 45 ? 'var(--accent-yellow)' : 'var(--accent-red)';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                          <circle cx="40" cy="40" r={radius} stroke={scoreColor} strokeWidth="6" fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>{score}</span>
                          <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Score</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: scoreColor }}>
                            {score >= 70 ? 'Highly Nutritious' : score >= 45 ? 'Moderately Healthy' : 'Nutritionally Poor'}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                          Health Score rates quality based on calorie-density, macro ratios, and whole-food ingredients.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Ingredients detail */}
              {currentAnalysis.ingredients && currentAnalysis.ingredients.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', letterSpacing: '0.3px' }}>Parsed Ingredients</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentAnalysis.ingredients.map((ing, i) => (
                      <div key={i} className="glass-card" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.01)',
                        borderColor: 'rgba(255,255,255,0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-orange)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{ing.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--accent-orange)', fontWeight: 700 }}>
                          {Math.round(ing.calories * breakdownQuantity)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Log button */}
        <div style={{ padding: '20px 20px 40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleSaveMeal}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              opacity: isSavingMeal ? 0.7 : 1,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={!currentAnalysis || isSavingMeal}
          >
            {isSavingMeal ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Saving...
              </>
            ) : 'Log to Daily Intake'}
          </button>
        </div>
      </div>
    )
  }

  {/* Floating Add Option Dialog Overlay */ }
  {
    showAddMenu && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.25s ease-out forwards'
      }} onClick={() => setShowAddMenu(false)}>
        <div className="glass-card bottom-drawer" style={{
          margin: '16px',
          borderRadius: '24px',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 20px 48px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Log Health Stats</h3>
            <button
              onClick={() => setShowAddMenu(false)}
              style={{ background: 'rgba(0, 0, 0, 0.04)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Scan food via Camera */}
            <button
              onClick={startCamera}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#f9fafb',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--accent-blue)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Scan Food</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Identify meals with your camera / gallery</p>
              </div>
            </button>

            {/* Choice Photo from Gallery */}
            <button
              onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#f9fafb',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ background: 'rgba(249,115,22,0.08)', color: 'var(--accent-orange)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Image size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Choice Photo from Gallery</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Choose a photo from your photo library</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }


  {/* AI Nutrition Coach Popup Chat Drawer */ }
  {
    showAICoach && (
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 250,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }} onClick={() => setShowAICoach(false)}>
        <div style={{
          margin: '0',
          maxHeight: '88%',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0f1724 0%, #0a0e18 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)'
        }} onClick={(e) => e.stopPropagation()}>

          {/* Gradient Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(139,92,246,0.15) 50%, rgba(249,115,22,0.1) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '20px 20px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* AI Avatar */}
                <div style={{
                  width: '42px', height: '42px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(37,99,235,0.4)',
                  flexShrink: 0
                }}>
                  <Sparkles size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>AI Nutrition Coach</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Online · Ready to help</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAICoach(false)} style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                width: '32px', height: '32px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Quick prompt chips */}
            {chatMessages.length <= 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {['How to lose weight?', 'Protein tips 🍗', 'Best meal plan', 'Hydration guide 💧'].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); }} style={{
                    background: 'rgba(37,99,235,0.15)',
                    border: '1px solid rgba(37,99,235,0.25)',
                    color: 'rgba(255,255,255,0.75)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>{q}</button>
                ))}
              </div>
            )}
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '20px 16px 12px',
            minHeight: 0
          }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                {/* Avatar dot */}
                {msg.sender === 'user' && avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      objectFit: 'cover',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#fff',
                    boxShadow: msg.sender === 'user'
                      ? '0 2px 8px rgba(37,99,235,0.35)'
                      : '0 2px 8px rgba(124,58,237,0.35)'
                  }}>
                    {msg.sender === 'user' ? <User size={13} /> : <Sparkles size={13} />}
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  maxWidth: '78%',
                  padding: '11px 15px',
                  borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : 'rgba(255,255,255,0.05)',
                  border: msg.sender === 'ai' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  color: '#fff',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  fontWeight: 400,
                  boxShadow: msg.sender === 'user'
                    ? '0 4px 16px rgba(37,99,235,0.25)'
                    : '0 2px 8px rgba(0,0,0,0.2)',
                  letterSpacing: '0.1px'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Animated typing indicator */}
            {isChatLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.35)'
                }}>
                  <Sparkles size={13} color="#fff" />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px 20px 20px 4px',
                  padding: '12px 18px',
                  display: 'flex', gap: '5px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.35)',
                      animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            padding: '12px 16px 28px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '20px',
              padding: '6px 6px 6px 16px'
            }}>
              <input
                type="text"
                placeholder="Ask anything about nutrition..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || isChatLoading}
                style={{
                  background: chatInput.trim() && !isChatLoading
                    ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                    : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: chatInput.trim() && !isChatLoading ? '#fff' : 'rgba(255,255,255,0.3)',
                  width: '38px', height: '38px',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: chatInput.trim() && !isChatLoading ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  boxShadow: chatInput.trim() ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  {/* Loading Overlay */ }
  {
    isLoading && !showBreakdown && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(10, 11, 13, 0.8)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(37,99,235,0.1)',
          borderTopColor: 'var(--accent-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Processing, please wait...</span>
      </div>
    )
  }

  {
    scanError && (
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        padding: '12px 16px',
        background: 'rgba(239, 68, 68, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontSize: '13px',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span>
          <span>
            {scanError === 'quota'
              ? 'Scan limit reached. Please wait a moment or upgrade to Pro.'
              : scanError === 'failed'
                ? 'Unable to analyze food clearly. Please ensure food is centered in good lighting.'
                : scanError}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {scanError === 'failed' && lastScannedBase64 && (
            <button
              onClick={() => {
                analyzeCapturedImage(lastScannedBase64);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Retry
            </button>
          )}
          <button
            onClick={() => setScanError(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8, fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  {/* Global CSS Spin Injection */ }
  <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

  {/* Premium Paywall Modal Overlay */}
  {showPaywall && (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90%',
        borderRadius: '30px',
        background: 'linear-gradient(180deg, #131b2e 0%, #090d16 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Close Button */}
        {paywallStep !== 'success' && (
          <button
            onClick={() => {
              setShowPaywall(false);
              setPaywallStep('plans');
            }}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Modal Content */}
        <div style={{ overflowY: 'auto', padding: '28px 24px', flex: 1 }}>
          {paywallStep === 'plans' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
                  marginBottom: '12px'
                }}>
                  <Sparkles size={28} color="#fff" />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 850, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                  Unlock HealthyBit Pro
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: '6px 0 0 0' }}>
                  Upgrade for unlimited smart scans and advanced coaching
                </p>
              </div>

              {/* Premium Features List */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {[
                  { title: 'Unlimited AI Food & Live Scans', desc: 'No scan caps or cooldowns.' },
                  { title: 'Triple AI Model Architecture', desc: 'Gemini 2.5 Pro (Chat), Gemini 3.5 Flash (Images), & Gemini 3.5 Flash (Live Scan)' },
                  { title: 'Real-time Camera Feed Scanning', desc: 'Scan items live, instantly.' },
                  { title: 'Full Diet Planner & History', desc: 'Unlock customizable weekly goal planners.' }
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#f59e0b', fontSize: '16px', lineHeight: '1.2' }}>✓</span>
                    <div>
                      <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{feat.title}</h5>
                      <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '2px 0 0 0' }}>{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Plans Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Yearly Plan (Best Value) */}
                <div
                  onClick={() => setPaywallPlan('yearly')}
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    background: paywallPlan === 'yearly' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: paywallPlan === 'yearly' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase'
                  }}>
                    Save 50%
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: '2px solid ' + (paywallPlan === 'yearly' ? '#f59e0b' : 'rgba(255,255,255,0.2)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {paywallPlan === 'yearly' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>Yearly Pro Access</h4>
                        <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '2px 0 0 0' }}>12 months unlimited scanning</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>1800 Rs</span>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>150 Rs / month</p>
                    </div>
                  </div>
                </div>

                {/* Monthly Plan */}
                <div
                  onClick={() => setPaywallPlan('monthly')}
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    background: paywallPlan === 'monthly' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: paywallPlan === 'monthly' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: '2px solid ' + (paywallPlan === 'monthly' ? '#f59e0b' : 'rgba(255,255,255,0.2)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {paywallPlan === 'monthly' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>Monthly Pro Access</h4>
                        <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '2px 0 0 0' }}>1 month unlimited scanning</p>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>300 Rs</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={isProcessingPayment}
                onClick={() => handleActivatePremium(paywallPlan)}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '14px',
                  borderRadius: '14px',
                  cursor: isProcessingPayment ? 'default' : 'pointer',
                  boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)',
                  transition: 'all 0.2s',
                  width: '100%',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isProcessingPayment ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Opening Checkout...</span>
                  </>
                ) : (
                  <span>🔒 Proceed to Checkout</span>
                )}
              </button>

              <button
                disabled={isProcessingPayment}
                onClick={handleTestCheckout}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '14px',
                  borderRadius: '14px',
                  cursor: isProcessingPayment ? 'default' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s',
                  width: '100%',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isProcessingPayment ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Initiating Test Checkout...</span>
                  </>
                ) : (
                  <span>💳 Pay Now (Test 300 Rs)</span>
                )}
              </button>
            </div>
           )}

          {paywallStep === 'checkout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
              
              {/* Processing Overlay inside Checkout */}
              {isProcessingPayment && paymentProgressStep && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: '100%',
                  background: 'rgba(13, 17, 28, 0.96)',
                  zIndex: 20,
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  padding: '24px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(14, 165, 233, 0.1)',
                    borderTopColor: '#0ea5e9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: '#0ea5e9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      color: '#fff',
                      fontSize: '13px'
                    }}>CF</div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>Cashfree Gateway</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', margin: 0, minHeight: '3em' }}>
                    {paymentProgressStep}
                  </p>
                </div>
              )}
              <div>
                <button
                  onClick={() => setPaywallStep('plans')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                    marginBottom: '10px'
                  }}
                >
                  <ChevronLeft size={16} /> Back to plans
                </button>
                
                {/* Brand header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#0ea5e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: '15px',
                    boxShadow: '0 4px 10px rgba(14, 165, 233, 0.4)'
                  }}>
                    CF
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0 }}>
                      Cashfree Checkout
                    </h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '1px 0 0 0' }}>
                      Secure Gateway Integration
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div style={{
                background: 'rgba(14, 165, 233, 0.08)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>PLAN SELECTED</span>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '2px 0 0 0' }}>
                    {paywallPlan === 'yearly' ? 'Yearly Pro (12 Months)' : 'Monthly Pro (1 Month)'}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block' }}>TOTAL AMOUNT</span>
                  <span style={{ fontSize: '18px', fontWeight: 950, color: '#fff' }}>
                    {paywallPlan === 'yearly' ? '₹ 1,800' : '₹ 300'}
                  </span>
                </div>
              </div>

              {/* Payer details & Order ID */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', fontSize: '11px', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>PAYER NAME</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{profile.name || user?.email?.split('@')[0] || 'Guest User'}</span>
                </div>
                <div style={{ display: 'flex', fontSize: '11px', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>PAYER EMAIL</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{user?.email || profile.email || 'guest@healthybit.app'}</span>
                </div>
                <div style={{ display: 'flex', fontSize: '11px', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>ORDER REFERENCE</span>
                  <span style={{ color: '#0ea5e9', fontFamily: 'monospace', fontWeight: 700 }}>
                    {currentOrderId || 'GEN_ORD_LOADING'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {paywallStep === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
                animation: 'bounce 1s infinite'
              }}>
                <Check size={36} color="#fff" />
              </div>

              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', margin: 0 }}>
                  Upgrade Successful!
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0 0' }}>
                  Welcome to HealthyBit Pro! You now have unlimited food scans, live visual camera feeds, and premium diet features.
                </p>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                padding: '14px',
                width: '100%'
              }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800 }}>Account Tier Status</span>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', margin: '4px 0 0 0' }}>⭐ PREMIUM USER ACTIVE</h4>
              </div>

              <button
                onClick={() => {
                  setShowPaywall(false);
                  setPaywallStep('plans');
                }}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
              >
                Awesome, Let's Go!
              </button>
            </div>
          )}

          {paywallStep === 'failure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)',
                animation: 'shake 0.5s ease-in-out'
              }}>
                <X size={36} color="#fff" />
              </div>

              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444', margin: 0 }}>
                  Payment Failed
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0 0' }}>
                  {paymentErrorMessage || 'Your payment transaction was not successful. Please try again.'}
                </p>
              </div>

              <button
                onClick={() => {
                  setPaywallStep('plans');
                }}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Tab Navigation & FAB Button Bar */ }
  <div className="bottom-nav">
    <button
      onClick={() => setActiveTab('home')}
      className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
    >
      <Home />
      <span>Home</span>
    </button>

    <button
      onClick={() => setActiveTab('progress')}
      className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`}
    >
      <TrendingUp />
      <span>Progress</span>
    </button>

    {/* Central Float Trigger Button */}
    <button onClick={() => setShowAddMenu(true)} className="fab-button">
      <Plus size={28} />
    </button>

    <button
      onClick={() => setActiveTab('diet')}
      className={`nav-item ${activeTab === 'diet' ? 'active' : ''}`}
    >
      <Camera />
      <span>Live Scan</span>
    </button>

    <button
      onClick={() => setActiveTab('settings')}
      className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
    >
      <Settings />
      <span>Settings</span>
    </button>
  </div>
  
  {/* Global File / Native Camera input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    style={{ display: 'none' }}
  />
  
  <input
    ref={nativeCameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleImageUpload}
    style={{ display: 'none' }}
  />

  {/* Global Toast Notification */}
  {toast && (
    <div 
      className="toast-notification animate-toast"
      style={{
        background: toast.type === 'success' 
          ? 'rgba(16, 185, 129, 0.95)' 
          : toast.type === 'error'
          ? 'rgba(239, 68, 68, 0.95)'
          : 'rgba(59, 130, 246, 0.95)',
        border: toast.type === 'success'
          ? '1px solid rgba(16, 185, 129, 0.2)'
          : toast.type === 'error'
          ? '1px solid rgba(239, 68, 68, 0.2)'
          : '1px solid rgba(59, 130, 246, 0.2)',
        color: '#fff',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {toast.type === 'success' && <Check size={16} />}
      {toast.type === 'error' && <AlertCircle size={16} />}
      {toast.type === 'info' && <Sparkles size={16} />}
      <span>{toast.message}</span>
    </div>
  )}
</div >
  );
}
