import logoIcon from '@/assets/icon.png';

interface ThemeLogoProps {
  className?: string;
  title?: string;
}


export function ThemeLogo({ className = '', title = 'Griham logo' }: ThemeLogoProps) {
  return (
    // <svg aria-label={title} width="341" height="341" viewBox="0 0 341 341" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block shrink-0 text-[var(--primary)] ${className}`}>
    //   <path d="M343 343H0V320.392C41.6326 343.133 92.4874 348.484 140.522 330.86C183.28 315.173 215.97 284.156 234.659 246.307L245.148 274.897L294.905 256.642L245.478 121.923L110.289 171.523L128.373 220.811L163.174 208.042C153.585 228.991 135.96 246.254 112.622 254.816C68.0907 271.155 18.9416 249.882 0 207.129V134.465C9.49073 113.102 27.2877 95.4583 50.9668 86.7705C89.7369 72.5459 132.008 86.83 154.797 118.978L232.257 90.5576C192.905 16.5389 103.983 -18.9617 23.0664 10.7266C15.0111 13.682 7.31438 17.1842 0 21.1709V0H343V343Z" fill="currentColor" />
    // </svg>
    <svg aria-label={title} className={`inline-block shrink-0 text-[var(--primary)] ${className}`}
      width="503" height="503" viewBox="0 0 503 503" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M247 125.039C179.22 127.409 125 183.101 125 251.459C125 321.323 181.636 377.959 251.5 377.959C298.631 377.959 339.741 352.183 361.505 313.959H248V187.959H503V237.959H502.642C502.878 242.429 503 246.93 503 251.459C503 390.359 390.4 502.959 251.5 502.959C112.6 502.959 0 390.359 0 251.459C0 114.062 110.177 2.40068 247 0V125.039Z" fill="currentColor" />
      <path d="M242 0H310.5C345.018 0 373 27.9822 373 62.5V62.5C373 97.0178 345.018 125 310.5 125H242V0Z" fill="currentColor" />
    </svg>
  );

}
