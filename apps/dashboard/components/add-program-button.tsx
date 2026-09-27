"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NewProgramForm } from "@/app/(console)/programs/new/program-form";

export function AddProgramButton({
  className = "primary-button",
}: {
  readonly className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (window.location.search.includes("add=1")) {
        router.replace("/programs");
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, router]);

  function close() {
    setOpen(false);
    if (window.location.search.includes("add=1")) router.replace("/programs");
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        <Plus size={16} />
        <span>Add program</span>
      </button>
      {open ? (
        <div className="modal-overlay" onMouseDown={close} role="presentation">
          <section
            aria-label="Add monitored program"
            aria-modal="true"
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <div>
                <h2>Add program</h2>
                <p>
                  Name the project and establish a finalized deployment
                  baseline.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={close}
                type="button"
              >
                <X size={17} />
              </button>
            </header>
            <NewProgramForm
              onCancel={close}
              onSuccess={() => {
                close();
                router.refresh();
              }}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
