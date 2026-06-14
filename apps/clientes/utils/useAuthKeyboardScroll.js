import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

const GAP_ABOVE_KEYBOARD = 28;
const ANDROID_KEYBOARD_EXTRA = 36;

function keyboardHeightFromEvent(e, bottomInset = 0) {
  const coords = e?.endCoordinates;
  if (!coords) return 0;
  let h = Number(coords.height) || 0;
  if (typeof coords.screenY === 'number' && coords.screenY > 0) {
    const windowH = Dimensions.get('window').height;
    h = Math.max(h, windowH - coords.screenY);
  }
  if (Platform.OS === 'android') {
    return Math.max(0, h - bottomInset) + ANDROID_KEYBOARD_EXTRA;
  }
  return h;
}

/**
 * Mantiene el campo enfocado visible sobre el teclado (Auth / formularios cortos).
 */
export function useAuthKeyboardScroll(scrollRef, insets = { top: 0, bottom: 0 }) {
  const contentRef = useRef(null);
  const fieldRefs = useRef({});
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const focusedFieldRef = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFieldIntoView = useCallback(
    (fieldId, kbH = keyboardHeightRef.current) => {
      const node = fieldRefs.current[fieldId];
      const scroll = scrollRef.current;
      if (!node || !scroll || kbH <= 0) return;

      const run = () => {
        node.measureInWindow((_x, y, _w, h) => {
          const windowH = Dimensions.get('window').height;
          const visibleBottom = windowH - kbH - GAP_ABOVE_KEYBOARD;
          const fieldBottom = y + h;

          if (fieldBottom <= visibleBottom) return;

          const delta = fieldBottom - visibleBottom;
          scroll.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        });
      };

      if (Platform.OS === 'android') {
        setTimeout(run, 100);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(run));
      }
    },
    [scrollRef],
  );

  const scheduleScrollToFocused = useCallback(
    (kbH) => {
      const fid = focusedFieldRef.current;
      if (!fid || kbH <= 0) return;
      scrollFieldIntoView(fid, kbH);
      if (Platform.OS === 'android') {
        setTimeout(() => scrollFieldIntoView(fid, kbH), 180);
        setTimeout(() => scrollFieldIntoView(fid, kbH), 360);
      } else {
        setTimeout(() => scrollFieldIntoView(fid, kbH), 120);
      }
    },
    [scrollFieldIntoView],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const h = keyboardHeightFromEvent(e, insets.bottom);
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);
      setKeyboardOpen(true);
      scheduleScrollToFocused(h);
    };
    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      setKeyboardOpen(false);
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [insets.bottom, scheduleScrollToFocused]);

  const onScroll = useCallback((e) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const bindField = useCallback(
    (fieldId) => ({
      setRef: (node) => {
        fieldRefs.current[fieldId] = node;
      },
      onFocus: () => {
        focusedFieldRef.current = fieldId;
        const kbH = keyboardHeightRef.current;
        if (kbH > 0) {
          scheduleScrollToFocused(kbH);
        }
      },
    }),
    [scheduleScrollToFocused],
  );

  return {
    contentRef,
    keyboardOpen,
    keyboardHeight,
    bindField,
    onScroll,
  };
}
