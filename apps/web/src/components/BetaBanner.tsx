interface BetaBannerProps {
  message?: string;
}

export function BetaBanner({ 
  message = "We're currently in beta. Currently all accounts have access to all features. Thanks for being an early adopter!" 
}: BetaBannerProps) {
  return (
    <div className="sm:h-[30px] bg-yellow-100 text-slate-800 flex items-center justify-center text-sm px-4 relative py-1">
      <div className="max-w-7xl mx-auto w-full text-center">
        {message}
      </div>
    </div>
  );
}
