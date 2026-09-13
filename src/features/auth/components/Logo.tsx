import logoUrl from "../../../assets/ugem-logo.png";
import logoDarkUrl from "../../../assets/ugem-logo-dark.png";

export function Logo() {
  return (
    <>
      <img
        className="logo-mark dark:hidden"
        src={logoUrl}
        alt="UFind"
        aria-label="UFind"
      />
      <img
        className="logo-mark hidden dark:block drop-shadow-[0_0_16px_rgba(56,189,248,0.28)]"
        src={logoDarkUrl}
        alt="UFind"
        aria-label="UFind"
      />
    </>
  );
}
