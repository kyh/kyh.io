/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "motion/react";

import type { Placement } from "@floating-ui/react";

type TooltipOptions = {
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const useTooltip = ({
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TooltipOptions = {}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip({
        fallbackAxisSideDirection: "start",
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
  });

  const context = data.context;

  const hover = useHover(context, {
    move: false,
    enabled: controlledOpen == null,
  });
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return React.useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
};

type ContextType = ReturnType<typeof useTooltip> | null;

const TooltipContext = React.createContext<ContextType>(null);

export const useTooltipContext = () => {
  const context = React.useContext(TooltipContext);

  if (context == null) {
    throw new Error("Tooltip components must be wrapped in <Tooltip />");
  }

  return context;
};

export const Tooltip = ({
  children,
  ...options
}: { children: React.ReactNode } & TooltipOptions) => {
  const tooltip = useTooltip(options);

  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & { asChild?: boolean }
>(({ children, asChild = false, ...props }, propRef) => {
  const context = useTooltipContext();
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...(children.props as object),
        // @ts-expect-error data-state and data-side are valid props
        "data-state": context.open ? "open" : "closed",
        "data-side": context.placement.split("-")[0],
      }),
    );
  }

  return (
    <button
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? "open" : "closed"}
      data-side={context.placement.split("-")[0]}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
});

TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & {
    type?: "default" | "block";
  }
>(({ className, type = "default", ...props }, propRef) => {
  const context = useTooltipContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);
  const { children: floatingPropsChildren, ...floatingProps } =
    context.getFloatingProps(props);
  const children = floatingPropsChildren as React.ReactNode;
  const blockType = type === "block";

  const tooltipMotionProps = blockType
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.23 },
      };

  const contentMotionProps = blockType
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { delay: totalDelay * 2 } },
        exit: { opacity: 0 },
      }
    : {};

  return (
    <FloatingPortal>
      <AnimatePresence>
        {context.open && (
          <motion.div
            className={`tooltip ${blockType ? "block" : ""} ${className ?? ""} ${!blockType ? "bg-panel rounded-md border border-[var(--border-color)] px-2 py-0.5 text-xs whitespace-pre text-[var(--body-color)]" : ""}`}
            ref={ref}
            style={context.floatingStyles}
            {...tooltipMotionProps}
            {...floatingProps}
          >
            {blockType && <TooltipBlocks context={context} />}
            <motion.div className="content" {...contentMotionProps}>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {blockType && (
        <AnimatePresence>
          {context.open && <TooltipLines context={context} />}
        </AnimatePresence>
      )}
    </FloatingPortal>
  );
});

TooltipContent.displayName = "TooltipContent";

const easeInOutQuint = (x: number) => {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
};

const TooltipLines = ({ context }: { context: ContextType }) => {
  const floatingEl = context?.elements.floating;

  if (!floatingEl || !context.x || !context.y) return null;

  return (
    <>
      <motion.div
        className="tooltip-line tooltip-line-h"
        initial={{ opacity: 0, top: -1 }}
        animate={{ opacity: 1, top: context.y }}
        exit={{ opacity: 0, top: -1 }}
        transition={{
          ease: easeInOutQuint,
          duration: 1,
        }}
      />
      <motion.div
        className="tooltip-line tooltip-line-h"
        initial={{ opacity: 0, top: "100dvh" }}
        animate={{ opacity: 1, top: context.y + floatingEl.offsetHeight }}
        exit={{ opacity: 0, top: "100dvh" }}
        transition={{
          ease: easeInOutQuint,
          duration: 1,
        }}
      />
      <motion.div
        className="tooltip-line tooltip-line-v"
        style={{ height: document.documentElement.scrollHeight }}
        initial={{ opacity: 0, left: -1 }}
        animate={{ opacity: 1, left: context.x }}
        exit={{ opacity: 0, left: -1 }}
        transition={{
          ease: easeInOutQuint,
          duration: 1,
        }}
      />
      <motion.div
        className="tooltip-line tooltip-line-v"
        style={{ height: document.documentElement.scrollHeight }}
        initial={{ opacity: 0, left: "100dvw" }}
        animate={{ opacity: 1, left: context.x + floatingEl.offsetWidth }}
        exit={{ opacity: 0, left: "100dvw" }}
        transition={{
          ease: easeInOutQuint,
          duration: 1,
        }}
      />
    </>
  );
};

const cols = 11;
const rows = 8;
const duration = 0.07;
const baseDelay = duration / 2;
const blocks = Array.from({ length: cols * rows }, (_, i) => i);

const calculateDelay = (n: number) =>
  baseDelay * Math.floor(n / cols) + baseDelay * (n % cols);

const totalDelay = calculateDelay(cols * rows);

const TooltipBlocks = ({ context }: { context: ContextType }) => {
  if (!context?.x || !context.y) return null;

  return (
    <div
      className="tooltip-blocks-container"
      style={{ "--cols": cols, "--rows": rows } as React.CSSProperties}
    >
      {blocks.map((i) => (
        <motion.div
          key={i}
          className="tooltip-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration,
            delay: calculateDelay(i),
          }}
        />
      ))}
    </div>
  );
};
