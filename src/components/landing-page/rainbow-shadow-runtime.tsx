"use client";

import { useEffect } from "react";
import { pastelRainbowColors } from "@/lib/pastel-rainbow-colors";

const RAINBOW_BLOCK_SELECTOR =
  ".terminal-panel, .terminal-panel-soft, .terminal-chip, .terminal-button, .terminal-sequence-row";
const SEQUENCE_ROW_SELECTOR = ".terminal-sequence-row";

const TEXT_ELEMENT_TAGS = new Set([
  "P",
  "SPAN",
  "A",
  "LI",
  "LABEL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "SMALL",
  "STRONG",
  "EM",
  "BUTTON",
]);

function createSequentialColorPicker(startIndex: number) {
  if (pastelRainbowColors.length === 0) {
    return () => ({ hex: "#ffffff", rgb: "255 255 255" });
  }

  let currentIndex =
    ((startIndex % pastelRainbowColors.length) + pastelRainbowColors.length) %
    pastelRainbowColors.length;

  return () => {
    const color = pastelRainbowColors[currentIndex];
    currentIndex = (currentIndex + 1) % pastelRainbowColors.length;
    return color;
  };
}

function applyBlockTextColor(block: HTMLElement, textColor: string): void {
  const filter: NodeFilter = {
    acceptNode(node: Node): number {
      if (!(node instanceof HTMLElement)) {
        return NodeFilter.FILTER_SKIP;
      }

      if (node === block) {
        return NodeFilter.FILTER_SKIP;
      }

      if (node.matches(RAINBOW_BLOCK_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  };

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_ELEMENT, filter);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof HTMLElement) {
      const className =
        typeof currentNode.className === "string" ? currentNode.className : "";

      if (
        TEXT_ELEMENT_TAGS.has(currentNode.tagName) ||
        className.includes("font-") ||
        className.includes("text-")
      ) {
        currentNode.style.color = textColor;
      }
    }

    currentNode = walker.nextNode();
  }
}

function applyRainbowColor(
  block: HTMLElement,
  getNextColor: () => { hex: string; rgb: string },
  force = false,
): void {
  if (!force && block.dataset.rainbowized === "1") {
    return;
  }

  const color = getNextColor();

  block.dataset.rainbowized = "1";
  block.style.setProperty("--terminal-rainbow-color", color.hex);
  block.style.setProperty("--terminal-rainbow-rgb", color.rgb);
  block.style.color = color.hex;

  applyBlockTextColor(block, color.hex);
}

function applyRainbowToTree(
  root: ParentNode,
  getNextColor: () => { hex: string; rgb: string },
): void {
  root.querySelectorAll<HTMLElement>(RAINBOW_BLOCK_SELECTOR).forEach((block) => {
    const forceColorize = block.matches(SEQUENCE_ROW_SELECTOR);
    applyRainbowColor(block, getNextColor, forceColorize);
  });
}

export function RainbowShadowRuntime() {
  useEffect(() => {
    const startIndex = Math.floor(Math.random() * pastelRainbowColors.length);
    const getNextColor = createSequentialColorPicker(startIndex);

    applyRainbowToTree(document, getNextColor);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches(RAINBOW_BLOCK_SELECTOR)) {
            const forceColorize = node.matches(SEQUENCE_ROW_SELECTOR);
            applyRainbowColor(node, getNextColor, forceColorize);
          }

          node
            .querySelectorAll<HTMLElement>(RAINBOW_BLOCK_SELECTOR)
            .forEach((block) => {
              const forceColorize = block.matches(SEQUENCE_ROW_SELECTOR);
              applyRainbowColor(block, getNextColor, forceColorize);
            });
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
