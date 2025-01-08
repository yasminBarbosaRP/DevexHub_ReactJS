import React from "react";
import { render, screen } from "@testing-library/react";
import { getGaugeColor, SonarMetrics } from "./Sonar";
import "@testing-library/jest-dom"; // para garantir boas matchers

describe("getGaugeColor", () => {
  it("should return red for values <= 40", () => {
    expect(getGaugeColor(40)).toBe("red");
    expect(getGaugeColor(30)).toBe("red");
  });

  it("should return orange for values > 40 and <= 70", () => {
    expect(getGaugeColor(50)).toBe("orange");
    expect(getGaugeColor(70)).toBe("orange");
  });

  it("should return green for values > 70", () => {
    expect(getGaugeColor(71)).toBe("green");
    expect(getGaugeColor(100)).toBe("green");
  });
});

describe("LinearGauge", () => {
  it("should render the gauge with the correct value and title", () => {
    render(<SonarMetrics />);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
  });

  it("should render the required coverage if provided", () => {
    render(<SonarMetrics />);
    expect(screen.getByText("Required Coverage: 80%")).toBeInTheDocument();
  });

  it("should apply the correct color based on the value", () => {
    const { getByTestId } = render(<SonarMetrics />);
    const gaugeBar = getByTestId("gauge-bar");
    expect(gaugeBar).toHaveStyle("background-color: green");
  });
});

describe("SonarMetrics", () => {
  it("should render the title", () => {
    render(<SonarMetrics />);
    expect(screen.getByText("Sonar")).toBeInTheDocument();
  });

  it("should render the description", () => {
    render(<SonarMetrics />);
    expect(screen.getByText("Code quality indicator.")).toBeInTheDocument();
  });

  it("should render a Paper component", () => {
    const { container } = render(<SonarMetrics />);
    expect(container.querySelector(".MuiPaper-elevation3")).toBeInTheDocument();
  });
});
