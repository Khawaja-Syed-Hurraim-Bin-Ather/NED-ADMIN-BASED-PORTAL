import React, { HTMLAttributes } from 'react';
import { cn } from '../utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive';
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-[#14212c]/90 border-[rgba(213,228,236,0.13)] shadow-lg shadow-black/40',
    glass: 'bg-[#14212c]/70 backdrop-blur-md border-[rgba(213,228,236,0.13)] shadow-xl shadow-black/30',
    interactive:
      'bg-[#14212c]/85 border-[rgba(213,228,236,0.13)] hover:border-[rgba(155,203,208,0.4)] hover:bg-[#182733] transition-all duration-200 cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1',
  };

  return (
    <div
      className={cn(
        'rounded-xl border text-slate-100 overflow-hidden',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 space-y-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-base font-semibold leading-none tracking-tight text-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-slate-400', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-5 pt-0 gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}
