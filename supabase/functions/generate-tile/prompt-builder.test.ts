import { assert, assertStringIncludes } from "jsr:@std/assert";
import { buildAccentPrompt, buildRepeatPrompt } from "./prompt-builder.ts";

Deno.test("H + yarn_dyed: 모티프/배경/원단블록/seamless 포함", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "H",
      variation: null,
      motifs: [{ name: "anchor", color: null, colors: null }],
      backgroundColor: "navy blue",
    },
    "yarn_dyed",
  );
  assertStringIncludes(prompt, "anchor");
  assertStringIncludes(prompt, "navy blue");
  assertStringIncludes(prompt, "yarn-dyed");
  assertStringIncludes(prompt, "tile seamlessly");
  assertStringIncludes(prompt, "45%");
});

Deno.test("F + printed: 모티프 2개 배치 명시", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "F",
      variation: null,
      motifs: [{ name: "cherry", color: null, colors: null }],
      backgroundColor: "white",
    },
    "printed",
  );
  assertStringIncludes(prompt, "2 identical cherry");
  assertStringIncludes(prompt, "upper-left quadrant");
  assertStringIncludes(prompt, "lower-right quadrant");
  assertStringIncludes(prompt, "tile seamlessly");
});

Deno.test("Q-color: 두 색상 치환", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "color",
      motifs: [{ name: "star", color: null, colors: ["gold", "silver"] }],
      backgroundColor: "black",
    },
    "printed",
  );
  assertStringIncludes(prompt, "gold");
  assertStringIncludes(prompt, "silver");
});

Deno.test("Q-color: 색상 분석이 누락되어도 placeholder를 남기지 않는다", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "color",
      motifs: [{ name: "star", color: null, colors: null }],
      backgroundColor: "black",
    },
    "printed",
  );

  assert(!prompt.includes("{COLOR_A}"));
  assert(!prompt.includes("{COLOR_B}"));
});

Deno.test("Q-different_motif: 두 모티프 치환", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "different_motif",
      motifs: [
        { name: "anchor", color: null, colors: null },
        { name: "wheel", color: null, colors: null },
      ],
      backgroundColor: "white",
    },
    "printed",
  );
  assertStringIncludes(prompt, "anchor");
  assertStringIncludes(prompt, "wheel");
});

Deno.test(
  "Q: variation이 누락되어도 different motif placeholder를 남기지 않는다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "Q",
        variation: null,
        motifs: [{ name: "anchor", color: null, colors: null }],
        backgroundColor: "white",
      },
      "printed",
    );

    assert(!prompt.includes("{MOTIF_A}"));
    assert(!prompt.includes("{MOTIF_B}"));
  },
);

Deno.test("accent text: seamless suffix 없음, 오브젝트 설명 포함", () => {
  const { prompt } = buildAccentPrompt(
    {
      objectDescription: "a gold anchor",
      objectSource: "text",
      color: null,
      size: "medium",
    },
    "navy blue",
    "yarn_dyed",
    null,
  );
  assertStringIncludes(prompt, "a gold anchor");
  assertStringIncludes(prompt, "navy blue");
  assert(
    !prompt.includes("tile seamlessly"),
    "seamless suffix must not appear in accent",
  );
  assertStringIncludes(prompt, "45%");
});

Deno.test("accent image: referenceImageUrl 전달", () => {
  const { referenceImageUrl } = buildAccentPrompt(
    {
      objectDescription: "the attached logo",
      objectSource: "image",
      color: null,
      size: "large",
    },
    "white",
    "printed",
    "https://example.com/logo.png",
  );
  assertStringIncludes(referenceImageUrl ?? "", "example.com");
});

Deno.test("accent small size -> 30%", () => {
  const { prompt } = buildAccentPrompt(
    {
      objectDescription: "dot",
      objectSource: "text",
      color: null,
      size: "small",
    },
    "red",
    "printed",
    null,
  );
  assertStringIncludes(prompt, "30%");
});
