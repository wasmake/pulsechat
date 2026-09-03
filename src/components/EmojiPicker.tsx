import { ComponentType, useEffect, useState } from 'react';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import { usePopper } from 'react-popper';

interface EmojiPickerProps {
  ButtonIconComponent: ComponentType;
  buttonClassName?: string;
  wrapperClassName?: string;
  onEmojiSelect: (e: { id: string; native: string }) => void;
  onOpen?: () => void;
}

const EmojiPicker = ({
  buttonClassName,
  ButtonIconComponent,
  onEmojiSelect,
  onOpen,
  wrapperClassName,
}: EmojiPickerProps) => {
  const [displayPicker, setDisplayPicker] = useState(false);
  const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const { attributes, styles } = usePopper(referenceElement, popperElement, {
    placement: 'top-end',
  });

  useEffect(() => {
    if (!referenceElement) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const rootNode = target.getRootNode() as ShadowRoot;
      if (
        popperElement?.contains(!!rootNode?.host ? rootNode?.host : target) ||
        referenceElement.contains(target)
      ) {
        return;
      }
      setDisplayPicker(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [referenceElement, popperElement]);

  return (
    <div className={wrapperClassName}>
      {displayPicker && (
        <div
          ref={setPopperElement}
          {...attributes.popper}
          style={styles.popper}
          className="z-50"
        >
          <Picker
            data={emojiData}
            onEmojiSelect={(emoji: { id: string; native: string }) => {
              onEmojiSelect(emoji);
              setDisplayPicker(false);
            }}
            placement="top-start"
          />
        </div>
      )}
      <button
        ref={setReferenceElement}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (!displayPicker) onOpen?.();
          setDisplayPicker((prev) => !prev);
        }}
        aria-expanded={displayPicker}
        aria-label="Emoji picker"
        className={buttonClassName}
      >
        <ButtonIconComponent />
      </button>
    </div>
  );
};

export default EmojiPicker;
