interface ThemeLogoProps {
  className?: string;
  title?: string;
}


export function ThemeLogo({ className = '', title = 'Griham logo' }: ThemeLogoProps) {
  return (
    <svg aria-label={title} className={`inline-block shrink-0 text-[var(--primary)] ${className}`}
      width="512" height="512" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="255.5" cy="255.5" r="52.5" fill="none" stroke="currentColor" strokeWidth="30" />
      <path d="M97 98H125V279L97 252.5V98Z" fill="currentColor" />
      <path d="M414 415H386V234L414 260.5V415Z" fill="currentColor" />
      <path d="M38 261.799L57.799 242L185.785 369.986L147.248 371.047L38 261.799Z" fill="currentColor" />
      <path d="M484.785 260.986L464.986 280.785L337 152.799L375.537 151.738L484.785 260.986Z" fill="currentColor" />
      <path d="M96 414V386L277 386L250.5 414H96Z" fill="currentColor" />
      <path d="M416 98V126L235 126L261.5 98L416 98Z" fill="currentColor" />
      <path d="M255.986 31L275.785 50.799L147.799 178.785L146.738 140.248L255.986 31Z" fill="currentColor" />
      <path d="M254.799 479.785L235 459.986L362.986 332L364.047 370.537L254.799 479.785Z" fill="currentColor" />
    </svg>

  );

}
