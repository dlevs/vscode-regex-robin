import { expect, test } from "vitest";
import { groupByMap } from "./collectionUtils";

test("groupByMap()", () => {
  const regex1 = new RegExp("hello");
  const regex2 = new RegExp("world");
  const collection = [
    { regex: regex1, value: 1 },
    { regex: regex1, value: 2 },
    { regex: regex2, value: 3 },
    { regex: regex1, value: 4 },
    { regex: regex1, value: 5 },
    { regex: regex2, value: 6 },
  ];

  // Grouping by non-primitive (not number or string)
  const grouped = groupByMap(collection, (item) => item.regex);

  expect(grouped.get(regex1)).toMatchObject([
    { regex: regex1, value: 1 },
    { regex: regex1, value: 2 },
    { regex: regex1, value: 4 },
    { regex: regex1, value: 5 },
  ]);
  expect(grouped.get(regex2)).toMatchObject([
    { regex: regex2, value: 3 },
    { regex: regex2, value: 6 },
  ]);
});
