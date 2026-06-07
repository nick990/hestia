"use client";

import { select } from "d3-selection";
import "d3-transition";
import {
  zoom as d3Zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  computeFitTransform,
  SANKEY_ZOOM_IN_FACTOR,
  SANKEY_ZOOM_MAX,
  SANKEY_ZOOM_MIN,
  SANKEY_ZOOM_OUT_FACTOR,
  type SankeyZoomTransform,
} from "@/lib/cashflow/sankey-zoom";
import { cn } from "@/lib/utils";

type SankeyZoomViewportProps = {
  contentWidth: number;
  contentHeight: number;
  contentKey: string;
  /** When set, auto-fit runs only when this key changes (not on spacing tweaks). */
  fitKey?: string;
  children: ReactNode;
  className?: string;
  toolbarExtra?: ReactNode;
};

function toZoomIdentity(transform: SankeyZoomTransform): ZoomTransform {
  return zoomIdentity.translate(transform.x, transform.y).scale(transform.k);
}

function readFitTransform(
  container: HTMLDivElement,
  contentWidth: number,
  contentHeight: number,
): SankeyZoomTransform | null {
  const { width, height } = container.getBoundingClientRect();
  if (width <= 0 || height <= 0) {
    return null;
  }
  return computeFitTransform(width, height, contentWidth, contentHeight);
}

export function SankeyZoomViewport({
  contentWidth,
  contentHeight,
  contentKey,
  fitKey,
  children,
  className,
  toolbarExtra,
}: SankeyZoomViewportProps) {
  const autoFitKey = fitKey ?? contentKey;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fittedContentKeyRef = useRef<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = zoomLayerRef.current;
    if (!svg || !layer) {
      return;
    }

    const zoom = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([SANKEY_ZOOM_MIN, SANKEY_ZOOM_MAX])
      .on("zoom", (event) => {
        layer.setAttribute("transform", event.transform.toString());
        setScale(event.transform.k);
      });

    const selection = select(svg);
    selection.call(zoom);
    selection.on("wheel", (event) => event.preventDefault());
    zoomRef.current = zoom;

    return () => {
      selection.on(".zoom", null);
      selection.on("wheel", null);
      zoomRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (fittedContentKeyRef.current === autoFitKey) {
      return;
    }

    const svg = svgRef.current;
    const zoom = zoomRef.current;
    const container = containerRef.current;
    if (!svg || !zoom || !container) {
      return;
    }

    const applyFit = () => {
      const fit = readFitTransform(container, contentWidth, contentHeight);
      if (!fit) {
        return false;
      }
      select(svg).call(zoom.transform, toZoomIdentity(fit));
      fittedContentKeyRef.current = autoFitKey;
      return true;
    };

    if (applyFit()) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (fittedContentKeyRef.current === autoFitKey) {
        return;
      }
      if (applyFit()) {
        observer.disconnect();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoFitKey, contentWidth, contentHeight]);

  function handleZoomIn() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || scale >= SANKEY_ZOOM_MAX) {
      return;
    }
    select(svg)
      .transition()
      .duration(200)
      .call(zoom.scaleBy, SANKEY_ZOOM_IN_FACTOR);
  }

  function handleZoomOut() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || scale <= SANKEY_ZOOM_MIN) {
      return;
    }
    select(svg)
      .transition()
      .duration(200)
      .call(zoom.scaleBy, SANKEY_ZOOM_OUT_FACTOR);
  }

  function handleFit() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    const container = containerRef.current;
    if (!svg || !zoom || !container) {
      return;
    }
    const fit = readFitTransform(container, contentWidth, contentHeight);
    if (!fit) {
      return;
    }
    fittedContentKeyRef.current = autoFitKey;
    select(svg)
      .transition()
      .duration(300)
      .call(zoom.transform, toZoomIdentity(fit));
  }

  const canZoomIn = scale < SANKEY_ZOOM_MAX - 0.001;
  const canZoomOut = scale > SANKEY_ZOOM_MIN + 0.001;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-md border bg-card",
        "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Controlli zoom grafico"
        className="absolute top-2 right-2 z-10 flex items-center gap-1"
      >
        {toolbarExtra ? (
          <>
            {toolbarExtra}
            <div className="mx-0.5 h-6 w-px bg-border" aria-hidden />
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Zoom avanti"
          disabled={!canZoomIn}
          onClick={handleZoomIn}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Zoom indietro"
          disabled={!canZoomOut}
          onClick={handleZoomOut}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Adatta al viewport"
          onClick={handleFit}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <svg ref={svgRef} width="100%" height="100%" className="block h-full w-full">
        <g ref={zoomLayerRef}>{children}</g>
      </svg>
    </div>
  );
}
