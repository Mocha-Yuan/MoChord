import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ImageUp, Save, UserCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { type Language, useI18n } from "../../i18n";
import { loadProfile, saveProfile, uploadAvatarImage, validateAvatarImageFile } from "../../services/profileService";
import type { ProfileFormInput, UserProfile } from "../../types/profile";

const EMPTY_FORM: ProfileFormInput = {
  displayName: "",
  avatarUrl: "",
  age: "",
  gender: "",
  guitarYears: "",
};

const COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    guestTitle: string;
    guestText: string;
    displayName: string;
    avatarUrl: string;
    avatarUpload: string;
    avatarUploading: string;
    avatarUploadHint: string;
    avatarUploaded: string;
    age: string;
    gender: string;
    genderPlaceholder: string;
    female: string;
    male: string;
    nonBinary: string;
    preferNot: string;
    other: string;
    guitarYears: string;
    save: string;
    saving: string;
    saved: string;
    loadFailed: string;
    avatarInvalid: string;
    avatarTypeInvalid: string;
    avatarSizeInvalid: string;
    avatarUploadFailed: string;
    ageInvalid: string;
    genderInvalid: string;
    guitarYearsInvalid: string;
  }
> = {
  en: {
    title: "Profile settings",
    subtitle: "Edit your avatar, name, age, gender, and guitar experience.",
    guestTitle: "Log in to edit your profile",
    guestText: "Guest mode keeps practice local. Log in to save profile details in the cloud.",
    displayName: "Name",
    avatarUrl: "Avatar URL",
    avatarUpload: "Upload avatar",
    avatarUploading: "Uploading...",
    avatarUploadHint: "JPG, PNG, or WebP. Max 2 MB.",
    avatarUploaded: "Avatar uploaded. Save the profile to keep it.",
    age: "Age",
    gender: "Gender",
    genderPlaceholder: "Select gender",
    female: "Female",
    male: "Male",
    nonBinary: "Non-binary",
    preferNot: "Prefer not to say",
    other: "Other",
    guitarYears: "Guitar years",
    save: "Save profile",
    saving: "Saving...",
    saved: "Profile saved.",
    loadFailed: "Unable to load profile.",
    avatarInvalid: "Please enter a valid http or https avatar URL.",
    avatarTypeInvalid: "Please choose a JPG, PNG, or WebP image.",
    avatarSizeInvalid: "Avatar image must be 2 MB or smaller.",
    avatarUploadFailed: "Avatar upload failed. Please check Supabase Storage and try again.",
    ageInvalid: "Age must be a whole number between 0 and 120.",
    genderInvalid: "Please select a valid gender option.",
    guitarYearsInvalid: "Guitar years must be between 0 and 100.",
  },
  zh: {
    title: "个人资料设置",
    subtitle: "修改头像、名称、年龄、性别和琴龄。",
    guestTitle: "登录后可编辑个人资料",
    guestText: "游客模式下仍可练习；登录后可以把个人资料保存到云端。",
    displayName: "名称",
    avatarUrl: "头像链接",
    avatarUpload: "上传头像",
    avatarUploading: "上传中...",
    avatarUploadHint: "支持 JPG、PNG、WebP，最大 2 MB。",
    avatarUploaded: "头像已上传，点击保存资料后生效。",
    age: "年龄",
    gender: "性别",
    genderPlaceholder: "选择性别",
    female: "女",
    male: "男",
    nonBinary: "非二元",
    preferNot: "不想透露",
    other: "其他",
    guitarYears: "琴龄",
    save: "保存资料",
    saving: "保存中...",
    saved: "个人资料已保存。",
    loadFailed: "无法读取个人资料。",
    avatarInvalid: "请输入有效的 http 或 https 头像链接。",
    avatarTypeInvalid: "请选择 JPG、PNG 或 WebP 图片。",
    avatarSizeInvalid: "头像图片不能超过 2 MB。",
    avatarUploadFailed: "头像上传失败，请确认 Supabase Storage 已配置。",
    ageInvalid: "年龄必须是 0 到 120 之间的整数。",
    genderInvalid: "请选择有效的性别选项。",
    guitarYearsInvalid: "琴龄必须在 0 到 100 年之间。",
  },
};

