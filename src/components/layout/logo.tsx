import Link from 'next/link';
import Image from 'next/image';
import { cn } from '../../lib/utils';

type LogoProps = {
  className?: string;
  showIcon?: boolean;
};

export function Logo({ className, showIcon = true }: LogoProps) {
  return (
    <Link href="/">
      <div className={cn('flex items-center gap-2', className)}>
        {showIcon && (
          <Image 
            src="https://darkgreen-lark-741030.hostingersite.com/img/logo.png"
            alt="Delvind Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        )}
        <div className={cn('text-2xl font-bold text-primary')}>
          Delvind
        </div>
      </div>
    </Link>
  );
}
