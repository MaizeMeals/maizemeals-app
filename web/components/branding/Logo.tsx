import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MaizeIcon } from './MaizeIcon';

interface LogoProps {
  forceWhite?: boolean;
}

const Logo = ({ forceWhite = false }: LogoProps) => {
  return (
    <Link href="/" className="flex items-center gap-1.5">
      <MaizeIcon forceWhite={forceWhite} className="w-7 h-7 shrink-0" />
      <div className="text-lg font-heading font-bold">
        <span className="text-maize">Maize</span>
        <span className={cn(
            "transition-colors",
            forceWhite ? "text-white" : "text-umich-blue dark:text-white"
        )}>Meals</span>
      </div>
    </Link>
  );
};

export default Logo;
