import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MutationMetrics, CoverageMetrics } from "./Mutation";
import { CustomLinearGauge, MetricCard } from "./Mutation";

describe("CustomLinearGauge", () => {
  it("renders the gauge with the correct percentage", () => {
    render(<CustomLinearGauge value={55} label="Test Coverage" />);
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("applies the correct color based on the value", () => {
    const { getByTestId, rerender } = render(<CustomLinearGauge value={30} label="Test" />);
    const gaugeBar = getByTestId("gauge-bar");
    expect(gaugeBar).toHaveStyle("background-color: red");

    rerender(<CustomLinearGauge value={65} label="Test" />);
    expect(gaugeBar).toHaveStyle("background-color: orange");

    rerender(<CustomLinearGauge value={85} label="Test" />);
    expect(gaugeBar).toHaveStyle("background-color: green");
  });

  it("renders the correct width for the gauge bar", () => {
    const { getByTestId } = render(<CustomLinearGauge value={70} label="Test" />);
    const gaugeBar = getByTestId("gauge-bar");
    expect(gaugeBar).toHaveStyle("width: 70%");
  });
});

describe("MetricCard", () => {
  it("renders the component with the correct title and description", () => {
    render(
      <MetricCard
        title="Coverage"
        description="Code coverage indicator."
        value={85}
        label="Code Coverage"
      />
    );
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Code coverage indicator.")).toBeInTheDocument();
  });

  it("contains the CustomLinearGauge component with the correct value and label", () => {
    render(
      <MetricCard
        title="Coverage"
        description="Code coverage indicator."
        value={85}
        label="Code Coverage"
      />
    );
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Code Coverage")).toBeInTheDocument();
  });
});

describe("MutationMetrics", () => {
  it("renders the MutationMetrics component with correct title and description", () => {
    render(<MutationMetrics />);
    expect(screen.getByText("Mutation")).toBeInTheDocument();
    expect(screen.getByText("Unit test quality indicator.")).toBeInTheDocument();
  });

  it("contains the CustomLinearGauge component with the correct value", () => {
    render(<MutationMetrics />);
    expect(screen.getByText("55%")).toBeInTheDocument();
  });
});

describe("CoverageMetrics", () => {
  it("renders the CoverageMetrics component with correct title and description", () => {
    render(<CoverageMetrics />);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Overall code coverage indicator.")).toBeInTheDocument();
  });

  it("contains the CustomLinearGauge component with the correct value", () => {
    render(<CoverageMetrics />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
