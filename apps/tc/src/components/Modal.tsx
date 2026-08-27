import { boxShadow } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import * as stylex from "@stylexjs/stylex";
import {
  colors,
  containers,
  defaults,
  easings,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

/** Headless UI applies these as class strings during the transition, so they are
 * emitted through stylex.props(...).className rather than spread onto an element. */
const styles = stylex.create({
  dialog: { position: "relative", zIndex: 10 },
  easeOut: { transitionTimingFunction: easings.out, transitionDuration: "0.3s" },
  easeIn: { transitionTimingFunction: easings.in, transitionDuration: "0.2s" },
  opacity0: { opacity: 0 },
  opacity100: { opacity: 1 },
  scale95: { scale: "95% 95%" },
  scale100: { scale: "100% 100%" },
  backdrop: { position: "fixed", inset: 0, backgroundColor: colors.black },
  scroller: { position: "fixed", inset: 0, overflowY: "auto" },
  center: {
    display: "flex",
    justifyContent: "center",
    paddingInline: spacing[4],
    paddingBlock: spacing[10],
    textAlign: "center",
  },
  panel: {
    width: "100%",
    maxWidth: containers.xl,
    overflow: "hidden",
    borderRadius: radii["2xl"],
    backgroundColor: colors.black,
    padding: spacing[6],
    textAlign: "left",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate300,
    boxShadow: boxShadow.xl,
    transitionProperty: transitionProperty.all,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  title: {
    fontSize: fontSizes.lg,
    lineHeight: spacing[6],
    fontWeight: fontWeights.medium,
    color: colors.slate50,
  },
});

const cx = (...s: stylex.StyleXStyles[]) => stylex.props(...s).className ?? "";

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  return { isOpen, closeModal, openModal };
};

export type Props = {
  title?: React.ReactNode;
  children: React.ReactNode;
} & ReturnType<typeof useModal>;

export const Modal = ({ isOpen, closeModal, title, children }: Props) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" {...stylex.props(styles.dialog)} onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter={cx(styles.easeOut)}
          enterFrom={cx(styles.opacity0)}
          enterTo={cx(styles.opacity100)}
          leave={cx(styles.easeIn)}
          leaveFrom={cx(styles.opacity100)}
          leaveTo={cx(styles.opacity0)}
        >
          <div {...stylex.props(styles.backdrop)} />
        </Transition.Child>

        <div {...stylex.props(styles.scroller)}>
          <div {...stylex.props(styles.center)}>
            <Transition.Child
              as={Fragment}
              enter={cx(styles.easeOut)}
              enterFrom={cx(styles.opacity0, styles.scale95)}
              enterTo={cx(styles.opacity100, styles.scale100)}
              leave={cx(styles.easeIn)}
              leaveFrom={cx(styles.opacity100, styles.scale100)}
              leaveTo={cx(styles.opacity0, styles.scale95)}
            >
              <Dialog.Panel {...stylex.props(styles.panel)}>
                {title && (
                  <Dialog.Title as="h3" {...stylex.props(styles.title)}>
                    {title}
                  </Dialog.Title>
                )}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
