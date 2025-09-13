
declare module 'react-rating-stars-component' {
  import React from 'react';

  interface ReactStarsProps {
    count: number;
    onChange?: (newRating: number) => void;
    size?: number;
    isHalf?: boolean;
    value?: number;
    edit?: boolean;
    activeColor?: string;
    [key: string]: any; // Allow other props
  }

  const ReactStars: React.FC<ReactStarsProps>;
  export default ReactStars;
}
