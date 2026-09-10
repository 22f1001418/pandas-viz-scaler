import { describe, expect, it } from "vitest";
import {
  cloneFrame, colIndex, df, formatCell, hlByGroup, hlCols, hlHeaders,
  hlIndex, hlMerge, hlRows, series, takeCols, takeRows, withColumnGroups, withIndex,
} from "@/lib/dataframe";

describe("df", () => {
  it("transposes columns into row-major data", () => {
    const f = df({ a: [1, 2, 3], b: ["x", "y", "z"] });
    expect(f.data).toEqual([[1, "x"], [2, "y"], [3, "z"]]);
    expect(f.index).toEqual([0, 1, 2]);
    expect(f.columns.map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("infers a dtype per column the way pandas would", () => {
    const f = df({ i: [1, 2], f: [1.5, 2], s: ["a", null], b: [true, false], mixed: [1, "a"] });
    expect(f.columns.map((c) => c.dtype)).toEqual(["int64", "float64", "object", "bool", "object"]);
  });

  it("lets an explicit dtype win over inference", () => {
    expect(df({ a: [1, 2] }, { dtypes: { a: "float64" } }).columns[0].dtype).toBe("float64");
  });

  it("takes a custom index and handles an empty frame", () => {
    expect(df({ a: [1, 2] }, { index: ["x", "y"] }).index).toEqual(["x", "y"]);
    expect(df({})).toEqual({ columns: [], index: [], data: [] });
  });
});

describe("frame helpers", () => {
  const f = df({ a: [1, 2, 3], b: [4, 5, 6] });

  it("clones deeply enough that edits don't leak back", () => {
    const c = cloneFrame(f);
    c.data[0][0] = 99;
    c.columns[0].name = "renamed";
    expect(f.data[0][0]).toBe(1);
    expect(f.columns[0].name).toBe("a");
  });

  it("finds a column and throws by name when it is missing", () => {
    expect(colIndex(f, "b")).toBe(1);
    expect(() => colIndex(f, "nope")).toThrow(/nope/);
  });

  it("takes rows and columns, carrying the index along", () => {
    expect(takeRows(f, [2, 0]).data).toEqual([[3, 6], [1, 4]]);
    expect(takeRows(f, [2, 0]).index).toEqual([2, 0]);
    expect(takeCols(f, ["b"]).data).toEqual([[4], [5], [6]]);
  });

  it("attaches a MultiIndex and spanning column groups", () => {
    const m = withIndex(f, [["A", 1], ["A", 2], ["B", 1]], ["grp", "n"]);
    expect(m.indexNames).toEqual(["grp", "n"]);
    expect(withColumnGroups(f, [{ label: "g", span: 2 }]).columnGroups).toHaveLength(1);
  });
});

describe("formatCell", () => {
  it("renders null as pandas prints it", () => {
    expect(formatCell(null, "float64")).toBe("NaN");
  });

  it("rounds floats to two places and leaves ints alone", () => {
    expect(formatCell(3.14159, "float64")).toBe("3.14");
    expect(formatCell(42, "int64")).toBe("42");
    expect(formatCell(2.5, "int64")).toBe("2.5");
  });

  it("prints booleans Python-style", () => {
    expect(formatCell(true, "bool")).toBe("True");
    expect(formatCell(false, "bool")).toBe("False");
  });
});

describe("series", () => {
  it("is a one-column frame carrying the Series name", () => {
    const s = series("score", [1, 2]);
    expect(s.columns).toHaveLength(1);
    expect(s.columns[0].name).toBe("score");
    expect(series("s", [1], { index: ["a"] }).index).toEqual(["a"]);
    expect(series("s", [1], { dtype: "float64" }).columns[0].dtype).toBe("float64");
  });
});

describe("highlight maps", () => {
  it("addresses rows, columns, headers and index cells", () => {
    expect(hlRows([1], 2, "drop")).toEqual({ "1:0": "drop", "1:1": "drop" });
    expect(hlCols([0], 2)).toEqual({ "0:0": "match", "1:0": "match" });
    expect(hlHeaders([1], "new")).toEqual({ "h:1": "new" });
    expect(hlIndex([0])).toEqual({ "i:0": "match" });
  });

  it("merges with the later map winning", () => {
    expect(hlMerge({ "0:0": "match" }, { "0:0": "drop" })).toEqual({ "0:0": "drop" });
  });

  it("gives each distinct key its own tone, and repeats a key's tone", () => {
    const m = hlByGroup(["a", "b", "a"], 1);
    expect(m["0:0"]).toBe(m["2:0"]);
    expect(m["0:0"]).not.toBe(m["1:0"]);
    expect(m["i:1"]).toBe(m["1:0"]);
  });

  it("cycles back through the five tones on the sixth group", () => {
    const m = hlByGroup(["a", "b", "c", "d", "e", "f"], 1);
    expect(m["5:0"]).toBe(m["0:0"]);
  });
});
