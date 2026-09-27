export function BrandLogo({ className = "" }: { readonly className?: string }) {
  return (
    <span aria-hidden="true" className={`brand-logo ${className}`}>
      <img className="brand-logo-dark-background" src="/brand/logo-white.png" alt="" />
      <img className="brand-logo-light-background" src="/brand/logo-dark.png" alt="" />
    </span>
  );
}
