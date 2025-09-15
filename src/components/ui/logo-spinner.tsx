
'use client';

import { AnimatedLogo } from "../layout/animated-logo";
import { cn } from "../../lib/utils";

type LogoSpinnerProps = {
    className?: string;
};

export function LogoSpinner({ className }: LogoSpinnerProps) {
    return (
        <div className={cn("flex items-center justify-center", className)}>
            <AnimatedLogo className="w-6 h-6" />
        </div>
    );
}
