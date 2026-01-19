"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { AnimatePresence, motion } from "motion/react";

type Position = { x: number; y: number; width: number; height: number };

const TooltipLinesContext = React.createContext<{
  setPosition: (position: Position | null) => void;
}>({ setPosition: () => {} });

const TooltipProvider = ({
  delay = 0,
  closeDelay = 0,
  children,
  ...props
}: TooltipPrimitive.Provider.Props) => {
  const [position, setPosition] = React.useState<Position | null>(null);

  return (
    <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} {...props}>
      <TooltipLinesContext.Provider value={{ setPosition }}>
        {children}
        <TooltipLines position={position} />
      </TooltipLinesContext.Provider>
    </TooltipPrimitive.Provider>
  );
}

const TooltipOpenContext = React.createContext<boolean>(false);

const Tooltip = ({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  ...props
}: TooltipPrimitive.Root.Props) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <TooltipOpenContext.Provider value={open}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
        {children}
      </TooltipPrimitive.Root>
    </TooltipOpenContext.Provider>
  );
}

const TooltipTrigger = ({ ...props }: TooltipPrimitive.Trigger.Props) => {
  return <TooltipPrimitive.Trigger {...props} />;
}

const TooltipContent = ({
  className,
  side = "top",
  sideOffset = 5,
  align = "center",
  alignOffset = 0,
  type = "default",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    type?: "default" | "block";
  }) => {
  const open = React.useContext(TooltipOpenContext);
  const { setPosition } = React.useContext(TooltipLinesContext);
  const blockType = type === "block";

  // Clear position when tooltip closes
  React.useEffect(() => {
    if (!open && blockType) {
      setPosition(null);
    }
  }, [open, blockType, setPosition]);

  // Callback ref to measure popup position when mounted
  const popupRefCallback = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !blockType) return;
      // Wait for positioning to complete
      requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        setPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      });
    },
    [blockType, setPosition],
  );

  const tooltipMotionProps = blockType
    ? { animate: { opacity: 0.9999 }, exit: { opacity: 0 } }
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
    <AnimatePresence>
      {open && (
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            collisionPadding={5}
          >
            <TooltipPrimitive.Popup
              render={
                <motion.div
                  ref={popupRefCallback}
                  className={`tooltip ${blockType ? "block" : ""} ${className ?? ""} ${!blockType ? "bg-panel rounded-md border border-[var(--border-color)] px-2 py-0.5 text-xs whitespace-pre text-[var(--body-color)]" : ""}`}
                  {...tooltipMotionProps}
                />
              }
              {...props}
            >
              {blockType && <TooltipBlocks />}
              <motion.div className="content" {...contentMotionProps}>
                {children}
              </motion.div>
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

const easeInOutQuint = (x: number) =>
  x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;

const TooltipLines = ({ position }: { position: Position | null }) => {
  const lastPosition = React.useRef<Position>({ x: 0, y: 0, width: 0, height: 0 });
  if (position) lastPosition.current = position;
  const pos = position ?? lastPosition.current;

  return (
    <AnimatePresence>
      {position && (
        <>
          {/* Top line */}
          <motion.div
            className="tooltip-line tooltip-line-h"
            style={{ position: "fixed", left: 0, width: "100dvw", zIndex: 9999 }}
            initial={{ opacity: 0, top: -1 }}
            animate={{ opacity: 1, top: pos.y }}
            exit={{ opacity: 0, top: -1 }}
            transition={{ ease: easeInOutQuint, duration: 1 }}
          />
          {/* Bottom line */}
          <motion.div
            className="tooltip-line tooltip-line-h"
            style={{ position: "fixed", left: 0, width: "100dvw", zIndex: 9999 }}
            initial={{ opacity: 0, top: "100dvh" }}
            animate={{ opacity: 1, top: pos.y + pos.height }}
            exit={{ opacity: 0, top: "100dvh" }}
            transition={{ ease: easeInOutQuint, duration: 1 }}
          />
          {/* Left line */}
          <motion.div
            className="tooltip-line tooltip-line-v"
            style={{ position: "fixed", top: 0, height: "100dvh", zIndex: 9999 }}
            initial={{ opacity: 0, left: -1 }}
            animate={{ opacity: 1, left: pos.x }}
            exit={{ opacity: 0, left: -1 }}
            transition={{ ease: easeInOutQuint, duration: 1 }}
          />
          {/* Right line */}
          <motion.div
            className="tooltip-line tooltip-line-v"
            style={{ position: "fixed", top: 0, height: "100dvh", zIndex: 9999 }}
            initial={{ opacity: 0, left: "100dvw" }}
            animate={{ opacity: 1, left: pos.x + pos.width }}
            exit={{ opacity: 0, left: "100dvw" }}
            transition={{ ease: easeInOutQuint, duration: 1 }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

const cols = 11;
const rows = 8;
const duration = 0.07;
const baseDelay = duration / 2;
const blocks = Array.from({ length: cols * rows }, (_, i) => i);
const calculateDelay = (n: number) =>
  baseDelay * Math.floor(n / cols) + baseDelay * (n % cols);
const totalDelay = calculateDelay(cols * rows);

const TooltipBlocks = () => {
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
          transition={{ duration, delay: calculateDelay(i) }}
        />
      ))}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
