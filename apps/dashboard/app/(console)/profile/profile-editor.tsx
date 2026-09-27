"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Pencil, Trash2, X } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { dashboardPath } from "@/lib/paths";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function ProfileEditor({
  avatarUrl,
  displayName,
}: {
  readonly avatarUrl: string | null;
  readonly displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);

  useEffect(() => {
    if (avatarFile === null) return;
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    if (file === null) return;
    if (AVATAR_EXTENSIONS[file.type] === undefined) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profile pictures must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    setAvatarRemoved(false);
    setAvatarFile(file);
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setPreviewUrl(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    let nextAvatarUrl = avatarRemoved ? null : avatarUrl;

    if (avatarFile !== null) {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError !== null || userData.user === null) {
        setError(
          userError?.message ??
            "Your session has expired. Please sign in again.",
        );
        setPending(false);
        return;
      }

      const extension = AVATAR_EXTENSIONS[avatarFile.type];
      if (extension === undefined) {
        setError("Choose a JPG, PNG, or WebP image.");
        setPending(false);
        return;
      }

      const objectPath = `${userData.user.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, avatarFile, {
          cacheControl: "3600",
          contentType: avatarFile.type,
          upsert: true,
        });
      if (uploadError !== null) {
        setError(uploadError.message);
        setPending(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(objectPath);
      nextAvatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    }

    const response = await fetch(dashboardPath("/api/profile"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        avatarUrl: nextAvatarUrl,
        displayName: form.get("displayName"),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      readonly error?: string;
    } | null;
    if (!response.ok) {
      setError(body?.error ?? "Profile update failed");
      setPending(false);
      return;
    }
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <button
        className="secondary-button profile-edit-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Pencil size={15} />
        Edit profile
      </button>
      {open ? (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2>Edit profile</h2>
                <p>Update the identity shown in your security workspace.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </header>
            <form onSubmit={submit}>
              <div className="avatar-upload">
                <span
                  className="avatar-upload-preview"
                  style={
                    previewUrl === null
                      ? undefined
                      : { backgroundImage: `url(${previewUrl})` }
                  }
                >
                  {previewUrl === null ? <ImagePlus size={22} /> : null}
                </span>
                <div>
                  <label className="secondary-button avatar-upload-button">
                    Choose picture
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selectAvatar}
                      type="file"
                    />
                  </label>
                  <button
                    className="avatar-remove-button"
                    disabled={previewUrl === null}
                    onClick={removeAvatar}
                    type="button"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                  <small>JPG, PNG, or WebP. Maximum 2 MB.</small>
                </div>
              </div>
              <label>
                Display name
                <input defaultValue={displayName} name="displayName" required />
              </label>
              {error === null ? null : <p className="form-error">{error}</p>}
              <footer>
                <button
                  className="secondary-button"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? <LoaderCircle className="spin" size={15} /> : null}
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
