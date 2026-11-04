import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { GroupedFields, contrastRatio } from "@/pages/AdminCustomizeFields";
import editorSource from "@/pages/AdminCustomize.jsx?raw";

vi.mock("@/lib/themeApi", () => ({ uploadThemeImage: vi.fn() }));

afterEach(cleanup);

// The Theme settings panel's groups and a few of its options (as the schema sends them)
const GROUPS = [
  { id: "colors", label: "Color palette" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
];
const FIELDS = {
  background_color: {
    type: "color",
    label: "Background color",
    default: "#FAF9F6",
    group: "colors",
  },
  text_color: {
    type: "color",
    label: "Text color",
    default: "#1A1916",
    group: "colors",
    contrast: [["text_color"], ["background_color"]],
  },
  heading_color: {
    type: "color_optional",
    label: "Heading colour",
    default: "",
    group: "colors",
    contrast: [["heading_color", "text_color"], ["background_color"]],
    palette: "Text",
  },
  heading_weight: {
    type: "select",
    label: "Heading font weight",
    default: "500",
    group: "typography",
    options: ["400", "500", "700"],
  },
  button_size: {
    type: "select",
    label: "Button size",
    default: "medium",
    group: "buttons",
    options: ["small", "medium", "large"],
    ui: "segmented",
  },
};
const DEFAULTS = Object.fromEntries(Object.entries(FIELDS).map(([k, s]) => [k, s.default]));

function Panel({
  initialOpen = null,
  exclusive = true,
  resetAny = true,
  start = {},
  onChange = () => {},
}) {
  const [values, setValues] = useState({ ...DEFAULTS, ...start });
  return (
    <GroupedFields
      fields={FIELDS}
      values={values}
      groups={GROUPS}
      initialOpen={initialOpen}
      exclusive={exclusive}
      resetAny={resetAny}
      onChange={(key, value) => {
        onChange(key, value);
        setValues((v) => ({ ...v, [key]: value }));
      }}
    />
  );
}

const header = (name) => screen.getByRole("button", { name });
const expanded = () =>
  GROUPS.filter((g) => header(g.label).getAttribute("aria-expanded") === "true").map((g) => g.id);

describe("Theme settings accordion", () => {
  it("starts with every group closed", () => {
    render(<Panel />);
    expect(expanded()).toEqual([]);
    expect(screen.queryByText("Text color")).toBeNull();
  });

  it("keeps only one group open, and a click on the open group closes it", () => {
    render(<Panel />);
    fireEvent.click(header("Color palette"));
    expect(expanded()).toEqual(["colors"]);
    fireEvent.click(header("Typography"));
    expect(expanded()).toEqual(["typography"]);
    expect(screen.queryByText("Text color")).toBeNull();
    fireEvent.click(header("Typography"));
    expect(expanded()).toEqual([]);
  });

  it("opens the group another screen asked for (themeGroup)", () => {
    render(<Panel initialOpen="buttons" />);
    expect(expanded()).toEqual(["buttons"]);
  });

  it("headers are buttons tied to their region, so Enter/Space and Tab work", () => {
    render(<Panel />);
    const button = header("Buttons");
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-controls")).toBe("group-buttons");
    fireEvent.click(button);
    expect(document.getElementById("group-buttons")).not.toBeNull();
  });

  it("section panels (not exclusive) still open several groups", () => {
    render(<Panel exclusive={false} initialOpen="colors" />);
    fireEvent.click(header("Typography"));
    expect(expanded()).toEqual(["colors", "typography"]);
  });
});

describe("HexInput", () => {
  it("changes the colour only when a full #RRGGBB is typed", () => {
    const onChange = vi.fn();
    render(<Panel initialOpen="colors" onChange={onChange} />);
    const box = screen.getByLabelText("Text color hex code");
    expect(box.value).toBe("#1A1916");
    fireEvent.change(box, { target: { value: "#12" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(box.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(box, { target: { value: "#00ff00" } });
    expect(onChange).toHaveBeenCalledWith("text_color", "#00FF00");
    expect(screen.getByLabelText("Text color").value).toBe("#00ff00"); // the picker follows
  });

  it("goes back to the saved value when left half typed", () => {
    render(<Panel initialOpen="colors" />);
    const box = screen.getByLabelText("Text color hex code");
    fireEvent.change(box, { target: { value: "#ab" } });
    fireEvent.blur(box);
    expect(box.value).toBe("#1A1916");
  });
});

describe("contrast warning", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });

  it("warns for low-contrast text and uses the fallback colour for an empty one", () => {
    render(<Panel initialOpen="colors" start={{ text_color: "#EEEEEE" }} />);
    // text_color and heading_color (empty -> falls back to text_color) both warn
    expect(screen.getAllByText(/Low contrast/)).toHaveLength(2);
  });

  it("is quiet for readable colours", () => {
    render(<Panel initialOpen="colors" />);
    expect(screen.queryByText(/Low contrast/)).toBeNull();
  });
});

describe("palette or own colour", () => {
  it("says the colour follows the palette until one is picked, and Use palette goes back", () => {
    const onChange = vi.fn();
    render(<Panel initialOpen="colors" onChange={onChange} />);
    expect(screen.getByTestId("color-source").textContent).toBe("Follows the palette (Text)");
    expect(screen.getByRole("button", { name: "Use palette" }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Heading colour hex code"), {
      target: { value: "#AA0000" },
    });
    expect(screen.getByTestId("color-source").textContent).toBe("Own colour");
    fireEvent.click(screen.getByRole("button", { name: "Use palette" }));
    expect(onChange).toHaveBeenLastCalledWith("heading_color", "");
    expect(screen.getByTestId("color-source").textContent).toBe("Follows the palette (Text)");
  });
});

describe("reset to default", () => {
  it("shows only for changed options and restores the default", () => {
    const onChange = vi.fn();
    render(<Panel initialOpen="buttons" start={{ button_size: "large" }} onChange={onChange} />);
    expect(screen.getAllByRole("button", { name: "Reset to default" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(onChange).toHaveBeenCalledWith("button_size", "medium");
    expect(screen.queryByRole("button", { name: "Reset to default" })).toBeNull();
  });

  it("is not offered in section panels for plain options", () => {
    render(<Panel initialOpen="buttons" resetAny={false} start={{ button_size: "large" }} />);
    expect(screen.queryByRole("button", { name: /Reset to/ })).toBeNull();
  });
});

describe("custom CSS field", () => {
  const CSS_FIELDS = {
    custom_css: { type: "css", label: "Custom CSS", default: "", max: 1500, group: "custom_css" },
  };

  it("is a code box with a character count that never goes past the limit", () => {
    const onChange = vi.fn();
    render(
      <GroupedFields
        fields={CSS_FIELDS}
        values={{ custom_css: ".a{color:red}" }}
        groups={[{ id: "custom_css", label: "Custom CSS" }]}
        initialOpen="custom_css"
        onChange={onChange}
      />
    );
    const box = screen.getByRole("textbox");
    expect(box.getAttribute("maxlength")).toBe("1500");
    expect(box.getAttribute("spellcheck")).toBe("false");
    expect(screen.getByText("13 / 1500")).toBeTruthy();
    fireEvent.change(box, { target: { value: ".b{color:blue}" } });
    expect(onChange).toHaveBeenCalledWith("custom_css", ".b{color:blue}");
  });
});

describe("Discard changes", () => {
  it("goes back to the theme from before the session's first change, as one undoable step", () => {
    expect(editorSource).toContain(
      "if (!sessionStartRef.current) sessionStartRef.current = current;"
    );
    const discard = editorSource.slice(editorSource.indexOf("const discardSession"));
    expect(discard.slice(0, 600)).toContain("window.confirm(");
    expect(discard.slice(0, 600)).toContain("update((d) =>"); // through update(): an undo step, then autosave
    expect(editorSource).toContain("onClick={discardSession}");
  });
});
