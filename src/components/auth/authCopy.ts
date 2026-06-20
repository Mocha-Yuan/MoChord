import type { Language } from "../../i18n";
import type { SyncStatus } from "../../types/progress";

export type AuthCopy = {
  dialogLabel: string;
  close: string;
  loginTitle: string;
  loginSubtitle: string;
  email: string;
  password: string;
  login: string;
  loggingIn: string;
  createAccount: string;
  registerTitle: string;
  registerSubtitle: string;
  displayName: string;
  confirmPassword: string;
  creating: string;
  alreadyHaveAccount: string;
  missingLoginFields: string;
  shortPassword: string;
  passwordMismatch: string;
  emailConfirmation: string;
  retrySync: string;
  logout: string;
  userFallback: string;
  sync: Record<SyncStatus, string>;
};

export const AUTH_COPY: Record<Language, AuthCopy> = {
  en: {
    dialogLabel: "MoChord account",
    close: "Close",
    loginTitle: "Log in to MoChord",
    loginSubtitle: "Sync your chord practice progress across devices.",
    email: "Email",
    password: "Password",
    login: "Log in",
    loggingIn: "Logging in...",
    createAccount: "Create an account",
    registerTitle: "Save your MoChord trail",
    registerSubtitle: "Create an account to enable cloud sync for practice and learning data.",
    displayName: "Display name",
    confirmPassword: "Confirm password",
    creating: "Creating...",
    alreadyHaveAccount: "Already have an account?",
    missingLoginFields: "Please enter your email and password.",
    shortPassword: "Password must be at least 6 characters.",
    passwordMismatch: "Passwords do not match.",
    emailConfirmation: "Registration succeeded. Please check your email to finish verification.",
    retrySync: "Retry sync",
    logout: "Log out",
    userFallback: "MoChord user",
    sync: {
      guest: "Guest mode: log in to save",
      idle: "Ready to sync",
      loading: "Checking sync",
      syncing: "Syncing",
      synced: "Cloud sync on",
      error: "Saved locally",
    },
  },
  zh: {
    dialogLabel: "MoChord 账号",
    close: "关闭",
    loginTitle: "登录 MoChord",
    loginSubtitle: "登录后同步你的和弦练习进度。",
    email: "邮箱",
    password: "密码",
    login: "登录",
    loggingIn: "登录中...",
    createAccount: "创建账号",
    registerTitle: "保存我的 MoChord 学习轨迹",
    registerSubtitle: "创建账号后可开启练习与学习数据云端同步。",
    displayName: "显示名称",
    confirmPassword: "确认密码",
    creating: "创建中...",
    alreadyHaveAccount: "已有账号？去登录",
    missingLoginFields: "请输入邮箱和密码。",
    shortPassword: "密码至少需要 6 位。",
    passwordMismatch: "两次输入的密码不一致。",
    emailConfirmation: "注册成功，请检查邮箱完成验证。",
    retrySync: "重试同步",
    logout: "退出登录",
    userFallback: "MoChord 用户",
    sync: {
      guest: "游客模式：登录后可云端保存",
      idle: "准备同步",
      loading: "正在检查同步",
      syncing: "正在同步",
      synced: "云端同步已开启",
      error: "同步失败，已保存在本地",
    },
  },
};

export function getLocalizedAuthError(message: string, copy: AuthCopy): string {
  const lower = message.toLowerCase();
  if (lower.includes("supabase is not configured")) return copy.sync.guest;
  if (lower.includes("valid email")) return copy.missingLoginFields;
  if (lower.includes("at least 6")) return copy.shortPassword;
  if (lower.includes("login failed") || lower.includes("invalid credentials")) {
    return copy === AUTH_COPY.zh ? "登录失败，请检查邮箱或密码。" : copy.missingLoginFields;
  }
  if (lower.includes("network")) {
    return copy === AUTH_COPY.zh ? "网络异常，请稍后再试。" : "Network error. Please try again.";
  }
  return message;
}
