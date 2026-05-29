import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

// The only element with an inline style is the fill bar.
function barWidth(container: HTMLElement): string {
  const bar = container.querySelector("[style]");
  return (bar as HTMLElement).style.width;
}

describe("ProgressBar", () => {
  it("renders the current / total counter", () => {
    render(<ProgressBar current={3} total={10} />);
    expect(screen.getByText(/3 \/ 10/)).toBeTruthy();
  });

  it("shows a 0% fill at the start", () => {
    const { container } = render(<ProgressBar current={0} total={10} />);
    expect(barWidth(container)).toBe("0%");
  });

  it("shows a 100% fill at completion", () => {
    const { container } = render(<ProgressBar current={10} total={10} />);
    expect(barWidth(container)).toBe("100%");
  });

  it("computes a proportional fill for a partial run", () => {
    const { container } = render(<ProgressBar current={1} total={4} />);
    expect(barWidth(container)).toBe("25%");
  });

  it("rounds a non-integer percentage to the nearest whole percent", () => {
    const oneThird = render(<ProgressBar current={1} total={3} />);
    expect(barWidth(oneThird.container)).toBe("33%");

    const twoThirds = render(<ProgressBar current={2} total={3} />);
    expect(barWidth(twoThirds.container)).toBe("67%");
  });
});