export function ProfileSettings() {
  const { language } = useI18n();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const copy = COPY[language];
  const [form, setForm] = useState<ProfileFormInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setForm(EMPTY_FORM);
      setMessage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadProfile()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setMessage(localizeError(result.error, copy));
          setIsSuccess(false);
          return;
        }
        setForm(profileToForm(result.data, user?.email ?? ""));
      })
      .catch(() => {
        if (!cancelled) {
          setMessage(copy.loadFailed);
          setIsSuccess(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy, isAuthenticated, user?.email]);

  const avatarPreview = useMemo(() => form.avatarUrl.trim(), [form.avatarUrl]);
  const initials = useMemo(() => getInitials(form.displayName || user?.email || "CF"), [form.displayName, user?.email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setIsSuccess(false);

    const result = await saveProfile(form);
    setSaving(false);

    if (result.error) {
      setMessage(localizeError(result.error, copy));
      return;
    }

    setForm(profileToForm(result.data, user?.email ?? ""));
    setIsSuccess(true);
    setMessage(copy.saved);
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const validation = validateAvatarImageFile(file);
    if (validation.error) {
      setMessage(localizeError(validation.error, copy));
      setIsSuccess(false);
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);
    setIsSuccess(false);

    const result = await uploadAvatarImage(file);
    setUploadingAvatar(false);

    if (result.error || !result.url) {
      setMessage(localizeError(result.error ?? "avatarUploadFailed", copy));
      return;
    }

    updateField("avatarUrl", result.url);
    setIsSuccess(true);
    setMessage(copy.avatarUploaded);
  }

  function updateField(field: keyof ProfileFormInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <section className="profile-settings-card">
        <div>
          <strong>{copy.guestTitle}</strong>
          <p>{copy.guestText}</p>
        </div>
      </section>
    );
  }

  return (
    <form className="profile-settings-card" onSubmit={handleSubmit}>
      <div className="profile-settings-heading">
        <div className="profile-avatar-preview">
          {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>{initials}</span>}
        </div>
        <div>
          <strong>{copy.title}</strong>
          <p>{copy.subtitle}</p>
        </div>
      </div>

      <div className="profile-settings-grid">
        <label>
          <span>{copy.displayName}</span>
          <input
            value={form.displayName}
            disabled={loading || saving || uploadingAvatar}
            onChange={(event) => updateField("displayName", event.target.value)}
          />
        </label>
        <label>
          <span>{copy.avatarUrl}</span>
          <input
            type="url"
            value={form.avatarUrl}
            disabled={loading || saving || uploadingAvatar}
            placeholder="https://..."
            onChange={(event) => updateField("avatarUrl", event.target.value)}
          />
        </label>
        <div className="profile-avatar-upload-field">
          <span>{copy.avatarUpload}</span>
          <label className="profile-upload-button">
            <ImageUp size={16} aria-hidden="true" />
            {uploadingAvatar ? copy.avatarUploading : copy.avatarUpload}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={loading || saving || uploadingAvatar}
              onChange={handleAvatarFileChange}
            />
          </label>
          <small>{copy.avatarUploadHint}</small>
        </div>
        <label>
          <span>{copy.age}</span>
          <input
            type="number"
            min="0"
            max="120"
            step="1"
            value={form.age}
            disabled={loading || saving || uploadingAvatar}
            onChange={(event) => updateField("age", event.target.value)}
          />
        </label>
        <label>
          <span>{copy.gender}</span>
          <select
            value={form.gender}
            disabled={loading || saving || uploadingAvatar}
            onChange={(event) => updateField("gender", event.target.value)}
          >
            <option value="">{copy.genderPlaceholder}</option>
            <option value="female">{copy.female}</option>
            <option value="male">{copy.male}</option>
            <option value="non_binary">{copy.nonBinary}</option>
            <option value="prefer_not_to_say">{copy.preferNot}</option>
            <option value="other">{copy.other}</option>
          </select>
        </label>
        <label>
          <span>{copy.guitarYears}</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.guitarYears}
            disabled={loading || saving || uploadingAvatar}
            onChange={(event) => updateField("guitarYears", event.target.value)}
          />
        </label>
      </div>

      {message ? <p className={isSuccess ? "profile-settings-message success" : "profile-settings-message error"}>{message}</p> : null}

      <button type="submit" className="profile-save-button" disabled={loading || saving || uploadingAvatar}>
        {saving || uploadingAvatar ? <UserCircle size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {saving ? copy.saving : copy.save}
      </button>
    </form>
  );
}

function profileToForm(profile: UserProfile | null, fallbackName: string): ProfileFormInput {
  return {
    displayName: profile?.display_name ?? fallbackName,
    avatarUrl: profile?.avatar_url ?? "",
    age: profile?.age === null || profile?.age === undefined ? "" : String(profile.age),
    gender: profile?.gender ?? "",
    guitarYears: profile?.guitar_years === null || profile?.guitar_years === undefined ? "" : String(profile.guitar_years),
  };
}

function localizeError(error: string, copy: (typeof COPY)[Language]): string {
  if (error === "avatar") return copy.avatarInvalid;
  if (error === "type") return copy.avatarTypeInvalid;
  if (error === "size") return copy.avatarSizeInvalid;
  if (error === "avatarUploadFailed" || error.toLowerCase().includes("storage") || error.toLowerCase().includes("bucket")) {
    return copy.avatarUploadFailed;
  }
  if (error === "age") return copy.ageInvalid;
  if (error === "gender") return copy.genderInvalid;
  if (error === "guitarYears") return copy.guitarYearsInvalid;
  if (error.toLowerCase().includes("supabase is not configured")) return copy.guestText;
  return error;
}

function getInitials(value: string): string {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF"
  );
}
