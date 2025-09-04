'use client';

import Image from "next/image";
import { cn } from "../../lib/utils";

type LogoSpinnerProps = {
    className?: string;
};

export function LogoSpinner({ className }: LogoSpinnerProps) {
    return (
        <Image 
            src="https://darkgreen-lark-741030.hostingersite.com/img/logo.png"
            alt="Carregando..."
            width={24}
            height={24}
            className={cn("animate-spin", className)}
        />
    );
}
