import React from 'react';
import logoSrc from '../assets/images/ideathon_logo.png';

interface IdeathonLogoProps {
  className?: string;
  alt?: string;
}

export const IdeathonLogo: React.FC<IdeathonLogoProps> = ({
  className = 'w-full max-w-xl sm:max-w-2xl h-auto',
  alt = "IdeaForge'26",
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      <img
        src={logoSrc || '/ideathon-logo.png'}
        alt={alt}
        className={`object-contain bg-transparent drop-shadow-[0_10px_25px_rgba(139,92,246,0.25)] transition-transform duration-300 hover:scale-[1.01] ${className}`}
        loading="eager"
      />
    </div>
  );
};
