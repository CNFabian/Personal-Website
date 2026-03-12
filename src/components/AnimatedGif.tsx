import React from 'react';

interface AnimatedGifProps {
  src: string;
  alt: string;
  className?: string;
}

const AnimatedGif: React.FC<AnimatedGifProps> = ({ src, alt, className = 'pixel-animation' }) => {
  return <img src={src} alt={alt} className={className} />;
};

export default AnimatedGif;
