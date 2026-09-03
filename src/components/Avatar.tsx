import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface AvatarProps {
  width: number;
  borderRadius?: number | string;
  fontSize?: number;
  fontWeight?: number | string;
  className?: string;
  data: {
    name: string;
    image?: string | null;
  };
}

const Avatar = ({
  borderRadius = '50%',
  fontSize = 16,
  fontWeight = 400,
  width,
  data,
  className,
}: AvatarProps) => {
  const { name, image } = data;
  const [failedImage, setFailedImage] = useState(false);

  useEffect(() => setFailedImage(false), [image]);

  if (image && !failedImage)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        style={{ width, height: width, borderRadius }}
        className={clsx('block aspect-square shrink-0 object-cover', className)}
        src={image}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setFailedImage(true)}
      />
    );

  return (
    <div
      style={{
        width,
        borderRadius,
        fontSize: `${fontSize}px`,
        fontWeight,
        backgroundColor: 'rgba(239,225,245,0.25)',
      }}
      className={clsx(
        'shrink-0 aspect-square uppercase text-white font-sans-serif font-medium flex items-center justify-center',
        className
      )}
    >
      <div className="select-none">{name.trim().charAt(0) || '?'}</div>
    </div>
  );
};

export default Avatar;
