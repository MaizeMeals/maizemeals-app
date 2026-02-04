import Link from 'next/link';
import Food24FilledIcon from './icons/Food24FilledIcon';

const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Food24FilledIcon size={36} color="var(--color-maize)" />
      <div className="text-xl font-bold">
        <span className="text-maize">Maize</span>
        <span className="text-blue">Meals</span>
      </div>
    </Link>
  );
};

export default Logo;
