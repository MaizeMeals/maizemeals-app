import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  forceWhite?: boolean;
}

const Logo = ({ forceWhite = false }: LogoProps) => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.svg" alt="MaizeMeals Logo" width={36} height={36} />
      <div className="text-xl font-bold font-poppins">
        <span className="text-maize">Maize</span>
        <span className={cn(
            "transition-colors",
            forceWhite ? "text-white" : "text-[#004F99]"
        )}>Meals</span>
      </div>
    </Link>
  );
};

export default Logo;
