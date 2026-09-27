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
import { cn } from "cn";

// Global lines context - lines are rendered once at provider level
interface LinesPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipLinesContextType {
  updatePosition: (id: string, pos: LinesPosition | null) => void;
}

const TooltipLinesContext = React.createContext<TooltipLinesContextType | null>(null);

const easeInOutQuint = (x: number) =>
  x < 0.5 ? 16 * x * x * x * x * x : 1 - (-2 * x + 2) ** 5 / 2;

// Single set of lines rendered at provider level
const TooltipLines = ({ position }: { position: LinesPosition | null }) => {
  const [scrollHeight, setScrollHeight] = React.useState(0);

  // The vertical line spans the whole document, so track the page height rather
  // than sampling it once per tooltip open.
  React.useEffect(() => {
    const observer = new ResizeObserver(() =>
      setScrollHeight(document.documentElement.scrollHeight),
    );
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {position && (
        <>
          <motion.div
            className="tooltip-line tooltip-line-h"
            initial={{ opacity: 0, top: -1 }}
            animate={{ opacity: 1, top: position.y }}
            exit={{ opacity: 0, top: -1 }}
            transition={{ duration: 1, ease: easeInOutQuint }}
          />
          <motion.div
            className="tooltip-line tooltip-line-h"
            initial={{ opacity: 0, top: "100dvh" }}
            animate={{ opacity: 1, top: position.y + position.height }}
            exit={{ opacity: 0, top: "100dvh" }}
            transition={{ duration: 1, ease: easeInOutQuint }}
          />
          <motion.div
            className="tooltip-line tooltip-line-v"
            style={{ height: scrollHeight }}
            initial={{ left: -1, opacity: 0 }}
            animate={{ left: position.x, opacity: 1 }}
            exit={{ left: -1, opacity: 0 }}
            transition={{ duration: 1, ease: easeInOutQuint }}
          />
          <motion.div
            className="tooltip-line tooltip-line-v"
            style={{ height: scrollHeight }}
            initial={{ left: "100dvw", opacity: 0 }}
            animate={{ left: position.x + position.width, opacity: 1 }}
            exit={{ left: "100dvw", opacity: 0 }}
            transition={{ duration: 1, ease: easeInOutQuint }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [position, setPosition] = React.useState<LinesPosition | null>(null);
  const positionsRef = React.useRef<Map<string, LinesPosition>>(new Map());

  const updatePosition = React.useCallback((id: string, pos: LinesPosition | null) => {
    if (pos) {
      positionsRef.current.set(id, pos);
      setPosition(pos);
    } else {
      positionsRef.current.delete(id);
      // Use any remaining open tooltip's position, or null
      const remaining = [...positionsRef.current.values()];
      setPosition(remaining.length > 0 ? (remaining.at(-1) ?? null) : null);
    }
  }, []);

  const linesContext = React.useMemo(() => ({ updatePosition }), [updatePosition]);

  return (
    <TooltipLinesContext.Provider value={linesContext}>
      {children}
      <TooltipLines position={position} />
    </TooltipLinesContext.Provider>
  );
};

interface TooltipOptions {
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const useTooltip = ({
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TooltipOptions = {}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;
  const uncontrolled = controlledOpen === undefined;

  const data = useFloating({
    middleware: [
      offset(5),
      flip({
        fallbackAxisSideDirection: "start",
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
    onOpenChange: setOpen,
    open,
    placement,
    whileElementsMounted: autoUpdate,
  });

  const { context } = data;

  const hover = useHover(context, {
    enabled: uncontrolled,
    move: false,
  });
  const focus = useFocus(context, {
    enabled: uncontrolled,
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

const useTooltipContext = () => {
  const context = React.useContext(TooltipContext);

  if (context === null) {
    throw new Error("Tooltip components must be wrapped in <Tooltip />");
  }

  return context;
};

const Tooltip = ({ children, ...options }: { children: React.ReactNode } & TooltipOptions) => {
  const tooltip = useTooltip(options);

  return <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>;
};

const TooltipTrigger = ({
  children,
  asChild = false,
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLElement> & { asChild?: boolean; ref?: React.Ref<HTMLElement> }) => {
  const context = useTooltipContext();
  const childrenRef = React.isValidElement<{ ref?: React.Ref<unknown> }>(children)
    ? children.props.ref
    : undefined;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  if (asChild && React.isValidElement<React.HTMLProps<HTMLElement>>(children)) {
    // SAFETY: asChild hands rendering to the child element, whose props are a
    // DOM prop bag by contract; getReferenceProps only merges and augments
    // them, so the merged object is valid HTMLProps for that element.
    // oxlint-disable-next-line react/no-clone-element -- asChild is the Slot pattern: the child element is the trigger, so its props must be merged onto it
    return React.cloneElement(children, {
      ...context.getReferenceProps({
        ...props,
        ...children.props,
        "data-side": context.placement.split("-")[0],
        "data-state": context.open ? "open" : "closed",
      } as React.HTMLProps<HTMLElement>),
      ref,
    });
  }

  return (
    <button
      type="button"
      ref={ref}
      data-state={context.open ? "open" : "closed"}
      data-side={context.placement.split("-")[0]}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
};

const cols = 11;
const rows = 8;
const duration = 0.07;
const baseDelay = duration / 2;
const blocks = Array.from({ length: cols * rows }, (_, i) => i);
const calculateDelay = (n: number) => baseDelay * Math.floor(n / cols) + baseDelay * (n % cols);
const totalDelay = calculateDelay(cols * rows);

// SAFETY: CSS custom properties are valid inline styles, but React.CSSProperties
// has no index signature for `--*` keys; the object holds nothing else.
const tooltipBlocksStyle = { "--cols": cols, "--rows": rows } as React.CSSProperties;

const TooltipBlocks = ({ context }: { context: ContextType }) => {
  if (!context?.x || !context.y) {
    return null;
  }

  return (
    <div className="tooltip-blocks-container" style={tooltipBlocksStyle}>
      {blocks.map((i) => (
        <motion.div
          key={i}
          className="tooltip-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: calculateDelay(i), duration }}
        />
      ))}
    </div>
  );
};

const tooltipFadeProps = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
  transition: { duration: 0.23 },
};

const blockContentProps = {
  animate: { opacity: 1, transition: { delay: totalDelay * 2 } },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
};

const TooltipContent = ({
  className,
  type = "default",
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLDivElement> & {
  type?: "default" | "block";
  ref?: React.Ref<HTMLDivElement>;
}) => {
  const context = useTooltipContext();
  const linesContext = React.useContext(TooltipLinesContext);
  const tooltipId = React.useId();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);
  const { children: floatingPropsChildren, ...floatingProps } = context.getFloatingProps(props);
  // SAFETY: `children` entered this component as ReactNode via props;
  // getFloatingProps forwards it untouched inside its untyped prop bag.
  const children = floatingPropsChildren as React.ReactNode;
  const blockType = type === "block";

  // Update global lines position when this tooltip opens/closes/moves
  React.useLayoutEffect(() => {
    if (!blockType || !linesContext) {
      return;
    }
    const { updatePosition } = linesContext;

    if (context.open && context.x !== null && context.y !== null) {
      const floatingEl = context.elements.floating;
      if (floatingEl) {
        updatePosition(tooltipId, {
          height: floatingEl.offsetHeight,
          width: floatingEl.offsetWidth,
          x: context.x,
          y: context.y,
        });
      }
    } else {
      updatePosition(tooltipId, null);
    }

    return () => {
      updatePosition(tooltipId, null);
    };
  }, [
    blockType,
    context.open,
    context.x,
    context.y,
    context.elements.floating,
    linesContext,
    tooltipId,
  ]);

  const tooltipMotionProps = blockType ? {} : tooltipFadeProps;
  const contentMotionProps = blockType ? blockContentProps : {};

  return (
    <FloatingPortal>
      <AnimatePresence>
        {context.open && (
          <motion.div
            className={cn(
              "tooltip",
              blockType && "block",
              className,
              !blockType &&
                "bg-panel rounded-md border border-[var(--border-color)] px-2 py-0.5 text-xs whitespace-pre text-[var(--body-color)]",
            )}
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
    </FloatingPortal>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
