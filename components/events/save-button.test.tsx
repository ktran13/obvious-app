import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SaveButton } from "./save-button";

describe("SaveButton", () => {
  it("renders the idle state and fires onSave", () => {
    const onSave = vi.fn();
    render(<SaveButton state="idle" onSave={onSave} />);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("data-state", "idle");
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("renders the signed-out prompting state and fires onSignInClick", () => {
    const onSignInClick = vi.fn();
    render(
      <SaveButton state="prompting" onSignInClick={onSignInClick} />,
    );

    const button = screen.getByRole("button", { name: "Sign in to save" });
    expect(button).toHaveAttribute("data-state", "prompting");
    fireEvent.click(button);
    expect(onSignInClick).toHaveBeenCalledOnce();
  });

  it("renders the saved state as pressed", () => {
    render(<SaveButton state="saved" />);

    const button = screen.getByRole("button", { name: "Saved" });
    expect(button).toHaveAttribute("data-state", "saved");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
